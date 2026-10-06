package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.error.KlokkaException.notFound;
import static com.prasannjeet.klokka.error.KlokkaException.validation;
import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.auth.WorkspaceAccess;
import com.prasannjeet.klokka.contract.model.Entry;
import com.prasannjeet.klokka.contract.model.JobChangeScope;
import com.prasannjeet.klokka.contract.model.JobRecurrencePreview;
import com.prasannjeet.klokka.contract.model.JobRecurrencePreviewRequest;
import com.prasannjeet.klokka.contract.model.JobWrite;
import com.prasannjeet.klokka.contract.model.Weekday;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.HourEntryEntity;
import com.prasannjeet.klokka.persistence.JobEntity;
import com.prasannjeet.klokka.persistence.JobRecurrenceEntity;
import com.prasannjeet.klokka.persistence.JobRecurrenceRepository;
import com.prasannjeet.klokka.persistence.JobRepository;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;

// The jobs of a day (CHQ-156). Every write goes through EntryWriter, which keeps the day's entry the sum of its jobs.
@ApplicationScoped
public class JobService {

    @Inject
    WorkspaceAccess access;

    @Inject
    EntryWriter writer;

    @Inject
    EntryService entryService;

    @Inject
    EntryRepository entries;

    @Inject
    JobRepository jobs;

    @Inject
    JobRecurrenceDates recurrenceDates;

    @Inject
    JobRecurrenceRepository recurrences;

    @Inject
    MembershipRepository memberships;

    @Inject
    Clock clock;

    @Transactional
    public JobRecurrencePreview preview(UUID workspaceId, JobRecurrencePreviewRequest body) {
        access.employer(workspaceId);
        return recurrenceDates.calculate(body.getFirstDate(), body.getRecurrence()).preview();
    }

    @Transactional
    public Entry create(UUID workspaceId, UUID membershipId, LocalDate date, JobWrite body) {
        Access a = access.employer(workspaceId);
        MembershipEntity target = access.target(a, membershipId);
        if (body.getRecurrence() != null) return createSeries(a, target, date, body);
        if (body.getRequestId() != null) throw validation("requestId", "only accepted with recurrence");
        EntryWriter.Outcome outcome = writer.createJob(a, target, date, input(a, body));
        return entryService.view(a, outcome.entry(), target);
    }

    @Transactional
    public Entry update(UUID workspaceId, UUID jobId, JobWrite body, JobChangeScope scope) {
        Access a = access.employer(workspaceId);
        JobEntity job = jobs.findJob(a.workspaceId(), jobId).orElseThrow(() -> notFound("Job " + jobId));
        HourEntryEntity entry = liveEntry(a, job);
        MembershipEntity target = access.target(a, entry.membershipId);
        if (body.getRecurrence() != null || body.getRequestId() != null) throw validation("recurrence", "creation only");
        EntryWriter.JobInput values = input(a, body);
        for (JobEntity occurrence : affected(a, job, entry, scope)) {
            writer.updateJob(a, target, liveEntry(a, occurrence), occurrence, values);
        }
        return entryService.view(a, entry, target);
    }

    @Transactional
    public void delete(UUID workspaceId, UUID jobId, JobChangeScope scope) {
        Access a = access.employer(workspaceId);
        JobEntity job = jobs.findJob(a.workspaceId(), jobId).orElseThrow(() -> notFound("Job " + jobId));
        HourEntryEntity entry = liveEntry(a, job);
        MembershipEntity target = access.target(a, entry.membershipId);
        List<JobEntity> affected = affected(a, job, entry, scope);
        if (scope == JobChangeScope.THIS_AND_FUTURE) recurrences.lockSeries(a.workspaceId(), job.recurrenceId).stopped = true;
        for (JobEntity occurrence : affected) writer.deleteJob(a, target, liveEntry(a, occurrence), occurrence);
    }

    private Entry createSeries(Access a, MembershipEntity target, LocalDate first, JobWrite body) {
        if (body.getRequestId() == null) throw validation("requestId", "required for recurring jobs");
        // Canonical weekday order (Monday first) keeps the request hash independent of the JSON array's order.
        if (body.getRecurrence().getWeekdays() != null) {
            body.getRecurrence().weekdays(body.getRecurrence().getWeekdays().stream()
                    .sorted(Comparator.nullsFirst(Comparator.<Weekday>naturalOrder()))
                    .collect(Collectors.toCollection(LinkedHashSet::new)));
        }
        String requestHash = JobRequestHash.of(body);
        // Serialize retries for this employee before checking the caller's idempotency key.
        memberships.lockMember(a.workspaceId(), target.id);
        JobRecurrenceEntity existing = recurrences.findRequest(a.workspaceId(), body.getRequestId()).orElse(null);
        if (existing != null) {
            // A series from before V5 has no hash: its replay is refused rather than guessed to match.
            if (!existing.membershipId.equals(target.id) || !existing.firstDate.equals(first)
                    || !requestHash.equals(existing.requestHash)) throw validation("requestId", "already used for a different request");
            HourEntryEntity entry = entries.findEntry(a.workspaceId(), existing.firstEntryId).orElseThrow(() -> notFound("Original entry"));
            return entryService.view(a, entry, target);
        }
        if (first.isBefore(today(a))) throw validation("date", "recurring jobs must start today or later");
        JobRecurrenceDates.Schedule schedule = recurrenceDates.calculate(first, body.getRecurrence());
        EntryWriter.JobInput values = input(a, body);
        // A later error rolls back the entire transaction, including history and notifications.
        JobRecurrenceEntity series = new JobRecurrenceEntity();
        series.id = UUID.randomUUID();
        series.requestId = body.getRequestId();
        series.workspaceId = a.workspaceId().value();
        series.membershipId = target.id;
        series.firstDate = first;
        series.endDate = schedule.endDate();
        series.frequency = body.getRecurrence().getFrequency();
        series.interval = body.getRecurrence().getInterval();
        series.weekdays = body.getRecurrence().getWeekdays() == null || body.getRecurrence().getWeekdays().isEmpty()
                ? EnumSet.noneOf(Weekday.class) : EnumSet.copyOf(body.getRecurrence().getWeekdays());
        series.lastDayOfMonth = Boolean.TRUE.equals(body.getRecurrence().getLastDayOfMonth());
        series.periodCount = body.getRecurrence().getPeriodCount();
        series.occurrenceCount = schedule.dates().size();
        series.lastDate = schedule.dates().getLast();
        series.requestHash = requestHash;
        series.createdBy = a.userId();
        series.createdAt = clock.instant();
        recurrences.persistSeries(a.workspaceId(), series);
        HourEntryEntity firstEntry = writer.createSeriesJobs(a, target, schedule.dates(), values, series);
        series.firstEntryId = firstEntry.id;
        return entryService.view(a, firstEntry, target);
    }

    private List<JobEntity> affected(Access a, JobEntity job, HourEntryEntity entry, JobChangeScope scope) {
        if (job.recurrenceId != null) recurrences.lockSeries(a.workspaceId(), job.recurrenceId);
        if (scope != JobChangeScope.THIS_AND_FUTURE) return List.of(job);
        if (job.recurrenceId == null) throw validation("scope", "this job is not recurring");
        if (entry.workDate.isBefore(today(a))) throw validation("scope", "past jobs may only be changed individually");
        return jobs.seriesFrom(a.workspaceId(), job.recurrenceId, entry.workDate);
    }

    private LocalDate today(Access a) {
        return LocalDate.ofInstant(clock.instant(), ZoneId.of(a.workspace().timezone));
    }

    private HourEntryEntity liveEntry(Access a, JobEntity job) {
        return entries.findEntry(a.workspaceId(), job.entryId).filter(e -> e.deletedAt == null)
                .orElseThrow(() -> notFound("Job " + job.id));
    }

    private static EntryWriter.JobInput input(Access a, JobWrite body) {
        BigDecimal hours = HoursRounding.apply(body.getHours(), a.workspace().rounding, "hours");
        if (hours.signum() == 0) throw validation("hours", "rounds to 0 under the workspace rule");
        LocalTime start = body.getStartTime() == null ? null : LocalTime.parse(body.getStartTime());
        return new EntryWriter.JobInput(hours, start, body.getNote(), body.getLocation());
    }

}
