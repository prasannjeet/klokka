package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.error.KlokkaException.validation;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.JobRecurrencePreview;
import com.prasannjeet.klokka.contract.model.JobRecurrencePreviewDate;
import com.prasannjeet.klokka.contract.model.JobRecurrenceRule;
import com.prasannjeet.klokka.contract.model.Weekday;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@ApplicationScoped
public class JobRecurrenceDates {
    // The contract's JobRecurrencePreview.dates maxItems.
    static final int PREVIEW_DATES = 4;

    public record Schedule(List<LocalDate> dates, LocalDate endDate) {
        public JobRecurrencePreview preview() {
            return new JobRecurrencePreview().dates(dates.stream().limit(PREVIEW_DATES).map(d -> new JobRecurrencePreviewDate().date(d)).toList())
                    .occurrenceCount(dates.size()).lastDate(dates.getLast()).endDate(endDate);
        }
    }

    @Inject
    KlokkaConfig config;

    // Interval (1 to 12) and periodCount (1 to 120) are bounded by the contract's bean validation on every caller's body.
    public Schedule calculate(LocalDate first, JobRecurrenceRule rule) {
        if (first == null) throw validation("firstDate", "is required");
        if (rule == null || rule.getFrequency() == null) throw validation("recurrence.frequency", "is required");
        int interval = rule.getInterval();
        boolean weekly = rule.getFrequency() == JobRecurrenceRule.FrequencyEnum.WEEKLY;
        Set<Weekday> days = rule.getWeekdays();
        if (weekly && (days == null || days.isEmpty() || days.contains(null))) {
            throw validation("recurrence.weekdays", "choose unique weekdays");
        }
        if (!weekly && days != null && !days.isEmpty()) throw validation("recurrence.weekdays", "only accepted for weekly repeats");
        if (weekly && Boolean.TRUE.equals(rule.getLastDayOfMonth())) throw validation("recurrence.lastDayOfMonth", "only accepted for monthly repeats");
        if ((rule.getEndDate() == null) == (rule.getPeriodCount() == null)) {
            throw validation("recurrence.endDate", "supply exactly one of endDate or periodCount");
        }
        LocalDate end = rule.getEndDate();
        if (rule.getPeriodCount() != null) {
            int count = rule.getPeriodCount();
            end = (weekly ? first.plusWeeks(count) : first.plusMonths(count)).minusDays(1);
        }
        if (end.isBefore(first)) throw validation("recurrence.endDate", "must be on or after the first date");
        if (end.isAfter(first.plusYears(config.recurrence().maxYears()))) {
            throw validation("recurrence.endDate", "at most " + config.recurrence().maxYears() + " years");
        }
        List<LocalDate> dates = new ArrayList<>();
        LocalDate monday = first.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        YearMonth firstMonth = YearMonth.from(first);
        for (LocalDate d = first; !d.isAfter(end); d = d.plusDays(1)) {
            boolean matches;
            if (weekly) {
                matches = ChronoUnit.WEEKS.between(monday, d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))) % interval == 0
                        && days.contains(Weekday.fromValue(d.getDayOfWeek().name()));
            } else {
                YearMonth month = YearMonth.from(d);
                int day = Boolean.TRUE.equals(rule.getLastDayOfMonth()) ? month.lengthOfMonth() : Math.min(first.getDayOfMonth(), month.lengthOfMonth());
                matches = ChronoUnit.MONTHS.between(firstMonth, month) % interval == 0 && d.getDayOfMonth() == day;
            }
            if (matches) {
                dates.add(d);
                if (dates.size() > config.recurrence().maxJobs()) throw validation("recurrence.endDate", "at most " + config.recurrence().maxJobs() + " jobs per series");
            }
        }
        if (dates.isEmpty()) throw validation("recurrence.weekdays", "no jobs fall before the required end");
        return new Schedule(List.copyOf(dates), end);
    }
}
