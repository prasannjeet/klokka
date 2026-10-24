package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.contract.model.JobChangeScope.ALL;
import static com.prasannjeet.klokka.contract.model.JobChangeScope.ONLY_THIS;
import static com.prasannjeet.klokka.contract.model.JobChangeScope.THIS_AND_FUTURE;
import static com.prasannjeet.klokka.error.KlokkaException.notFound;
import static com.prasannjeet.klokka.error.KlokkaException.validation;
import static com.prasannjeet.klokka.error.ProblemCode.CONFLICT;
import static com.prasannjeet.klokka.error.ProblemCode.MONTH_LOCKED;
import static java.util.stream.Collectors.toSet;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.auth.WorkspaceAccess;
import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.Entry;
import com.prasannjeet.klokka.contract.model.JobChangeScope;
import com.prasannjeet.klokka.contract.model.JobLocation;
import com.prasannjeet.klokka.contract.model.JobRecurrencePreview;
import com.prasannjeet.klokka.contract.model.JobRecurrencePreviewRequest;
import com.prasannjeet.klokka.contract.model.JobScopeCount;
import com.prasannjeet.klokka.contract.model.JobScopeCounts;
import com.prasannjeet.klokka.contract.model.JobWrite;
import com.prasannjeet.klokka.contract.model.Weekday;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.HourEntryEntity;
import com.prasannjeet.klokka.persistence.JobEntity;
import com.prasannjeet.klokka.persistence.JobRecurrenceEntity;
import com.prasannjeet.klokka.persistence.JobRecurrenceRepository;
import com.prasannjeet.klokka.persistence.JobRepository;
import com.prasannjeet.klokka.persistence.JobRepository.SeriesJob;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import com.prasannjeet.klokka.persistence.MonthLockRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayDeque;
import java.util.Comparator;
import java.util.Deque;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

// The jobs of a day (CHQ-156). Every write goes through EntryWriter, which keeps the day's entry the sum of its jobs.
// A series job is changed or removed by scope (CHQ-187): ONLY_THIS, THIS_AND_FUTURE (from the selected job on, past
// or not) or ALL (the whole series); range scopes skip and count jobs in closed months. A schedule change splits a
// series into parts (previous_id points back); the range scopes reach across them.
@ApplicationScoped
public class JobService {

    // The jobs a scope reaches, the ones left out because their month is closed, and the parts of the job's series
    // the scope covers, first to current (empty for a job that is not recurring).
    private record Scoped(List<JobRecurrenceEntity> parts, List<SeriesJob> writable, int skippedClosed) {
        JobRecurrenceEntity current() {
            return parts.getLast();
        }
    }

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
    MonthLockRepository locks;

    @Inject
    KlokkaConfig config;

    @Inject
    Clock clock;

    @Transactional
    public JobRecurrencePreview preview(UUID workspaceId, JobRecurrencePreviewRequest body) {
        Access a = access.employer(workspaceId);
        // A schedule change previews from where it starts, with the interval counted from the selected job's date.
        LocalDate from = body.getFromDate() == null ? body.getFirstDate() : body.getFromDate();
        return recurrenceDates.calculate(body.getFirstDate(), from, body.getRecurrence(), today(a)).preview();
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
        if (body.getRecurrence() != null) return changeSchedule(a, jobId, body, scope);
        if (body.getRequestId() != null) throw validation("requestId", "only accepted with recurrence");
        JobEntity job = findJob(a, jobId);
        HourEntryEntity entry = liveEntry(a, job);
        MembershipEntity target = access.target(a, entry.membershipId);
        EntryWriter.JobInput values = input(a, body);
        Scoped scoped = scoped(a, job, entry, scope);
        for (SeriesJob each : scoped.writable()) writer.updateJob(a, target, liveEntry(a, each.job()), each.job(), values);
        // A range reaches the series' last planned job, so its values are the ones later jobs are planned with; the
        // earlier parts of a split series plan nothing any more.
        if (scope != ONLY_THIS) setTemplate(scoped.current(), values);
        return entryService.view(a, entry, target);
    }

    @Transactional
    public void delete(UUID workspaceId, UUID jobId, JobChangeScope scope) {
        Access a = access.employer(workspaceId);
        JobEntity job = findJob(a, jobId);
        HourEntryEntity entry = liveEntry(a, job);
        MembershipEntity target = access.target(a, entry.membershipId);
        Scoped scoped = scoped(a, job, entry, scope);
        for (SeriesJob each : scoped.writable()) writer.deleteJob(a, target, liveEntry(a, each.job()), each.job());
        if (scope != ONLY_THIS) {
            for (JobRecurrenceEntity part : scoped.parts()) {
                part.stopped = true;
                recount(a, part);
            }
        }
    }

    // What each scope would change from this job, without writing (and without locking the series).
    @Transactional
    public JobScopeCounts scopeCounts(UUID workspaceId, UUID jobId) {
        Access a = access.employer(workspaceId);
        JobEntity job = findJob(a, jobId);
        HourEntryEntity entry = liveEntry(a, job);
        JobScopeCount onlyThis = count(select(a, List.of(), job, entry, ONLY_THIS));
        if (job.recurrenceId == null) return new JobScopeCounts().onlyThis(onlyThis).thisAndFuture(onlyThis).all(onlyThis);
        return new JobScopeCounts().onlyThis(onlyThis)
                .thisAndFuture(count(select(a, parts(a, job.recurrenceId, THIS_AND_FUTURE, false), job, entry, THIS_AND_FUTURE)))
                .all(count(select(a, parts(a, job.recurrenceId, ALL, false), job, entry, ALL)));
    }

    private Entry createSeries(Access a, MembershipEntity target, LocalDate first, JobWrite body) {
        if (body.getRequestId() == null) throw validation("requestId", "required for recurring jobs");
        canonicalWeekdays(body);
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
        JobRecurrenceDates.Schedule schedule = recurrenceDates.calculate(first, body.getRecurrence(), today(a));
        EntryWriter.JobInput values = input(a, body);
        // A later error rolls back the entire transaction, including history and notifications.
        JobRecurrenceEntity series = new JobRecurrenceEntity();
        series.id = UUID.randomUUID();
        series.requestId = body.getRequestId();
        series.workspaceId = a.workspaceId().value();
        series.membershipId = target.id;
        schedule.pattern().applyTo(series);
        series.endDate = schedule.endDate();
        series.openEnded = schedule.openEnded();
        series.periodCount = body.getRecurrence().getPeriodCount();
        series.occurrenceCount = schedule.dates().size();
        series.lastDate = schedule.dates().getLast();
        setTemplate(series, values);
        series.requestHash = requestHash;
        series.createdBy = a.userId();
        series.createdAt = clock.instant();
        recurrences.persistSeries(a.workspaceId(), series);
        EntryWriter.SeriesWrite written = writer.createSeriesJobs(a, target, schedule.dates(), values, series,
                EntryWriter.SeriesOptions.CREATE);
        series.firstEntryId = written.firstEntry().id;
        return entryService.view(a, written.firstEntry(), target);
    }

    // A new schedule from the later of the selected job's date and today (CHQ-187), with its interval counted from the
    // selected job's date, so an every-2-weeks rhythm stays on the same weeks. The series' jobs from then on are
    // removed (closed months kept) and the new schedule's jobs written with the body's values. When earlier jobs
    // remain, the series is split: it ends the day before and is stopped, and a new series points back at it;
    // otherwise the series is rewritten in place. Past jobs never move. Retry-safe through requestId; a series already
    // stopped (by an earlier change or a removal) is refused.
    private Entry changeSchedule(Access a, UUID jobId, JobWrite body, JobChangeScope scope) {
        if (scope != THIS_AND_FUTURE) throw validation("scope", "a schedule change applies to this and following jobs");
        if (body.getRequestId() == null) throw validation("requestId", "required for a schedule change");
        canonicalWeekdays(body);
        String requestHash = JobRequestHash.ofScheduleChange(jobId, body);
        JobEntity unlocked = jobs.findJob(a.workspaceId(), jobId).orElse(null);
        if (unlocked == null) {
            // A retry can arrive after the change removed the job it was sent for.
            JobRecurrenceEntity done = recurrences.findRequest(a.workspaceId(), body.getRequestId())
                    .orElseThrow(() -> notFound("Job " + jobId));
            return replay(a, jobId, done, requestHash);
        }
        if (unlocked.recurrenceId == null) throw validation("recurrence", "only a recurring job's schedule can be changed");
        // The series lock serialises retries and concurrent changes: one that waited here finds the first one's row,
        // and the job and its day are read again, as the change before it left them.
        JobRecurrenceEntity old = recurrences.lockSeries(a.workspaceId(), unlocked.recurrenceId);
        Optional<JobRecurrenceEntity> done = recurrences.findRequest(a.workspaceId(), body.getRequestId());
        if (done.isPresent()) return replay(a, jobId, done.get(), requestHash);
        if (old.stopped) {
            throw new KlokkaException(CONFLICT, "This series has ended, so its schedule cannot change. Open a job of its current series.");
        }
        JobEntity job = jobs.reread(a.workspaceId(), unlocked).orElseThrow(() -> notFound("Job " + jobId));
        HourEntryEntity entry = liveEntry(a, job);
        MembershipEntity target = access.target(a, entry.membershipId);

        EntryWriter.JobInput values = input(a, body);
        LocalDate today = today(a);
        LocalDate from = entry.workDate.isAfter(today) ? entry.workDate : today;
        JobRecurrenceDates.Schedule schedule = recurrenceDates.calculate(entry.workDate, from, body.getRecurrence(), today);
        for (SeriesJob each : range(a, List.of(old), from).writable()) writer.deleteJob(a, target, liveEntry(a, each.job()), each.job());

        JobRecurrenceEntity row = old;
        if (jobs.seriesJobs(a.workspaceId(), List.of(old.id)).stream().anyMatch(j -> j.date().isBefore(from))) {
            old.endDate = from.minusDays(1);
            old.openEnded = false;
            old.periodCount = null;
            old.stopped = true;
            recount(a, old);
            row = new JobRecurrenceEntity();
            row.id = UUID.randomUUID();
            row.workspaceId = old.workspaceId;
            row.membershipId = old.membershipId;
            row.previousId = old.id;
            row.createdBy = a.userId();
            row.createdAt = clock.instant();
        }
        row.requestId = body.getRequestId();
        row.requestHash = requestHash;
        schedule.pattern().applyTo(row);
        // The first planned date is on the rhythm the selected job's date set, so the stored rule (anchored there)
        // gives the nightly extender the same dates, and the series reads as starting when its jobs do.
        row.firstDate = schedule.dates().getFirst();
        row.endDate = schedule.endDate();
        row.openEnded = schedule.openEnded();
        row.periodCount = body.getRecurrence().getPeriodCount();
        setTemplate(row, values);
        // The planned count and last date until the jobs are written; recounted from them below.
        row.occurrenceCount = schedule.dates().size();
        row.lastDate = schedule.dates().getLast();
        if (row != old) recurrences.persistSeries(a.workspaceId(), row);
        EntryWriter.SeriesWrite written = writer.createSeriesJobs(a, target, schedule.dates(), values, row,
                EntryWriter.SeriesOptions.CHANGE);
        if (written.written() == 0) {
            throw new KlokkaException(MONTH_LOCKED, "Every job of the new schedule is in a closed month. Unlock one to change the schedule.");
        }
        row.firstEntryId = written.firstEntry().id;
        recount(a, row);
        HourEntryEntity shown = selectedDay(a, jobId).orElse(written.firstEntry());
        return entryService.view(a, shown, target);
    }

    // The answer to a retried schedule change: the selected job's day while it exists, else the new schedule's first.
    private Entry replay(Access a, UUID jobId, JobRecurrenceEntity done, String requestHash) {
        if (!requestHash.equals(done.requestHash)) throw validation("requestId", "already used for a different request");
        HourEntryEntity entry = selectedDay(a, jobId)
                .or(() -> entries.findEntry(a.workspaceId(), done.firstEntryId))
                .orElseThrow(() -> notFound("Original entry"));
        return entryService.view(a, entry, access.target(a, entry.membershipId));
    }

    private Optional<HourEntryEntity> selectedDay(Access a, UUID jobId) {
        return jobs.findJob(a.workspaceId(), jobId).flatMap(j -> entries.findEntry(a.workspaceId(), j.entryId))
                .filter(e -> e.deletedAt == null);
    }

    // The template: the values a series' next jobs are planned with (the extender reads it back with templateOf),
    // cleaned the way EntryWriter cleans a job.
    private static void setTemplate(JobRecurrenceEntity row, EntryWriter.JobInput values) {
        row.hours = values.hours();
        row.startTime = values.startTime();
        row.title = EntryWriter.clean(values.title());
        row.note = EntryWriter.clean(values.note());
        JobLocation location = values.location();
        row.placeId = location == null ? null : EntryWriter.blankToNull(location.getPlaceId());
        row.placeName = location == null ? null : location.getName().trim();
        row.placeAddress = location == null ? null : EntryWriter.blankToNull(location.getAddress());
        row.latitude = location == null ? null : location.getLatitude();
        row.longitude = location == null ? null : location.getLongitude();
    }

    static EntryWriter.JobInput templateOf(JobRecurrenceEntity row) {
        if (row.hours == null) throw new IllegalStateException("series " + row.id + " has no template");
        JobLocation location = row.placeName == null ? null : new JobLocation().placeId(row.placeId).name(row.placeName)
                .address(row.placeAddress).latitude(row.latitude).longitude(row.longitude);
        return new EntryWriter.JobInput(row.hours, row.startTime, row.title, row.note, location);
    }

    // The selection to write, after locking the parts it covers; nothing writable (every job in a closed month) is
    // refused with MONTH_LOCKED.
    private Scoped scoped(Access a, JobEntity job, HourEntryEntity entry, JobChangeScope scope) {
        List<JobRecurrenceEntity> parts = job.recurrenceId == null ? List.of() : parts(a, job.recurrenceId, scope, true);
        Scoped scoped = select(a, parts, job, entry, scope);
        if (scoped.writable().isEmpty()) {
            // A single job keeps the closed month's own message.
            if (scope == ONLY_THIS) writer.requireUnlocked(a, YearMonth.from(entry.workDate));
            throw new KlokkaException(MONTH_LOCKED, "Every job in this range is in a closed month. Unlock one to change them.");
        }
        return scoped;
    }

    // ONLY_THIS is the job; THIS_AND_FUTURE the job and every later one of its series; ALL every job of the series.
    private Scoped select(Access a, List<JobRecurrenceEntity> parts, JobEntity job, HourEntryEntity entry, JobChangeScope scope) {
        if (scope == ONLY_THIS) {
            boolean closed = writer.isLocked(a, YearMonth.from(entry.workDate));
            return new Scoped(parts, closed ? List.of() : List.of(new SeriesJob(job, entry.workDate)), closed ? 1 : 0);
        }
        if (parts.isEmpty()) throw validation("scope", "this job is not recurring");
        return range(a, parts, scope == ALL ? null : entry.workDate);
    }

    // The parts of a series a scope covers, first to current: a schedule change ends a part and starts one that points
    // back at it. ONLY_THIS is the job's own part, THIS_AND_FUTURE adds the later parts, ALL also the earlier ones.
    // Locked (when asked) first to current, so two writers on one series never wait on each other in a cycle.
    private List<JobRecurrenceEntity> parts(Access a, UUID seriesId, JobChangeScope scope, boolean lock) {
        int max = config.recurrence().maxParts();
        Deque<UUID> ids = new ArrayDeque<>(List.of(seriesId));
        if (scope == ALL) {
            for (UUID id = recurrences.previousIdOf(a.workspaceId(), seriesId); id != null; id = recurrences.previousIdOf(a.workspaceId(), id)) {
                ids.addFirst(id);
                if (ids.size() > max) throw new IllegalStateException("series " + seriesId + " has more than " + max + " parts");
            }
        }
        if (scope != ONLY_THIS) {
            for (UUID id = seriesId; ; ) {
                List<UUID> next = recurrences.successorIdsOf(a.workspaceId(), id);
                if (next.isEmpty()) break;
                if (next.size() > 1) throw new IllegalStateException("series " + id + " continues in " + next.size() + " parts");
                id = next.getFirst();
                ids.addLast(id);
                if (ids.size() > max) throw new IllegalStateException("series " + seriesId + " has more than " + max + " parts");
            }
        }
        if (lock) return ids.stream().map(id -> recurrences.lockSeries(a.workspaceId(), id)).toList();
        var rows = recurrences.byIds(a.workspaceId(), ids);
        return ids.stream().map(rows::get).toList();
    }

    // The jobs of these parts from a date on (null: all of them), split into writable ones and those in closed months.
    private Scoped range(Access a, List<JobRecurrenceEntity> parts, LocalDate fromInclusive) {
        List<UUID> ids = parts.stream().map(p -> p.id).toList();
        List<SeriesJob> all = fromInclusive == null ? jobs.seriesJobs(a.workspaceId(), ids)
                : jobs.seriesJobsFrom(a.workspaceId(), ids, fromInclusive);
        if (all.isEmpty()) return new Scoped(parts, List.of(), 0);
        Set<YearMonth> closed = locks.lockedMonthsBetween(a.workspaceId(), all.getFirst().date(), all.getLast().date())
                .stream().map(YearMonth::from).collect(toSet());
        List<SeriesJob> writable = all.stream().filter(j -> !closed.contains(YearMonth.from(j.date()))).toList();
        return new Scoped(parts, writable, all.size() - writable.size());
    }

    private static JobScopeCount count(Scoped scoped) {
        return new JobScopeCount().jobs(scoped.writable().size()).skippedClosed(scoped.skippedClosed());
    }

    // The count and last date from the series' remaining live jobs; a series left without any keeps its values (it is
    // stopped and only read for history).
    private void recount(Access a, JobRecurrenceEntity series) {
        List<SeriesJob> remaining = jobs.seriesJobs(a.workspaceId(), List.of(series.id));
        if (remaining.isEmpty()) return;
        series.occurrenceCount = remaining.size();
        series.lastDate = remaining.getLast().date();
    }

    // Canonical weekday order (Monday first) keeps the request hash independent of the JSON array's order.
    private static void canonicalWeekdays(JobWrite body) {
        if (body.getRecurrence().getWeekdays() == null) return;
        body.getRecurrence().weekdays(body.getRecurrence().getWeekdays().stream()
                .sorted(Comparator.nullsFirst(Comparator.<Weekday>naturalOrder()))
                .collect(Collectors.toCollection(LinkedHashSet::new)));
    }

    private JobEntity findJob(Access a, UUID jobId) {
        return jobs.findJob(a.workspaceId(), jobId).orElseThrow(() -> notFound("Job " + jobId));
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
        return new EntryWriter.JobInput(hours, start, body.getTitle(), body.getNote(), body.getLocation());
    }

}
