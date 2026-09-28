package com.prasannjeet.klokka.month;

import static com.prasannjeet.klokka.error.KlokkaException.validation;

import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.List;

// Month arithmetic every read model shares: "today" in the workspace time zone, working days (Monday to Friday),
// ISO weeks clipped to the month.
public final class Months {

    public record Week(int isoWeek, LocalDate from, LocalDate to) {}

    private Months() {}

    public static ZoneId zone(WorkspaceEntity workspace) {
        return ZoneId.of(workspace.timezone);
    }

    public static LocalDate today(WorkspaceEntity workspace, Clock clock) {
        return LocalDate.now(clock.withZone(zone(workspace)));
    }

    public static YearMonth current(WorkspaceEntity workspace, Clock clock) {
        return YearMonth.from(today(workspace, clock));
    }

    public static YearMonth parseOrCurrent(String month, WorkspaceEntity workspace, Clock clock) {
        if (month == null || month.isBlank()) return current(workspace, clock);
        return parse(month);
    }

    public static YearMonth parse(String month) {
        try {
            return YearMonth.parse(month);
        } catch (DateTimeParseException e) {
            throw validation("month", "must be yyyy-MM");
        }
    }

    public static boolean workingDay(LocalDate date) {
        return date.getDayOfWeek() != DayOfWeek.SATURDAY && date.getDayOfWeek() != DayOfWeek.SUNDAY;
    }

    public static int workingDays(LocalDate from, LocalDate to) {
        int n = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) if (workingDay(d)) n++;
        return n;
    }

    public static int workingDays(YearMonth month) {
        return workingDays(month.atDay(1), month.atEndOfMonth());
    }

    // The last day that counts as elapsed: today for the current month, the last day for a past month, none for a
    // future month.
    public static LocalDate asOf(YearMonth month, LocalDate today) {
        if (YearMonth.from(today).equals(month)) return today;
        return today.isAfter(month.atEndOfMonth()) ? month.atEndOfMonth() : month.atDay(1).minusDays(1);
    }

    public static int elapsedWorkingDays(YearMonth month, LocalDate asOf) {
        if (asOf.isBefore(month.atDay(1))) return 0;
        return workingDays(month.atDay(1), asOf);
    }

    public static List<Week> weeks(YearMonth month) {
        List<Week> weeks = new ArrayList<>();
        LocalDate from = month.atDay(1);
        LocalDate end = month.atEndOfMonth();
        while (!from.isAfter(end)) {
            LocalDate weekEnd = from.with(DayOfWeek.SUNDAY);
            LocalDate to = weekEnd.isAfter(end) ? end : weekEnd;
            weeks.add(new Week(from.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR), from, to));
            from = to.plusDays(1);
        }
        return weeks;
    }
}
