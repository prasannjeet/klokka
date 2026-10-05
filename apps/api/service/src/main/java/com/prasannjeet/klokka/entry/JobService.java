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
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Comparator;
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
        if (scope == JobChangeScope.THIS_AND_FUTURE && job.recurrence != null) {
            job.recurrence.stopped = true;
        }
        for (JobEntity occurrence : affected) writer.deleteJob(a, target, liveEntry(a, occurrence), occurrence);
    }

    private Entry createSeries(Access a, MembershipEntity target, LocalDate first, JobWrite body) {
        if (body.getRequestId() == null) throw validation("requestId", "required for recurring jobs");
        // Canonical weekday order keeps retry keys valid across process restarts and JSON array order.
        if (body.getRecurrence().getWeekdays() != null) {
            body.getRecurrence().weekdays(body.getRecurrence().getWeekdays().stream()
                    .sorted(Comparator.nullsFirst(Comparator.comparing(Weekday::toString)))
                    .collect(Collectors.toCollection(LinkedHashSet::new)));
        }
        // Serialize retries for this employee before checking the caller's idempotency key.
        memberships.lockMember(a.workspaceId(), target.id);
        JobRecurrenceEntity existing = recurrences.findRequest(a.workspaceId(), body.getRequestId()).orElse(null);
        if (existing != null) {
            if (!existing.membershipId.equals(target.id) || !existing.firstDate.equals(first)
                    || !existing.requestPayload.equals(body.toString())) throw validation("requestId", "already used for a different request");
            HourEntryEntity entry = entries.findEntry(a.workspaceId(), existing.firstEntryId).orElseThrow(() -> notFound("Original entry"));
            return entryService.view(a, entry, target);
        }
        if (first.isBefore(today(a))) throw validation("date", "recurring jobs must start today or later");
        JobRecurrenceDates.Schedule schedule = recurrenceDates.calculate(first, body.getRecurrence());
        EntryWriter.JobInput values = input(a, body);
        // A later error rolls back the entire transaction, including history and notifications.
        writer.requireWritable(target);
        for (LocalDate date : schedule.dates()) writer.requireUnlocked(a, YearMonth.from(date));
        JobRecurrenceEntity series = new JobRecurrenceEntity();
        series.id = UUID.randomUUID();
        series.requestId = body.getRequestId();
        series.workspaceId = a.workspaceId().value();
        series.membershipId = target.id;
        series.firstDate = first;
        series.endDate = schedule.endDate();
        series.frequency = body.getRecurrence().getFrequency().toString();
        series.interval = body.getRecurrence().getInterval();
        series.weekdays = body.getRecurrence().getWeekdays() == null || body.getRecurrence().getWeekdays().isEmpty() ? null
                : body.getRecurrence().getWeekdays().stream().map(Object::toString).collect(Collectors.joining(","));
        series.lastDayOfMonth = Boolean.TRUE.equals(body.getRecurrence().getLastDayOfMonth());
        series.periodCount = body.getRecurrence().getPeriodCount();
        series.occurrenceCount = schedule.dates().size();
        series.lastDate = schedule.dates().getLast();
        series.requestPayload = body.toString();
        series.createdBy = a.userId();
        series.createdAt = clock.instant();
        recurrences.persistSeries(a.workspaceId(), series);
        HourEntryEntity firstEntry = null;
        for (LocalDate date : schedule.dates()) {
            EntryWriter.Outcome saved = writer.createJob(a, target, date, values, series);
            if (firstEntry == null) { firstEntry = saved.entry(); series.firstEntryId = firstEntry.id; }
        }
        return entryService.view(a, firstEntry, target);
    }

    private List<JobEntity> affected(Access a, JobEntity job, HourEntryEntity entry, JobChangeScope scope) {
        if (job.recurrence != null) recurrences.lockSeries(a.workspaceId(), job.recurrence.id);
        if (scope != JobChangeScope.THIS_AND_FUTURE) return List.of(job);
        if (job.recurrence == null) throw validation("scope", "this job is not recurring");
        if (entry.workDate.isBefore(today(a))) throw validation("scope", "past jobs may only be changed individually");
        return jobs.seriesFrom(a.workspaceId(), job.recurrence.id, entry.workDate);
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
