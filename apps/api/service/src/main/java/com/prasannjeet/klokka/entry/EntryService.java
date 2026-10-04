package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.error.KlokkaException.forbidden;
import static com.prasannjeet.klokka.error.KlokkaException.notFound;
import static com.prasannjeet.klokka.error.KlokkaException.validation;
import static com.prasannjeet.klokka.error.ProblemCode.ENTRY_HAS_JOBS;
import static com.prasannjeet.klokka.error.ProblemCode.MONTH_LOCKED;
import static com.prasannjeet.klokka.error.ProblemCode.VALIDATION;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.auth.WorkspaceAccess;
import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.Entry;
import com.prasannjeet.klokka.contract.model.EntryBatchItem;
import com.prasannjeet.klokka.contract.model.EntryBatchRequest;
import com.prasannjeet.klokka.contract.model.EntryBatchResult;
import com.prasannjeet.klokka.contract.model.EntryChange;
import com.prasannjeet.klokka.contract.model.EntryKey;
import com.prasannjeet.klokka.contract.model.EntryUpsert;
import com.prasannjeet.klokka.contract.model.FieldError;
import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.i18n.Formats;
import com.prasannjeet.klokka.persistence.EntryFlagEntity;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.FlagRepository;
import com.prasannjeet.klokka.persistence.HourEntryEntity;
import com.prasannjeet.klokka.persistence.JobEntity;
import com.prasannjeet.klokka.persistence.JobRepository;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import com.prasannjeet.klokka.persistence.MonthLockRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

// Hours (CHQ-117 single day, CHQ-118 batch, CHQ-119 history, CHQ-123 listing). Every write goes through
// EntryWriter; the batch is one transaction and one sitting (one coalesced notification per member).
@ApplicationScoped
public class EntryService {

    @Inject
    WorkspaceAccess access;

    @Inject
    EntryWriter writer;

    @Inject
    EntryRepository entries;

    @Inject
    MembershipRepository memberships;

    @Inject
    FlagRepository flags;

    @Inject
    MonthLockRepository locks;

    @Inject
    JobRepository jobs;

    @Inject
    KlokkaConfig config;

    @Transactional
    public Entry upsert(UUID workspaceId, UUID membershipId, LocalDate date, EntryUpsert body) {
        Access a = access.employer(workspaceId);
        MembershipEntity target = access.target(a, membershipId);
        BigDecimal hours = HoursRounding.apply(body.getHours(), a.workspace().rounding, "hours");
        EntryWriter.Outcome outcome = writer.write(a, target, date, hours, body.getNote(), true);
        return view(a, outcome.entry(), target);
    }

    @Transactional
    public void delete(UUID workspaceId, UUID membershipId, LocalDate date) {
        Access a = access.employer(workspaceId);
        MembershipEntity target = access.target(a, membershipId);
        writer.write(a, target, date, null, null, true);
    }

    @Transactional
    public EntryBatchResult batch(UUID workspaceId, EntryBatchRequest request) {
        Access a = access.employer(workspaceId);
        List<EntryBatchItem> items = request.getItems();
        if (items.size() > config.entries().batchMax()) {
            throw validation("items", "at most " + config.entries().batchMax() + " items per batch");
        }
        // Validate everything first: the whole batch is refused when any item is wrong.
        List<FieldError> errors = new ArrayList<>();
        Map<UUID, MembershipEntity> targets = new HashMap<>();
        Set<YearMonth> months = new HashSet<>();
        Set<String> keys = new HashSet<>();
        List<BigDecimal> rounded = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            EntryBatchItem item = items.get(i);
            String prefix = "items[" + i + "].";
            MembershipEntity target = targets.computeIfAbsent(item.getMembershipId(),
                    id -> memberships.findMember(a.workspaceId(), id).orElse(null));
            if (target == null) errors.add(new FieldError().field(prefix + "membershipId").message("is not a member of this workspace"));
            else if (target.status == com.prasannjeet.klokka.contract.model.MemberStatus.DEACTIVATED) {
                errors.add(new FieldError().field(prefix + "membershipId").message("is deactivated"));
            }
            if (!keys.add(item.getMembershipId() + "|" + item.getWorkDate())) {
                errors.add(new FieldError().field(prefix + "workDate").message("appears twice for the same member"));
            }
            BigDecimal hours = null;
            if (item.getHours() != null) {
                try {
                    hours = HoursRounding.apply(item.getHours(), a.workspace().rounding, prefix + "hours");
                } catch (KlokkaException e) {
                    errors.addAll(e.errors());
                }
            }
            rounded.add(hours);
            months.add(YearMonth.from(item.getWorkDate()));
        }
        if (!errors.isEmpty()) {
            throw new KlokkaException(VALIDATION, "The batch has " + errors.size() + " invalid item(s).", errors, null);
        }
        // A closed month refuses the whole batch, and the problem names every cell in it (a week that spans a
        // closed and an open month rings only the closed cells on the grid).
        Map<YearMonth, Boolean> locked = new HashMap<>();
        List<FieldError> closed = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            YearMonth month = YearMonth.from(items.get(i).getWorkDate());
            if (locked.computeIfAbsent(month, m -> writer.isLocked(a, m))) {
                closed.add(new FieldError().field("items[" + i + "].workDate").message(Formats.month(month, Language.EN) + " is closed"));
            }
        }
        if (!closed.isEmpty()) {
            throw new KlokkaException(MONTH_LOCKED, "The batch touches a closed month. Unlock it to change entries.", closed, null);
        }
        // A day with several jobs is changed job by job (CHQ-156); removing it whole is still allowed.
        List<FieldError> multi = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            EntryBatchItem item = items.get(i);
            if (rounded.get(i) != null && !writer.dayLevelWritable(a, item.getMembershipId(), item.getWorkDate())) {
                multi.add(new FieldError().field("items[" + i + "].hours").message("this day has several jobs"));
            }
        }
        if (!multi.isEmpty()) {
            throw new KlokkaException(ENTRY_HAS_JOBS, "The batch sets hours on days with several jobs; change those job by job.", multi, null);
        }

        List<Entry> saved = new ArrayList<>();
        List<EntryKey> removed = new ArrayList<>();
        Set<String> notified = new HashSet<>();
        for (int i = 0; i < items.size(); i++) {
            EntryBatchItem item = items.get(i);
            MembershipEntity target = targets.get(item.getMembershipId());
            EntryWriter.Outcome outcome = writer.write(a, target, item.getWorkDate(), rounded.get(i), item.getNote(), true);
            if (rounded.get(i) == null) {
                if (outcome.changed()) removed.add(new EntryKey().membershipId(target.id).workDate(item.getWorkDate()));
            } else {
                saved.add(view(a, outcome.entry(), target));
            }
            if (outcome.changed() && target.userId != null && !target.userId.equals(a.userId())) notified.add(target.userId);
        }
        return new EntryBatchResult().saved(saved).removed(removed).membersNotified(notified.size());
    }

    @Transactional
    public List<Entry> list(UUID workspaceId, LocalDate from, LocalDate to, UUID membershipId) {
        Access a = access.member(workspaceId);
        if (to.isBefore(from)) throw validation("to", "must not be before from");
        if (ChronoUnit.DAYS.between(from, to) + 1 > config.entries().rangeMaxDays()) {
            throw validation("to", "at most " + config.entries().rangeMaxDays() + " days per call");
        }
        UUID scope = a.employer() ? membershipId : a.membership().id;
        List<HourEntryEntity> rows = entries.listLive(a.workspaceId(), scope, from, to);
        return views(a, rows);
    }

    @Transactional
    public List<EntryChange> history(UUID workspaceId, UUID entryId) {
        Access a = access.member(workspaceId);
        HourEntryEntity entry = entries.findEntry(a.workspaceId(), entryId).orElseThrow(() -> notFound("Entry " + entryId));
        if (!a.employer() && !a.isSelf(entry.membershipId)) throw forbidden("Only the employer or the entry's member can see its history.");
        EntryViews.Names names = new EntryViews.Names(memberships, a);
        return entries.listChanges(a.workspaceId(), entryId).stream().map(c -> EntryViews.toChange(c, names)).toList();
    }

    Entry view(Access a, HourEntryEntity e, MembershipEntity member) {
        return views(a, List.of(e)).get(0);
    }

    List<Entry> views(Access a, List<HourEntryEntity> rows) {
        if (rows.isEmpty()) return List.of();
        WorkspaceId id = a.workspaceId();
        List<UUID> ids = rows.stream().map(r -> r.id).toList();
        Map<UUID, Long> counts = entries.changeCounts(id, ids);
        Map<UUID, EntryFlagEntity> flagged = flags.latestPerEntry(id, ids);
        Map<UUID, List<JobEntity>> dayJobs = jobs.listForEntries(id, ids);
        LocalDate min = rows.stream().map(r -> r.workDate).min(LocalDate::compareTo).orElseThrow();
        LocalDate max = rows.stream().map(r -> r.workDate).max(LocalDate::compareTo).orElseThrow();
        Set<LocalDate> lockedMonths = new HashSet<>(locks.lockedMonthsBetween(id, min, max));
        EntryViews.Names names = new EntryViews.Names(memberships, a);
        Map<UUID, MembershipEntity> members = new LinkedHashMap<>();
        List<Entry> out = new ArrayList<>(rows.size());
        for (HourEntryEntity row : rows) {
            MembershipEntity member = members.computeIfAbsent(row.membershipId,
                    mid -> memberships.findMember(id, mid).orElseThrow(() -> notFound("Member " + mid)));
            boolean locked = lockedMonths.contains(row.workDate.withDayOfMonth(1));
            out.add(EntryViews.toEntry(a, row, member, names, counts.getOrDefault(row.id, 0L), flagged.get(row.id), locked,
                    dayJobs.getOrDefault(row.id, List.of())));
        }
        return out;
    }
}
