package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.contract.model.MemberStatus.DEACTIVATED;
import static com.prasannjeet.klokka.error.KlokkaException.validation;
import static com.prasannjeet.klokka.error.ProblemCode.ENTRY_HAS_JOBS;
import static com.prasannjeet.klokka.error.ProblemCode.MEMBER_NOT_ACTIVE;
import static com.prasannjeet.klokka.error.ProblemCode.MONTH_LOCKED;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.EntryChangeKind;
import com.prasannjeet.klokka.contract.model.JobLocation;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.i18n.Formats;
import com.prasannjeet.klokka.notification.NotificationService;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.HourEntryChangeEntity;
import com.prasannjeet.klokka.persistence.HourEntryEntity;
import com.prasannjeet.klokka.persistence.JobEntity;
import com.prasannjeet.klokka.persistence.JobRepository;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MonthLockRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

// The ONE funnel every hours write goes through (single PUT, DELETE, the batch, a flag fix, and since CHQ-156 the
// job operations): month lock and member status checks, the live row, one history row per change, and the
// coalesced notification. A day's entry is the sum of its jobs; a day-level write goes through the day's single
// job and refuses a day with several (ENTRY_HAS_JOBS). Callers run it inside their transaction.
@ApplicationScoped
public class EntryWriter {

    public record Outcome(HourEntryEntity entry, boolean changed) {}

    // A job as written: hours already rounded by the workspace rule.
    public record JobInput(BigDecimal hours, LocalTime startTime, String note, JobLocation location) {}

    private static final BigDecimal DAY_MAX = new BigDecimal("24");
    private static final int NOTE_MAX = 500;

    @Inject
    EntryRepository entries;

    @Inject
    JobRepository jobs;

    @Inject
    MonthLockRepository locks;

    @Inject
    NotificationService notifications;

    @Inject
    KlokkaConfig config;

    @Inject
    Clock clock;

    public boolean isLocked(Access access, YearMonth month) {
        return locks.isLocked(access.workspaceId(), month);
    }

    public void requireUnlocked(Access access, YearMonth month) {
        if (locks.isLocked(access.workspaceId(), month)) {
            throw new KlokkaException(MONTH_LOCKED, Formats.month(month, com.prasannjeet.klokka.contract.model.Language.EN)
                    + " is closed. Unlock it to change entries.");
        }
    }

    public void requireWritable(MembershipEntity target) {
        if (target.status == DEACTIVATED) {
            throw new KlokkaException(MEMBER_NOT_ACTIVE, target.displayName + " is deactivated; reactivate them to log hours.");
        }
    }

    // True when a day-level write may set this day's hours (no live entry, or one with at most one job).
    public boolean dayLevelWritable(Access access, UUID membershipId, LocalDate date) {
        return entries.findLive(access.workspaceId(), membershipId, date)
                .map(e -> jobs.listForEntry(access.workspaceId(), e.id).size() <= 1)
                .orElse(true);
    }

    // hours null removes the day (and its jobs). Returns the live entry (or the soft-deleted row on removal, null
    // when there was nothing to remove) and whether anything changed.
    public Outcome write(Access access, MembershipEntity target, LocalDate date, BigDecimal hours, String note, boolean notify) {
        requireWritable(target);
        requireUnlocked(access, YearMonth.from(date));
        Instant now = clock.instant();
        String actor = access.userId();
        String cleanNote = clean(note);
        Optional<HourEntryEntity> live = entries.findLiveForUpdate(access.workspaceId(), target.id, date);

        if (hours == null) {
            if (live.isEmpty()) return new Outcome(null, false);
            HourEntryEntity entry = live.get();
            jobs.deleteForEntry(access.workspaceId(), entry.id);
            removeDay(access, target, entry, now, notify);
            return new Outcome(entry, true);
        }

        if (live.isPresent()) {
            HourEntryEntity entry = live.get();
            boolean same = entry.hours.compareTo(hours) == 0 && Objects.equals(entry.note, cleanNote);
            if (same) return new Outcome(entry, false);
            List<JobEntity> dayJobs = jobs.listForEntry(access.workspaceId(), entry.id);
            if (dayJobs.size() > 1) {
                throw new KlokkaException(ENTRY_HAS_JOBS, "This day has " + dayJobs.size()
                        + " jobs; change them one by one.");
            }
            if (dayJobs.isEmpty()) {
                newJob(access, entry, new JobInput(hours, null, cleanNote, null), now);
            } else {
                JobEntity job = dayJobs.get(0);
                job.hours = hours;
                job.note = cleanNote;
                job.updatedAt = now;
                job.updatedBy = actor;
            }
            BigDecimal before = entry.hours;
            String noteBefore = entry.note;
            entry.hours = hours;
            entry.note = cleanNote;
            entry.updatedAt = now;
            entry.updatedBy = actor;
            history(access, entry, EntryChangeKind.UPDATED, before, hours, noteBefore, cleanNote, actor, now);
            if (notify) notifyChange(access, target, date, before, hours, cleanNote);
            return new Outcome(entry, true);
        }

        HourEntryEntity entry = newEntry(access, target, date, hours, cleanNote, now);
        newJob(access, entry, new JobInput(hours, null, cleanNote, null), now);
        history(access, entry, EntryChangeKind.CREATED, null, hours, null, cleanNote, actor, now);
        if (notify) notifyChange(access, target, date, null, hours, cleanNote);
        return new Outcome(entry, true);
    }

    // Adds a job to the member's day, creating the day when there is none.
    public Outcome createJob(Access access, MembershipEntity target, LocalDate date, JobInput input) {
        requireWritable(target);
        requireUnlocked(access, YearMonth.from(date));
        Instant now = clock.instant();
        Optional<HourEntryEntity> live = entries.findLiveForUpdate(access.workspaceId(), target.id, date);
        if (live.isEmpty()) {
            requireDayTotal(input.hours());
            HourEntryEntity entry = newEntry(access, target, date, input.hours(), clean(input.note()), now);
            newJob(access, entry, input, now);
            history(access, entry, EntryChangeKind.CREATED, null, entry.hours, null, entry.note, access.userId(), now);
            notifyChange(access, target, date, null, entry.hours, entry.note);
            return new Outcome(entry, true);
        }
        HourEntryEntity entry = live.get();
        List<JobEntity> dayJobs = jobs.listForEntry(access.workspaceId(), entry.id);
        if (dayJobs.size() >= config.entries().jobsPerDayMax()) {
            throw validation("hours", "a day holds at most " + config.entries().jobsPerDayMax() + " jobs");
        }
        // A day written without jobs (only possible with rows from before V3) keeps its hours as a first job.
        if (dayJobs.isEmpty() && entry.hours.signum() > 0) {
            newJob(access, entry, new JobInput(entry.hours, null, entry.note, null), now);
        }
        newJob(access, entry, input, now);
        return settle(access, target, entry, now);
    }

    public Outcome updateJob(Access access, MembershipEntity target, HourEntryEntity entry, JobEntity job, JobInput input) {
        requireWritable(target);
        requireUnlocked(access, YearMonth.from(entry.workDate));
        entries.lockEntry(access.workspaceId(), entry);
        Instant now = clock.instant();
        apply(job, input);
        job.updatedAt = now;
        job.updatedBy = access.userId();
        return settle(access, target, entry, now);
    }

    // Removing the last job removes the day.
    public Outcome deleteJob(Access access, MembershipEntity target, HourEntryEntity entry, JobEntity job) {
        requireWritable(target);
        requireUnlocked(access, YearMonth.from(entry.workDate));
        entries.lockEntry(access.workspaceId(), entry);
        Instant now = clock.instant();
        jobs.deleteJob(access.workspaceId(), job);
        if (jobs.listForEntry(access.workspaceId(), entry.id).isEmpty()) {
            removeDay(access, target, entry, now, true);
            return new Outcome(entry, true);
        }
        return settle(access, target, entry, now);
    }

    public HourEntryChangeEntity history(Access access, HourEntryEntity entry, EntryChangeKind kind, BigDecimal before, BigDecimal after,
            String noteBefore, String noteAfter, String actor, Instant at) {
        HourEntryChangeEntity change = new HourEntryChangeEntity();
        change.id = UUID.randomUUID();
        change.workspaceId = entry.workspaceId;
        change.entryId = entry.id;
        change.kind = kind;
        change.hoursBefore = before;
        change.hoursAfter = after;
        change.noteBefore = noteBefore;
        change.noteAfter = noteAfter;
        change.changedBy = actor;
        change.changedAt = at;
        entries.persistChange(access.workspaceId(), change);
        return change;
    }

    // The day's total and joined note from its jobs, with one history row and one notification when they moved.
    private Outcome settle(Access access, MembershipEntity target, HourEntryEntity entry, Instant now) {
        List<JobEntity> dayJobs = jobs.listForEntry(access.workspaceId(), entry.id);
        BigDecimal total = dayJobs.stream().map(j -> j.hours).reduce(BigDecimal.ZERO, BigDecimal::add);
        requireDayTotal(total);
        String note = joinedNote(dayJobs);
        // A job change that keeps the total and note (a new start time or place) still updates the row's stamp.
        entry.updatedAt = now;
        entry.updatedBy = access.userId();
        if (entry.hours.compareTo(total) == 0 && Objects.equals(entry.note, note)) return new Outcome(entry, true);
        BigDecimal before = entry.hours;
        String noteBefore = entry.note;
        entry.hours = total;
        entry.note = note;
        history(access, entry, EntryChangeKind.UPDATED, before, total, noteBefore, note, access.userId(), now);
        notifyChange(access, target, entry.workDate, before, total, note);
        return new Outcome(entry, true);
    }

    private void removeDay(Access access, MembershipEntity target, HourEntryEntity entry, Instant now, boolean notify) {
        entry.deletedAt = now;
        entry.deletedBy = access.userId();
        entry.updatedAt = now;
        entry.updatedBy = access.userId();
        history(access, entry, EntryChangeKind.DELETED, entry.hours, null, entry.note, null, access.userId(), now);
        if (notify) notifyChange(access, target, entry.workDate, entry.hours, null, null);
    }

    private HourEntryEntity newEntry(Access access, MembershipEntity target, LocalDate date, BigDecimal hours, String note, Instant now) {
        HourEntryEntity entry = new HourEntryEntity();
        entry.id = UUID.randomUUID();
        entry.workspaceId = access.workspace().id;
        entry.membershipId = target.id;
        entry.workDate = date;
        entry.hours = hours;
        entry.note = note;
        entry.createdBy = access.userId();
        entry.createdAt = now;
        entry.updatedBy = access.userId();
        entry.updatedAt = now;
        entries.persistEntry(access.workspaceId(), entry);
        return entry;
    }

    private void newJob(Access access, HourEntryEntity entry, JobInput input, Instant now) {
        JobEntity job = new JobEntity();
        job.id = UUID.randomUUID();
        job.workspaceId = entry.workspaceId;
        job.entryId = entry.id;
        job.position = jobs.nextPosition(access.workspaceId(), entry.id);
        apply(job, input);
        job.createdBy = access.userId();
        job.createdAt = now;
        job.updatedBy = access.userId();
        job.updatedAt = now;
        jobs.persistJob(access.workspaceId(), job);
    }

    private static void apply(JobEntity job, JobInput input) {
        job.hours = input.hours();
        job.startTime = input.startTime();
        job.note = clean(input.note());
        JobLocation location = input.location();
        job.placeId = location == null ? null : blankToNull(location.getPlaceId());
        job.placeName = location == null ? null : location.getName().trim();
        job.placeAddress = location == null ? null : blankToNull(location.getAddress());
        job.latitude = location == null ? null : location.getLatitude();
        job.longitude = location == null ? null : location.getLongitude();
    }

    private void notifyChange(Access access, MembershipEntity target, LocalDate date, BigDecimal before, BigDecimal after, String note) {
        notifications.hoursChanged(access.workspace(), target.userId, target.id, access.userId(), access.membership().displayName,
                date, before, after, note);
    }

    private static void requireDayTotal(BigDecimal total) {
        if (total.compareTo(DAY_MAX) > 0) throw validation("hours", "the day's jobs would add up to more than 24 hours");
    }

    // The day's note for older clients and the CSV: the job notes in display order, joined, within the column.
    static String joinedNote(List<JobEntity> dayJobs) {
        String joined = String.join("; ", dayJobs.stream().map(j -> j.note).filter(Objects::nonNull).toList());
        if (joined.isEmpty()) return null;
        return joined.length() <= NOTE_MAX ? joined : joined.substring(0, NOTE_MAX - 1).stripTrailing() + "…";
    }

    private static String clean(String note) {
        return note == null || note.isBlank() ? null : note.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
