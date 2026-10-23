package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.contract.model.JobRecurrenceRule.FrequencyEnum.MONTHLY;
import static com.prasannjeet.klokka.contract.model.JobRecurrenceRule.FrequencyEnum.WEEKLY;
import static com.prasannjeet.klokka.contract.model.MonthlyBy.DAY_OF_MONTH;
import static com.prasannjeet.klokka.contract.model.MonthlyBy.WEEKDAY_OF_MONTH;
import static java.time.LocalDate.of;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.prasannjeet.klokka.contract.model.JobRecurrenceRule;
import com.prasannjeet.klokka.contract.model.WeekOfMonth;
import com.prasannjeet.klokka.contract.model.Weekday;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.persistence.JobRecurrenceEntity;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import org.junit.jupiter.api.Test;

class RecurrencePatternTest {

    private static final int CAP = 500;

    private static JobRecurrenceRule monthly(int interval) {
        return new JobRecurrenceRule().frequency(MONTHLY).interval(interval);
    }

    private static JobRecurrenceRule nth(WeekOfMonth week, Weekday day) {
        return monthly(1).monthlyBy(WEEKDAY_OF_MONTH).weekOfMonth(week).weekday(day);
    }

    private static List<LocalDate> dates(LocalDate first, JobRecurrenceRule rule, LocalDate to) {
        return RecurrencePattern.of(first, rule).datesBetween(first, to, CAP);
    }

    private static String field(Runnable call) {
        try {
            call.run();
        } catch (KlokkaException e) {
            return e.errors().getFirst().getField();
        }
        throw new AssertionError("expected a validation error");
    }

    @Test
    void theThirdWednesdayIsTheThirdWednesdayOfTheMonth() {
        // November 2026 starts on a Sunday: Wednesdays 4, 11, 18, 25.
        assertThat(dates(of(2026, 11, 1), nth(WeekOfMonth.THIRD, Weekday.WEDNESDAY), of(2027, 1, 31)))
                .containsExactly(of(2026, 11, 18), of(2026, 12, 16), of(2027, 1, 20));
    }

    @Test
    void lastAndFourthDifferInAMonthWithFiveOfThatWeekday() {
        // January 2027 has five Fridays (1, 8, 15, 22, 29); February has four.
        assertThat(dates(of(2027, 1, 1), nth(WeekOfMonth.LAST, Weekday.FRIDAY), of(2027, 2, 28)))
                .containsExactly(of(2027, 1, 29), of(2027, 2, 26));
        assertThat(dates(of(2027, 1, 1), nth(WeekOfMonth.FOURTH, Weekday.FRIDAY), of(2027, 2, 28)))
                .containsExactly(of(2027, 1, 22), of(2027, 2, 26));
    }

    @Test
    void theSecondSundayAndTheFirstMondayCountFromTheFirstOfTheMonth() {
        assertThat(dates(of(2026, 11, 1), nth(WeekOfMonth.SECOND, Weekday.SUNDAY), of(2026, 12, 31)))
                .containsExactly(of(2026, 11, 8), of(2026, 12, 13));
        assertThat(dates(of(2026, 11, 1), nth(WeekOfMonth.FIRST, Weekday.MONDAY), of(2026, 12, 31)))
                .containsExactly(of(2026, 11, 2), of(2026, 12, 7));
    }

    @Test
    void aStartAfterThisMonthsOccurrenceBeginsNextMonth() {
        assertThat(dates(of(2026, 11, 19), nth(WeekOfMonth.THIRD, Weekday.WEDNESDAY), of(2026, 12, 31)))
                .containsExactly(of(2026, 12, 16));
    }

    @Test
    void dayThirtyOneIsTheLastDayOfEveryMonthIncludingLeapFebruary() {
        JobRecurrenceRule last = monthly(1).monthlyBy(DAY_OF_MONTH).dayOfMonth(31);
        assertThat(dates(of(2026, 11, 1), last, of(2027, 2, 28)))
                .containsExactly(of(2026, 11, 30), of(2026, 12, 31), of(2027, 1, 31), of(2027, 2, 28));
        assertThat(dates(of(2028, 2, 1), last, of(2028, 2, 29))).containsExactly(of(2028, 2, 29));
    }

    @Test
    void aChosenDayIsClampedInShortMonthsAndDefaultsToTheFirstDatesDay() {
        assertThat(dates(of(2027, 1, 5), monthly(1).dayOfMonth(30), of(2027, 3, 31)))
                .containsExactly(of(2027, 1, 30), of(2027, 2, 28), of(2027, 3, 30));
        assertThat(dates(of(2026, 11, 15), monthly(1), of(2027, 1, 31)))
                .containsExactly(of(2026, 11, 15), of(2026, 12, 15), of(2027, 1, 15));
    }

    @Test
    void lastDayOfMonthFromOlderClientsIsDayThirtyOne() {
        RecurrencePattern old = RecurrencePattern.of(of(2026, 11, 10), monthly(1).lastDayOfMonth(true));
        RecurrencePattern current = RecurrencePattern.of(of(2026, 11, 10), monthly(1).dayOfMonth(31));
        assertThat(old).isEqualTo(current);
        assertThat(old.dayOfMonth()).isEqualTo(31);
        assertThat(old.toRule().getLastDayOfMonth()).isTrue();
        assertThat(RecurrencePattern.of(of(2026, 11, 10), monthly(1)).toRule().getLastDayOfMonth()).isFalse();
    }

    @Test
    void everySecondMonthSkipsTheMonthsBetweenInBothModes() {
        assertThat(dates(of(2026, 11, 1), nth(WeekOfMonth.THIRD, Weekday.WEDNESDAY).interval(2), of(2027, 3, 31)))
                .containsExactly(of(2026, 11, 18), of(2027, 1, 20), of(2027, 3, 17));
        assertThat(dates(of(2026, 11, 15), monthly(2), of(2027, 3, 31)))
                .containsExactly(of(2026, 11, 15), of(2027, 1, 15), of(2027, 3, 15));
    }

    @Test
    void weeklyIsAnchoredToTheMondayOfTheFirstWeek() {
        JobRecurrenceRule rule = new JobRecurrenceRule().frequency(WEEKLY).interval(2)
                .weekdays(EnumSet.of(Weekday.MONDAY, Weekday.THURSDAY));
        assertThat(dates(of(2026, 10, 7), rule, of(2026, 11, 3)))
                .containsExactly(of(2026, 10, 8), of(2026, 10, 19), of(2026, 10, 22), of(2026, 11, 2));
    }

    @Test
    void aLaterWindowGivesTheSameDatesAsTheWholeRange() {
        RecurrencePattern pattern = RecurrencePattern.of(of(2026, 11, 1), nth(WeekOfMonth.LAST, Weekday.FRIDAY));
        List<LocalDate> whole = pattern.datesBetween(of(2026, 11, 1), of(2027, 6, 30), CAP);
        List<LocalDate> later = pattern.datesBetween(of(2027, 2, 1), of(2027, 6, 30), CAP);
        assertThat(whole).endsWith(later.toArray(LocalDate[]::new));
        // Before the anchor nothing is produced.
        assertThat(pattern.datesBetween(of(2026, 9, 1), of(2026, 10, 31), CAP)).isEmpty();
    }

    @Test
    void theCapIsAllowedExactlyAndRefusedByOne() {
        RecurrencePattern daily = RecurrencePattern.of(of(2026, 11, 1), new JobRecurrenceRule().frequency(WEEKLY).interval(1)
                .weekdays(EnumSet.allOf(Weekday.class)));
        assertThat(daily.datesBetween(of(2026, 11, 1), of(2026, 11, 10), 10)).hasSize(10);
        assertThat(field(() -> daily.datesBetween(of(2026, 11, 1), of(2026, 11, 11), 10))).isEqualTo("recurrence.endDate");
    }

    @Test
    void theStoredRowRoundTripsToTheSamePatternAndRule() {
        for (JobRecurrenceRule rule : List.of(nth(WeekOfMonth.LAST, Weekday.FRIDAY), monthly(3).dayOfMonth(31),
                new JobRecurrenceRule().frequency(WEEKLY).interval(1).weekdays(EnumSet.of(Weekday.TUESDAY)))) {
            RecurrencePattern pattern = RecurrencePattern.of(of(2026, 11, 3), rule);
            JobRecurrenceEntity row = new JobRecurrenceEntity();
            pattern.applyTo(row);
            assertThat(row.firstDate).isEqualTo(of(2026, 11, 3));
            assertThat(RecurrencePattern.of(row)).isEqualTo(pattern);
            assertThat(RecurrencePattern.of(row).toRule()).isEqualTo(pattern.toRule());
        }
    }

    @Test
    void invalidRulesNameTheField() {
        LocalDate first = of(2026, 11, 1);
        assertThat(field(() -> RecurrencePattern.of(first, monthly(1).monthlyBy(WEEKDAY_OF_MONTH).weekday(Weekday.MONDAY))))
                .isEqualTo("recurrence.weekOfMonth");
        assertThat(field(() -> RecurrencePattern.of(first, monthly(1).monthlyBy(WEEKDAY_OF_MONTH).weekOfMonth(WeekOfMonth.FIRST))))
                .isEqualTo("recurrence.weekday");
        assertThat(field(() -> RecurrencePattern.of(first, nth(WeekOfMonth.FIRST, Weekday.MONDAY).dayOfMonth(3))))
                .isEqualTo("recurrence.dayOfMonth");
        assertThat(field(() -> RecurrencePattern.of(first, monthly(1).weekOfMonth(WeekOfMonth.FIRST))))
                .isEqualTo("recurrence.weekOfMonth");
        assertThat(field(() -> RecurrencePattern.of(first, monthly(1).lastDayOfMonth(true).dayOfMonth(15))))
                .isEqualTo("recurrence.dayOfMonth");
        assertThat(field(() -> RecurrencePattern.of(first, monthly(1).weekdays(EnumSet.of(Weekday.MONDAY)))))
                .isEqualTo("recurrence.weekdays");
        assertThat(field(() -> RecurrencePattern.of(first, new JobRecurrenceRule().frequency(WEEKLY).interval(1))))
                .isEqualTo("recurrence.weekdays");
        assertThat(field(() -> RecurrencePattern.of(first, new JobRecurrenceRule().frequency(WEEKLY).interval(1)
                .weekdays(EnumSet.of(Weekday.MONDAY)).dayOfMonth(4)))).isEqualTo("recurrence.dayOfMonth");
        assertThat(field(() -> RecurrencePattern.of(first, new JobRecurrenceRule().frequency(WEEKLY).interval(1)
                .weekdays(EnumSet.of(Weekday.MONDAY)).monthlyBy(DAY_OF_MONTH)))).isEqualTo("recurrence.monthlyBy");
        assertThatThrownBy(() -> RecurrencePattern.of(first, new JobRecurrenceRule().interval(1)))
                .isInstanceOf(KlokkaException.class).hasMessageContaining("recurrence.frequency");
    }
}
