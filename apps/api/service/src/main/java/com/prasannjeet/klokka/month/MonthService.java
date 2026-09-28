package com.prasannjeet.klokka.month;

import static com.prasannjeet.klokka.contract.model.MemberStatus.ACTIVE;
import static com.prasannjeet.klokka.error.KlokkaException.forbidden;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.auth.WorkspaceAccess;
import com.prasannjeet.klokka.contract.model.Actor;
import com.prasannjeet.klokka.contract.model.MemberMonthTotal;
import com.prasannjeet.klokka.contract.model.MonthStatus;
import com.prasannjeet.klokka.contract.model.MonthSummary;
import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.contract.model.WeekTotal;
import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.i18n.Catalogue;
import com.prasannjeet.klokka.me.MeService;
import com.prasannjeet.klokka.member.MemberViews;
import com.prasannjeet.klokka.notification.NotificationService;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.HourEntryEntity;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import com.prasannjeet.klokka.persistence.MonthLockEntity;
import com.prasannjeet.klokka.persistence.MonthLockRepository;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

// Months (CHQ-120 lock/unlock with history and notifications, CHQ-122 summary, CHQ-129 CSV export).
@ApplicationScoped
public class MonthService {

    public record Csv(String fileName, String body) {}

    @Inject
    WorkspaceAccess access;

    @Inject
    MonthLockRepository locks;

    @Inject
    EntryRepository entries;

    @Inject
    MembershipRepository memberships;

    @Inject
    NotificationService notifications;

    @Inject
    MeService me;

    @Inject
    Catalogue catalogue;

    @Inject
    Clock clock;

    @Transactional
    public MonthStatus status(UUID workspaceId, String month) {
        Access a = access.member(workspaceId);
        return status(a, Months.parse(month));
    }

    @Transactional
    public MonthStatus lock(UUID workspaceId, String month) {
        Access a = access.employer(workspaceId);
        YearMonth ym = Months.parse(month);
        if (locks.findActive(a.workspaceId(), ym).isEmpty()) {
            MonthLockEntity lock = new MonthLockEntity();
            lock.id = UUID.randomUUID();
            lock.workspaceId = a.workspace().id;
            lock.yearMonth = ym.atDay(1);
            lock.lockedBy = a.userId();
            lock.lockedAt = clock.instant();
            locks.persistLock(a.workspaceId(), lock);
            Map<UUID, BigDecimal> hours = entries.hoursPerMember(a.workspaceId(), ym.atDay(1), ym.atEndOfMonth());
            for (MembershipEntity m : memberships.listByStatus(a.workspaceId(), List.of(ACTIVE))) {
                if (m.userId == null || m.userId.equals(a.userId())) continue;
                BigDecimal h = hours.getOrDefault(m.id, BigDecimal.ZERO);
                BigDecimal money = a.workspace().showPay ? MemberViews.earnings(h, m.hourlyRate) : null;
                notifications.monthClosed(a.workspace(), m.userId, m.id, a.membership().displayName, ym, h, money);
            }
        }
        return status(a, ym);
    }

    @Transactional
    public MonthStatus unlock(UUID workspaceId, String month) {
        Access a = access.employer(workspaceId);
        YearMonth ym = Months.parse(month);
        Optional<MonthLockEntity> active = locks.findActive(a.workspaceId(), ym);
        if (active.isPresent()) {
            active.get().unlockedBy = a.userId();
            active.get().unlockedAt = clock.instant();
            for (MembershipEntity m : memberships.listByStatus(a.workspaceId(), List.of(ACTIVE))) {
                if (m.userId == null || m.userId.equals(a.userId())) continue;
                notifications.monthReopened(a.workspace(), m.userId, m.id, a.membership().displayName, ym);
            }
        }
        return status(a, ym);
    }

    @Transactional
    public MonthSummary summary(UUID workspaceId, String month) {
        Access a = access.employer(workspaceId);
        YearMonth ym = Months.parse(month);
        WorkspaceId id = a.workspaceId();
        WorkspaceEntity w = a.workspace();
        Map<UUID, BigDecimal> hours = entries.hoursPerMember(id, ym.atDay(1), ym.atEndOfMonth());
        Map<UUID, Long> days = entries.daysPerMember(id, ym.atDay(1), ym.atEndOfMonth());
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal cost = BigDecimal.ZERO;
        // No cost at all rather than a cost of zero when nobody in the month has a rate (CHQ-145).
        boolean costKnown = false;
        List<MemberMonthTotal> members = new ArrayList<>();
        for (MembershipEntity m : memberships.listMembers(id)) {
            BigDecimal h = hours.get(m.id);
            if (m.role == Role.EMPLOYER && h == null) continue;
            BigDecimal memberHours = h == null ? BigDecimal.ZERO : h;
            total = total.add(memberHours);
            BigDecimal earnings = w.showPay ? MemberViews.earnings(memberHours, m.hourlyRate) : null;
            if (earnings != null) {
                cost = cost.add(earnings);
                costKnown = true;
            }
            members.add(new MemberMonthTotal().membershipId(m.id).name(m.displayName).status(m.status)
                    .hours(memberHours).daysWorked(days.getOrDefault(m.id, 0L).intValue()).earnings(earnings));
        }
        return new MonthSummary()
                .month(ym.toString())
                .locked(locks.isLocked(id, ym))
                .currency(w.currency)
                .showPay(w.showPay)
                .totalHours(total)
                .workingDays(Months.workingDays(ym))
                .labourCost(costKnown ? cost : null)
                .members(members)
                .weeks(weekTotals(id, null, ym));
    }

    // Employers export the workspace or one member; employees only themselves.
    @Transactional
    public Csv csv(UUID workspaceId, String month, UUID membershipId) {
        Access a = access.member(workspaceId);
        YearMonth ym = Months.parse(month);
        UUID scope = membershipId;
        if (!a.employer()) {
            if (membershipId != null && !a.isSelf(membershipId)) throw forbidden("Employees export their own month only.");
            scope = a.membership().id;
        }
        WorkspaceEntity w = a.workspace();
        Map<UUID, MembershipEntity> members = new java.util.HashMap<>();
        for (MembershipEntity m : memberships.listMembers(a.workspaceId())) members.put(m.id, m);
        List<HourEntryEntity> rows = new ArrayList<>(entries.listLive(a.workspaceId(), scope, ym.atDay(1), ym.atEndOfMonth()));
        rows.sort(java.util.Comparator.comparing((HourEntryEntity e) -> e.workDate).thenComparing(e -> members.get(e.membershipId).displayName));
        boolean withPay = w.showPay;
        List<CsvExport.Row> csvRows = new ArrayList<>();
        for (HourEntryEntity e : rows) {
            MembershipEntity m = members.get(e.membershipId);
            BigDecimal rate = withPay && MemberViews.maySeeRate(a, m) ? m.hourlyRate : null;
            csvRows.add(new CsvExport.Row(e.workDate, m.displayName, e.hours, e.note, rate, rate == null ? null : MemberViews.earnings(e.hours, rate)));
        }
        String body = CsvExport.render(csvRows, withPay, me.languageOf(a.userId()), catalogue);
        return new Csv("klokka-" + w.slug + "-" + ym + ".csv", body);
    }

    public List<WeekTotal> weekTotals(WorkspaceId id, UUID membershipId, YearMonth ym) {
        Map<LocalDate, BigDecimal> perDay = entries.hoursPerDay(id, membershipId, ym.atDay(1), ym.atEndOfMonth());
        List<WeekTotal> weeks = new ArrayList<>();
        for (Months.Week week : Months.weeks(ym)) {
            BigDecimal sum = BigDecimal.ZERO;
            for (LocalDate d = week.from(); !d.isAfter(week.to()); d = d.plusDays(1)) sum = sum.add(perDay.getOrDefault(d, BigDecimal.ZERO));
            weeks.add(new WeekTotal().isoWeek(week.isoWeek()).from(week.from()).to(week.to()).hours(sum));
        }
        return weeks;
    }

    private MonthStatus status(Access a, YearMonth ym) {
        Optional<MonthLockEntity> lock = locks.findActive(a.workspaceId(), ym);
        MonthStatus status = new MonthStatus()
                .month(ym.toString())
                .locked(lock.isPresent())
                .lockedAt(lock.map(l -> l.lockedAt.atOffset(ZoneOffset.UTC)).orElse(null))
                .workingDays(Months.workingDays(ym))
                .daysInMonth(ym.lengthOfMonth())
                .entryCount((int) entries.countLiveInMonth(a.workspaceId(), ym.atDay(1), ym.atEndOfMonth()));
        lock.ifPresent(l -> status.lockedBy(new Actor().userId(l.lockedBy)
                .name(memberships.findByUser(a.workspaceId(), l.lockedBy).map(m -> m.displayName).orElse(l.lockedBy))));
        return status;
    }
}
