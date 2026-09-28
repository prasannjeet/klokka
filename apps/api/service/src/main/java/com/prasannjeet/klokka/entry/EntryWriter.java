package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.contract.model.MemberStatus.DEACTIVATED;
import static com.prasannjeet.klokka.error.ProblemCode.MEMBER_NOT_ACTIVE;
import static com.prasannjeet.klokka.error.ProblemCode.MONTH_LOCKED;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.contract.model.EntryChangeKind;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.i18n.Formats;
import com.prasannjeet.klokka.notification.NotificationService;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.HourEntryChangeEntity;
import com.prasannjeet.klokka.persistence.HourEntryEntity;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MonthLockRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Optional;
import java.util.UUID;

// The ONE funnel every hours write goes through (single PUT, DELETE, the batch, a flag fix): month lock and
// member status checks, the live row, one history row per change, and the coalesced notification. Callers run
// it inside their transaction.
@ApplicationScoped
public class EntryWriter {

    public record Outcome(HourEntryEntity entry, boolean changed) {}

    @Inject
    EntryRepository entries;

    @Inject
    MonthLockRepository locks;

    @Inject
    NotificationService notifications;

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

    // hours null removes the day. Returns the live entry (or the soft-deleted row on removal, null when there
    // was nothing to remove) and whether anything changed.
    public Outcome write(Access access, MembershipEntity target, LocalDate date, BigDecimal hours, String note, boolean notify) {
        requireWritable(target);
        requireUnlocked(access, YearMonth.from(date));
        Instant now = clock.instant();
        String actor = access.userId();
        String actorName = access.membership().displayName;
        String cleanNote = note == null || note.isBlank() ? null : note.trim();
        Optional<HourEntryEntity> live = entries.findLive(access.workspaceId(), target.id, date);

        if (hours == null) {
            if (live.isEmpty()) return new Outcome(null, false);
            HourEntryEntity entry = live.get();
            entry.deletedAt = now;
            entry.deletedBy = actor;
            entry.updatedAt = now;
            entry.updatedBy = actor;
            history(access, entry, EntryChangeKind.DELETED, entry.hours, null, entry.note, null, actor, now);
            if (notify) notifications.hoursChanged(access.workspace(), target.userId, target.id, actor, actorName, date, entry.hours, null, null);
            return new Outcome(entry, true);
        }

        if (live.isPresent()) {
            HourEntryEntity entry = live.get();
            boolean same = entry.hours.compareTo(hours) == 0 && java.util.Objects.equals(entry.note, cleanNote);
            if (same) return new Outcome(entry, false);
            BigDecimal before = entry.hours;
            String noteBefore = entry.note;
            entry.hours = hours;
            entry.note = cleanNote;
            entry.updatedAt = now;
            entry.updatedBy = actor;
            history(access, entry, EntryChangeKind.UPDATED, before, hours, noteBefore, cleanNote, actor, now);
            if (notify) notifications.hoursChanged(access.workspace(), target.userId, target.id, actor, actorName, date, before, hours, cleanNote);
            return new Outcome(entry, true);
        }

        HourEntryEntity entry = new HourEntryEntity();
        entry.id = UUID.randomUUID();
        entry.workspaceId = access.workspace().id;
        entry.membershipId = target.id;
        entry.workDate = date;
        entry.hours = hours;
        entry.note = cleanNote;
        entry.createdBy = actor;
        entry.createdAt = now;
        entry.updatedBy = actor;
        entry.updatedAt = now;
        entries.persistEntry(access.workspaceId(), entry);
        history(access, entry, EntryChangeKind.CREATED, null, hours, null, cleanNote, actor, now);
        if (notify) notifications.hoursChanged(access.workspace(), target.userId, target.id, actor, actorName, date, null, hours, cleanNote);
        return new Outcome(entry, true);
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
}
