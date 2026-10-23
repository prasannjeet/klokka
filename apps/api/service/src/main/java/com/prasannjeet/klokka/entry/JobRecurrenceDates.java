package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.contract.model.JobRecurrenceRule.FrequencyEnum.WEEKLY;
import static com.prasannjeet.klokka.error.KlokkaException.validation;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.JobRecurrencePreview;
import com.prasannjeet.klokka.contract.model.JobRecurrencePreviewDate;
import com.prasannjeet.klokka.contract.model.JobRecurrenceRule;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@ApplicationScoped
public class JobRecurrenceDates {
    // The contract's JobRecurrencePreview.dates maxItems.
    static final int PREVIEW_DATES = 4;

    // For an open-ended series endDate is the date the jobs are planned through (the rolling horizon).
    public record Schedule(List<LocalDate> dates, LocalDate endDate, boolean openEnded, RecurrencePattern pattern) {
        public JobRecurrencePreview preview() {
            return new JobRecurrencePreview().dates(dates.stream().limit(PREVIEW_DATES).map(d -> new JobRecurrencePreviewDate().date(d)).toList())
                    .occurrenceCount(dates.size()).lastDate(dates.getLast()).endDate(endDate);
        }
    }

    @Inject
    KlokkaConfig config;

    // Interval (1 to 12) and periodCount (1 to 120) are bounded by the contract's bean validation on every caller's body.
    // `today` is the workspace's today: an open-ended series is planned `horizonMonths` past the later of it and `first`.
    public Schedule calculate(LocalDate first, JobRecurrenceRule rule, LocalDate today) {
        return calculate(first, first, rule, today);
    }

    // A schedule change (CHQ-187): the rule's interval counts from `anchor` (the selected job's date, an on-period of
    // the series), while the dates, a periodCount, the end check and the horizon start at `from` (on or after it).
    public Schedule calculate(LocalDate anchor, LocalDate from, JobRecurrenceRule rule, LocalDate today) {
        Objects.requireNonNull(today, "today");
        RecurrencePattern pattern = RecurrencePattern.of(anchor, rule);
        if (from == null) throw validation("fromDate", "is required");
        if (from.isBefore(anchor)) throw validation("fromDate", "must be on or after the first date");
        if (rule.getEndDate() != null && rule.getPeriodCount() != null) {
            throw validation("recurrence.endDate", "supply at most one of endDate or periodCount");
        }
        boolean openEnded = rule.getEndDate() == null && rule.getPeriodCount() == null;
        LocalDate end;
        if (openEnded) {
            end = horizon(from.isAfter(today) ? from : today);
        } else if (rule.getPeriodCount() != null) {
            int count = rule.getPeriodCount();
            end = (pattern.frequency() == WEEKLY ? from.plusWeeks(count) : from.plusMonths(count)).minusDays(1);
        } else {
            end = rule.getEndDate();
        }
        if (end.isBefore(from)) throw validation("recurrence.endDate", "must be on or after the first date");
        if (end.isAfter(from.plusYears(config.recurrence().maxYears()))) {
            throw validation("recurrence.endDate", "at most " + config.recurrence().maxYears() + " years");
        }
        List<LocalDate> dates = pattern.datesBetween(from, end, config.recurrence().maxJobs());
        if (dates.isEmpty()) throw validation("recurrence.weekdays", "no jobs fall before the required end");
        return new Schedule(List.copyOf(dates), end, openEnded, pattern);
    }

    // How far an open-ended series is planned on `day`.
    public LocalDate horizon(LocalDate day) {
        return day.plusMonths(config.recurrence().horizonMonths());
    }
}
