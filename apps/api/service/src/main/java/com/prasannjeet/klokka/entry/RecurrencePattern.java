package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.contract.model.JobRecurrenceRule.FrequencyEnum.WEEKLY;
import static com.prasannjeet.klokka.contract.model.MonthlyBy.DAY_OF_MONTH;
import static com.prasannjeet.klokka.contract.model.MonthlyBy.WEEKDAY_OF_MONTH;
import static com.prasannjeet.klokka.error.KlokkaException.validation;
import static java.time.temporal.ChronoUnit.MONTHS;
import static java.time.temporal.ChronoUnit.WEEKS;
import static java.time.temporal.TemporalAdjusters.previousOrSame;

import com.prasannjeet.klokka.contract.model.JobRecurrenceRule;
import com.prasannjeet.klokka.contract.model.JobRecurrenceRule.FrequencyEnum;
import com.prasannjeet.klokka.contract.model.MonthlyBy;
import com.prasannjeet.klokka.contract.model.WeekOfMonth;
import com.prasannjeet.klokka.contract.model.Weekday;
import com.prasannjeet.klokka.persistence.JobRecurrenceEntity;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

// The one place that knows which dates a series rule produces (CHQ-186): the preview, creation, a schedule change and
// the nightly RecurrenceExtender all ask it. Normalised: WEEKLY carries weekdays and no monthly field; MONTHLY carries
// DAY_OF_MONTH with dayOfMonth (31 = the last day, clamped in short months) or WEEKDAY_OF_MONTH with weekOfMonth and
// weekday. Intervals count from the anchor (the series' first date): its week's Monday, or its month.
public record RecurrencePattern(FrequencyEnum frequency, int interval, Set<Weekday> weekdays, MonthlyBy monthlyBy,
        Integer dayOfMonth, WeekOfMonth weekOfMonth, Weekday weekday, LocalDate anchor) {

    static final int LAST_DAY = 31;

    public RecurrencePattern {
        weekdays = weekdays == null || weekdays.isEmpty() ? Set.of() : Set.copyOf(weekdays);
    }

    // A client's rule, validated; every error names the rule field as `recurrence.<field>`.
    public static RecurrencePattern of(LocalDate first, JobRecurrenceRule rule) {
        if (first == null) throw validation("firstDate", "is required");
        if (rule == null || rule.getFrequency() == null) throw validation("recurrence.frequency", "is required");
        if (rule.getInterval() == null || rule.getInterval() < 1) throw validation("recurrence.interval", "must be at least 1");
        int interval = rule.getInterval();
        Set<Weekday> days = rule.getWeekdays();
        boolean lastDay = Boolean.TRUE.equals(rule.getLastDayOfMonth());
        if (rule.getFrequency() == WEEKLY) {
            if (days == null || days.isEmpty() || days.contains(null)) throw validation("recurrence.weekdays", "choose unique weekdays");
            if (lastDay) throw validation("recurrence.lastDayOfMonth", "only accepted for monthly repeats");
            if (rule.getMonthlyBy() != null) throw validation("recurrence.monthlyBy", "only accepted for monthly repeats");
            if (rule.getDayOfMonth() != null) throw validation("recurrence.dayOfMonth", "only accepted for monthly repeats");
            if (rule.getWeekOfMonth() != null) throw validation("recurrence.weekOfMonth", "only accepted for monthly repeats");
            if (rule.getWeekday() != null) throw validation("recurrence.weekday", "only accepted for monthly repeats");
            return new RecurrencePattern(WEEKLY, interval, days, null, null, null, null, first);
        }
        if (days != null && !days.isEmpty()) throw validation("recurrence.weekdays", "only accepted for weekly repeats");
        MonthlyBy by = rule.getMonthlyBy() == null ? DAY_OF_MONTH : rule.getMonthlyBy();
        if (by == WEEKDAY_OF_MONTH) {
            if (lastDay) throw validation("recurrence.lastDayOfMonth", "only accepted with DAY_OF_MONTH");
            if (rule.getDayOfMonth() != null) throw validation("recurrence.dayOfMonth", "only accepted with DAY_OF_MONTH");
            if (rule.getWeekOfMonth() == null) throw validation("recurrence.weekOfMonth", "is required with WEEKDAY_OF_MONTH");
            if (rule.getWeekday() == null) throw validation("recurrence.weekday", "is required with WEEKDAY_OF_MONTH");
            return new RecurrencePattern(rule.getFrequency(), interval, Set.of(), by, null, rule.getWeekOfMonth(), rule.getWeekday(), first);
        }
        if (rule.getWeekOfMonth() != null) throw validation("recurrence.weekOfMonth", "only accepted with WEEKDAY_OF_MONTH");
        if (rule.getWeekday() != null) throw validation("recurrence.weekday", "only accepted with WEEKDAY_OF_MONTH");
        Integer day = rule.getDayOfMonth();
        if (day != null && (day < 1 || day > LAST_DAY)) throw validation("recurrence.dayOfMonth", "must be 1 to 31");
        if (lastDay && day != null && day != LAST_DAY) throw validation("recurrence.dayOfMonth", "conflicts with lastDayOfMonth");
        if (lastDay) day = LAST_DAY;
        if (day == null) day = first.getDayOfMonth();
        return new RecurrencePattern(rule.getFrequency(), interval, Set.of(), by, day, null, null, first);
    }

    // A stored series (written by applyTo, or backfilled by V6).
    public static RecurrencePattern of(JobRecurrenceEntity series) {
        if (series.frequency == WEEKLY) {
            return new RecurrencePattern(WEEKLY, series.interval, series.weekdays, null, null, null, null, series.firstDate);
        }
        if (series.monthlyBy == WEEKDAY_OF_MONTH) {
            if (series.weekOfMonth == null || series.monthWeekday == null) {
                throw new IllegalStateException("series " + series.id + " has WEEKDAY_OF_MONTH without week or weekday");
            }
            return new RecurrencePattern(series.frequency, series.interval, Set.of(), WEEKDAY_OF_MONTH, null,
                    series.weekOfMonth, series.monthWeekday, series.firstDate);
        }
        if (series.dayOfMonth == null) throw new IllegalStateException("series " + series.id + " has DAY_OF_MONTH without a day");
        return new RecurrencePattern(series.frequency, series.interval, Set.of(), DAY_OF_MONTH, series.dayOfMonth, null, null,
                series.firstDate);
    }

    public boolean matches(LocalDate d) {
        if (frequency == WEEKLY) {
            long weeks = WEEKS.between(anchor.with(previousOrSame(DayOfWeek.MONDAY)), d.with(previousOrSame(DayOfWeek.MONDAY)));
            return Math.floorMod(weeks, interval) == 0 && weekdays.contains(Weekday.fromValue(d.getDayOfWeek().name()));
        }
        if (Math.floorMod(MONTHS.between(YearMonth.from(anchor), YearMonth.from(d)), interval) != 0) return false;
        if (monthlyBy == DAY_OF_MONTH) return d.getDayOfMonth() == Math.min(dayOfMonth, d.lengthOfMonth());
        if (!d.getDayOfWeek().name().equals(weekday.name())) return false;
        return switch (weekOfMonth) {
            case FIRST -> (d.getDayOfMonth() - 1) / 7 == 0;
            case SECOND -> (d.getDayOfMonth() - 1) / 7 == 1;
            case THIRD -> (d.getDayOfMonth() - 1) / 7 == 2;
            case FOURTH -> (d.getDayOfMonth() - 1) / 7 == 3;
            case LAST -> d.plusWeeks(1).getMonth() != d.getMonth();
        };
    }

    // The matching dates in [from, to], never before the anchor; more than `cap` is a validation error.
    public List<LocalDate> datesBetween(LocalDate fromInclusive, LocalDate toInclusive, int cap) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate from = fromInclusive.isBefore(anchor) ? anchor : fromInclusive;
        for (LocalDate d = from; !d.isAfter(toInclusive); d = d.plusDays(1)) {
            if (!matches(d)) continue;
            dates.add(d);
            if (dates.size() > cap) throw validation("recurrence.endDate", "at most " + cap + " jobs per series");
        }
        return dates;
    }

    // Writes the rule columns and the first date (the anchor); ends, counts and the template are the caller's.
    public void applyTo(JobRecurrenceEntity row) {
        row.firstDate = anchor;
        row.frequency = frequency;
        row.interval = interval;
        row.weekdays = weekdays.isEmpty() ? EnumSet.noneOf(Weekday.class) : EnumSet.copyOf(weekdays);
        row.monthlyBy = monthlyBy == null ? DAY_OF_MONTH : monthlyBy;
        row.dayOfMonth = dayOfMonth;
        row.weekOfMonth = weekOfMonth;
        row.monthWeekday = weekday;
        row.lastDayOfMonth = dayOfMonth != null && dayOfMonth == LAST_DAY;
    }

    // The rule as the contract shows it, without its end; lastDayOfMonth stays set for older clients.
    public JobRecurrenceRule toRule() {
        JobRecurrenceRule rule = new JobRecurrenceRule().frequency(frequency).interval(interval);
        if (frequency == WEEKLY) return rule.weekdays(EnumSet.copyOf(weekdays));
        rule.monthlyBy(monthlyBy).lastDayOfMonth(dayOfMonth != null && dayOfMonth == LAST_DAY);
        if (monthlyBy == DAY_OF_MONTH) return rule.dayOfMonth(dayOfMonth);
        return rule.weekOfMonth(weekOfMonth).weekday(weekday);
    }
}
