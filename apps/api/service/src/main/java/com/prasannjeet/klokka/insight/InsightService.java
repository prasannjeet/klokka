package com.prasannjeet.klokka.insight;

import static com.prasannjeet.klokka.contract.model.MemberStatus.ACTIVE;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.auth.WorkspaceAccess;
import com.prasannjeet.klokka.contract.model.Actor;
import com.prasannjeet.klokka.contract.model.BusiestDay;
import com.prasannjeet.klokka.contract.model.CurrentWeek;
import com.prasannjeet.klokka.contract.model.CurrentWeekDay;
import com.prasannjeet.klokka.contract.model.MemberInsights;
import com.prasannjeet.klokka.contract.model.MemberMonth;
import com.prasannjeet.klokka.contract.model.MemberMonthDay;
import com.prasannjeet.klokka.contract.model.MemberShare;
import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.contract.model.WeekStart;
import com.prasannjeet.klokka.contract.model.WeekTotal;
import com.prasannjeet.klokka.contract.model.Weekday;
import com.prasannjeet.klokka.contract.model.WeekdayShare;
import com.prasannjeet.klokka.contract.model.WorkspaceInsights;
import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.entry.EntryViews;
import com.prasannjeet.klokka.member.MemberViews;
import com.prasannjeet.klokka.month.MonthService;
import com.prasannjeet.klokka.month.Months;
import com.prasannjeet.klokka.persistence.EntryFlagEntity;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.FlagRepository;
import com.prasannjeet.klokka.persistence.HourEntryEntity;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import com.prasannjeet.klokka.persistence.MonthLockRepository;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

// The read models (D9): the member month (CHQ-121/122), the employer dashboard (CHQ-124/126) and the employee
// figures (CHQ-125). Every number is computed here, with the injected Clock, so both clients show the same thing.
@ApplicationScoped
public class InsightService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    @Inject
    WorkspaceAccess access;

    @Inject
    EntryRepository entries;

    @Inject
    MembershipRepository memberships;

    @Inject
    FlagRepository flags;

    @Inject
    MonthLockRepository locks;

    @Inject
    MonthService months;

    @Inject
    Clock clock;

    @Transactional
    public MemberMonth memberMonth(UUID workspaceId, UUID membershipId, String month) {
        Access a = access.employerOrSelf(workspaceId, membershipId);
        MembershipEntity m = access.target(a, membershipId);
        WorkspaceEntity w = a.workspace();
        WorkspaceId id = a.workspaceId();
        YearMonth ym = Months.parse(month);
        LocalDate today = Months.today(w, clock);
        LocalDate asOf = Months.asOf(ym, today);
        boolean rate = MemberViews.maySeeRate(a, m);
        List<HourEntryEntity> rows = entries.listLive(id, m.id, ym.atDay(1), ym.atEndOfMonth());
        Map<LocalDate, HourEntryEntity> byDate = new java.util.HashMap<>();
        for (HourEntryEntity e : rows) byDate.put(e.workDate, e);
        Map<UUID, Long> counts = entries.changeCounts(id, rows.stream().map(r -> r.id).toList());
        Map<UUID, EntryFlagEntity> flagged = flags.latestPerEntry(id, rows.stream().map(r -> r.id).toList());
        EntryViews.Names names = new EntryViews.Names(memberships, a);

        List<MemberMonthDay> days = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        int daysWorked = 0;
        int daysWithNote = 0;
        for (LocalDate d = ym.atDay(1); !d.isAfter(ym.atEndOfMonth()); d = d.plusDays(1)) {
            HourEntryEntity e = byDate.get(d);
            MemberMonthDay day = new MemberMonthDay().date(d).weekday(weekday(d)).workingDay(Months.workingDay(d)).changeCount(0);
            if (e != null) {
                total = total.add(e.hours);
                daysWorked++;
                if (e.note != null) daysWithNote++;
                day.entryId(e.id).hours(e.hours).note(e.note)
                        .earnings(rate ? MemberViews.earnings(e.hours, m.hourlyRate) : null)
                        .changeCount(counts.getOrDefault(e.id, 0L).intValue())
                        .updatedAt(e.updatedAt.atOffset(ZoneOffset.UTC))
                        .updatedBy(names.actor(e.updatedBy));
                EntryFlagEntity flag = flagged.get(e.id);
                if (flag != null) day.flag(EntryViews.flagSummary(flag));
            }
            days.add(day);
        }
        int elapsed = Months.elapsedWorkingDays(ym, asOf);
        YearMonth last = ym.minusMonths(1);
        BigDecimal lastTotal = sum(entries.hoursPerDay(id, m.id, last.atDay(1), last.atEndOfMonth()).values());
        List<WeekTotal> weeks = months.weekTotals(id, m.id, ym);
        return new MemberMonth()
                .membershipId(m.id)
                .workspaceId(w.id)
                .name(m.displayName)
                .month(ym.toString())
                .locked(locks.isLocked(id, ym))
                .currency(w.currency)
                .showPay(w.showPay)
                .hourlyRate(rate ? m.hourlyRate : null)
                .days(days)
                .totalHours(total)
                .daysWorked(daysWorked)
                .workingDays(Months.workingDays(ym))
                .avgPerWorkingDay(divide(total, elapsed))
                .lastMonthHours(lastTotal)
                .vsLastMonthHours(total.subtract(lastTotal))
                .bestWeek(best(weeks))
                .weeks(weeks)
                .daysWithNote(daysWithNote)
                .earnings(rate ? MemberViews.earnings(total, m.hourlyRate) : null)
                .openFlags((int) flags.countOpen(id, m.id));
    }

    @Transactional
    public WorkspaceInsights workspaceInsights(UUID workspaceId, String month) {
        Access a = access.employer(workspaceId);
        WorkspaceEntity w = a.workspace();
        WorkspaceId id = a.workspaceId();
        YearMonth ym = Months.parseOrCurrent(month, w, clock);
        LocalDate today = Months.today(w, clock);
        LocalDate asOf = Months.asOf(ym, today);
        LocalDate from = ym.atDay(1);
        LocalDate to = ym.atEndOfMonth();

        Map<LocalDate, BigDecimal> perDay = entries.hoursPerDay(id, null, from, to);
        BigDecimal total = sum(perDay.values());
        int workingDays = Months.workingDays(ym);
        int elapsed = Months.elapsedWorkingDays(ym, asOf);

        YearMonth last = ym.minusMonths(1);
        Map<LocalDate, BigDecimal> lastPerDay = entries.hoursPerDay(id, null, last.atDay(1), last.atEndOfMonth());
        BigDecimal lastTotal = sum(lastPerDay.values());
        int sameDay = Math.min(asOf.isBefore(from) ? 0 : asOf.getDayOfMonth(), last.lengthOfMonth());
        BigDecimal lastAtSamePoint = BigDecimal.ZERO;
        for (var e : lastPerDay.entrySet()) if (e.getKey().getDayOfMonth() <= sameDay) lastAtSamePoint = lastAtSamePoint.add(e.getValue());

        BigDecimal projected = elapsed == 0 ? total
                : total.add(divide(total, elapsed).multiply(BigDecimal.valueOf(workingDays - elapsed))).setScale(2, RoundingMode.HALF_UP);

        List<MembershipEntity> all = memberships.listMembers(id);
        Map<UUID, BigDecimal> perMember = entries.hoursPerMember(id, from, to);
        long activeMembers = all.stream().filter(m -> m.status == ACTIVE && m.role == Role.EMPLOYEE).count();
        List<MemberShare> shares = new ArrayList<>();
        BigDecimal labourCost = BigDecimal.ZERO;
        for (MembershipEntity m : all) {
            BigDecimal h = perMember.get(m.id);
            boolean counts = (m.status == ACTIVE && m.role == Role.EMPLOYEE) || (h != null && h.signum() > 0);
            if (!counts) continue;
            BigDecimal hours = h == null ? BigDecimal.ZERO : h;
            BigDecimal earnings = w.showPay ? MemberViews.earnings(hours, m.hourlyRate) : null;
            if (earnings != null) labourCost = labourCost.add(earnings);
            shares.add(new MemberShare().membershipId(m.id).name(m.displayName).hours(hours)
                    .sharePercent(total.signum() == 0 ? BigDecimal.ZERO : hours.multiply(HUNDRED).divide(total, 1, RoundingMode.HALF_UP))
                    .earnings(earnings));
        }
        shares.sort((x, y) -> y.getHours().compareTo(x.getHours()));

        // Weekday distribution over the weekdays elapsed so far, Monday first.
        Map<DayOfWeek, BigDecimal> perWeekday = new EnumMap<>(DayOfWeek.class);
        Map<DayOfWeek, Integer> weekdayCount = new EnumMap<>(DayOfWeek.class);
        for (DayOfWeek d : DayOfWeek.values()) {
            perWeekday.put(d, BigDecimal.ZERO);
            weekdayCount.put(d, 0);
        }
        for (var e : perDay.entrySet()) perWeekday.merge(e.getKey().getDayOfWeek(), e.getValue(), BigDecimal::add);
        for (LocalDate d = from; !d.isAfter(asOf) && !d.isAfter(to); d = d.plusDays(1)) weekdayCount.merge(d.getDayOfWeek(), 1, Integer::sum);
        List<WeekdayShare> distribution = new ArrayList<>();
        BusiestDay busiest = null;
        for (DayOfWeek d : DayOfWeek.values()) {
            BigDecimal avg = divide(perWeekday.get(d), weekdayCount.get(d));
            distribution.add(new WeekdayShare().weekday(weekday(d)).totalHours(perWeekday.get(d)).avgHours(avg));
            if (avg.signum() > 0 && (busiest == null || avg.compareTo(busiest.getAvgHours()) > 0)) {
                busiest = new BusiestDay().weekday(weekday(d)).avgHours(avg);
            }
        }

        // Nothing logged: elapsed days before today, on weekdays the workspace has ever logged on, with an active
        // member and no entry for anyone.
        List<LocalDate> nothingLogged = new ArrayList<>();
        if (activeMembers > 0) {
            Set<Integer> usedWeekdays = new HashSet<>(entries.weekdaysEverLogged(id));
            LocalDate lastElapsed = asOf.isBefore(today) ? asOf : today.minusDays(1);
            for (LocalDate d = from; !d.isAfter(lastElapsed) && !d.isAfter(to); d = d.plusDays(1)) {
                if (usedWeekdays.contains(d.getDayOfWeek().getValue()) && !perDay.containsKey(d)) nothingLogged.add(d);
            }
        }

        BigDecimal avgPerPerson = activeMembers == 0 || elapsed == 0 ? BigDecimal.ZERO
                : total.divide(BigDecimal.valueOf(activeMembers * (long) elapsed), 2, RoundingMode.HALF_UP);

        return new WorkspaceInsights()
                .month(ym.toString())
                .asOf(asOf.isBefore(from) ? from : asOf)
                .timezone(w.timezone)
                .currency(w.currency)
                .showPay(w.showPay)
                .activeMembers((int) activeMembers)
                .totalHours(total)
                .lastMonthHoursAtSamePoint(lastAtSamePoint)
                .vsLastMonthAtSamePointHours(total.subtract(lastAtSamePoint))
                .vsLastMonthAtSamePointPercent(percent(total.subtract(lastAtSamePoint), lastAtSamePoint))
                .lastMonthTotalHours(lastTotal)
                .projectedMonthEndHours(projected)
                .projectedVsLastMonthPercent(percent(projected.subtract(lastTotal), lastTotal))
                .avgHoursPerPersonPerWorkingDay(avgPerPerson)
                .workingDays(workingDays)
                .elapsedWorkingDays(elapsed)
                .labourCost(w.showPay ? labourCost : null)
                .perMember(shares)
                .weekByWeek(months.weekTotals(id, null, ym))
                .weekdayDistribution(distribution)
                .busiestDay(busiest)
                .nothingLoggedDays(nothingLogged)
                .currentWeek(currentWeek(a, today, activeMembers))
                .openFlags((int) flags.countOpen(id, null));
    }

    @Transactional
    public MemberInsights memberInsights(UUID workspaceId, UUID membershipId, String month) {
        Access a = access.employerOrSelf(workspaceId, membershipId);
        MembershipEntity m = access.target(a, membershipId);
        WorkspaceEntity w = a.workspace();
        WorkspaceId id = a.workspaceId();
        YearMonth ym = Months.parseOrCurrent(month, w, clock);
        LocalDate today = Months.today(w, clock);
        LocalDate asOf = Months.asOf(ym, today);
        boolean rate = MemberViews.maySeeRate(a, m);
        Map<LocalDate, BigDecimal> perDay = entries.hoursPerDay(id, m.id, ym.atDay(1), ym.atEndOfMonth());
        BigDecimal total = sum(perDay.values());
        YearMonth last = ym.minusMonths(1);
        BigDecimal lastTotal = sum(entries.hoursPerDay(id, m.id, last.atDay(1), last.atEndOfMonth()).values());
        int elapsed = Months.elapsedWorkingDays(ym, asOf);
        List<WeekTotal> weeks = months.weekTotals(id, m.id, ym);
        return new MemberInsights()
                .membershipId(m.id)
                .month(ym.toString())
                .asOf(asOf.isBefore(ym.atDay(1)) ? ym.atDay(1) : asOf)
                .currency(w.currency)
                .showPay(w.showPay)
                .hourlyRate(rate ? m.hourlyRate : null)
                .totalHours(total)
                .lastMonthHours(lastTotal)
                .vsLastMonthHours(total.subtract(lastTotal))
                .vsLastMonthPercent(percent(total.subtract(lastTotal), lastTotal))
                .avgPerWorkingDay(divide(total, elapsed))
                .workingDays(Months.workingDays(ym))
                .daysWorked(perDay.size())
                .bestWeek(best(weeks))
                .weekByWeek(weeks)
                .streakDays(streak(id, m.id, today))
                .earnings(rate ? MemberViews.earnings(total, m.hourlyRate) : null);
    }

    // Consecutive working days with hours, ending today or on the last working day before today.
    private int streak(WorkspaceId id, UUID membershipId, LocalDate today) {
        LocalDate start = today.minusDays(60);
        Map<LocalDate, BigDecimal> perDay = entries.hoursPerDay(id, membershipId, start, today);
        LocalDate d = today;
        if (!perDay.containsKey(d)) {
            d = previousWorkingDay(today);
            if (!perDay.containsKey(d)) return 0;
        }
        int streak = 0;
        while (perDay.containsKey(d) && !d.isBefore(start)) {
            streak++;
            d = previousWorkingDay(d);
        }
        return streak;
    }

    private static LocalDate previousWorkingDay(LocalDate d) {
        LocalDate p = d.minusDays(1);
        while (!Months.workingDay(p)) p = p.minusDays(1);
        return p;
    }

    private CurrentWeek currentWeek(Access a, LocalDate today, long activeMembers) {
        DayOfWeek startDay = a.workspace().weekStart == WeekStart.SUNDAY ? DayOfWeek.SUNDAY : DayOfWeek.MONDAY;
        LocalDate from = today;
        while (from.getDayOfWeek() != startDay) from = from.minusDays(1);
        LocalDate to = from.plusDays(6);
        Map<LocalDate, BigDecimal> perDay = entries.hoursPerDay(a.workspaceId(), null, from, to);
        List<CurrentWeekDay> days = new ArrayList<>();
        BigDecimal sum = BigDecimal.ZERO;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            BigDecimal h = perDay.getOrDefault(d, BigDecimal.ZERO);
            sum = sum.add(h);
            days.add(new CurrentWeekDay().date(d).hours(h));
        }
        return new CurrentWeek()
                .isoWeek(today.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR))
                .from(from)
                .to(to)
                .hours(sum)
                .days(days)
                .membersLoggedToday((int) entries.membersLoggedOn(a.workspaceId(), today))
                .membersActive((int) activeMembers);
    }

    private static WeekTotal best(List<WeekTotal> weeks) {
        WeekTotal best = null;
        for (WeekTotal w : weeks) if (w.getHours().signum() > 0 && (best == null || w.getHours().compareTo(best.getHours()) > 0)) best = w;
        return best;
    }

    static Weekday weekday(LocalDate d) {
        return weekday(d.getDayOfWeek());
    }

    static Weekday weekday(DayOfWeek d) {
        return Weekday.valueOf(d.name());
    }

    static BigDecimal sum(Iterable<BigDecimal> values) {
        BigDecimal total = BigDecimal.ZERO;
        for (BigDecimal v : values) total = total.add(v);
        return total;
    }

    static BigDecimal divide(BigDecimal value, int by) {
        return by == 0 ? BigDecimal.ZERO : value.divide(BigDecimal.valueOf(by), 2, RoundingMode.HALF_UP);
    }

    static BigDecimal percent(BigDecimal delta, BigDecimal base) {
        return base.signum() == 0 ? BigDecimal.ZERO : delta.multiply(HUNDRED).divide(base, 1, RoundingMode.HALF_UP);
    }

    static Actor actor(String userId, String name) {
        return new Actor().userId(userId).name(name);
    }
}
