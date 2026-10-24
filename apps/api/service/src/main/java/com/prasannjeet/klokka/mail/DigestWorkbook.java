package com.prasannjeet.klokka.mail;

import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.i18n.Catalogue;
import com.prasannjeet.klokka.i18n.Formats;
import com.prasannjeet.klokka.i18n.Text;
import com.prasannjeet.klokka.persistence.JobRepository.WeekJob;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.IsoFields;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.dhatim.fastexcel.Workbook;
import org.dhatim.fastexcel.Worksheet;

// Last week of one workspace as an Excel workbook (CHQ-189), attached to the digest: a "Jobs" sheet with one row per
// job (a day without jobs is one row) and a bold total per person, and an "Hours" sheet with each person's hours per
// day, the week total, pay when it may be shown, and (employer only) the team's total. Text a person typed is written
// as string cells, which Excel never evaluates, so a name like `=HYPERLINK(...)` stays text.
public final class DigestWorkbook {

    public static final String CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private static final String DATE_FORMAT = "yyyy-mm-dd";
    private static final String TIME_FORMAT = "hh:mm";
    private static final String HOURS_FORMAT = "0.00";
    private static final String PAY_FORMAT = "#,##0.00";
    private static final int MIN_WIDTH = 8;
    private static final int MAX_WIDTH = 50;
    private static final int DATE_WIDTH = 10;
    private static final int TIME_WIDTH = 5;
    private static final int NUMBER_WIDTH = 8;
    private static final double SECONDS_PER_DAY = 86_400.0;

    private DigestWorkbook() {}

    // klokka-<workspace slug>-<ISO year>-W<week>.xlsx
    public static String fileName(DigestWeek week) {
        LocalDate monday = week.monday();
        return "klokka-" + week.workspace().slug + "-" + monday.get(IsoFields.WEEK_BASED_YEAR) + "-W"
                + String.format(Locale.ROOT, "%02d", monday.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)) + ".xlsx";
    }

    public static byte[] build(DigestWeek week, Language lang, Catalogue catalogue) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (Workbook workbook = new Workbook(out, "Klokka", "1.0")) {
            jobsSheet(workbook.newWorksheet(catalogue.t(lang, Text.XLSX_SHEET_JOBS.key())), week, lang, catalogue);
            hoursSheet(workbook.newWorksheet(catalogue.t(lang, Text.XLSX_SHEET_HOURS.key())), week, lang, catalogue);
        } catch (IOException e) {
            throw new UncheckedIOException("could not write the digest workbook for " + week.workspace().slug, e);
        }
        return out.toByteArray();
    }

    private static void jobsSheet(Worksheet sheet, DigestWeek week, Language lang, Catalogue catalogue) {
        Locale locale = Formats.locale(lang);
        Text[] headers = {Text.XLSX_EMPLOYEE, Text.XLSX_DATE, Text.XLSX_WEEKDAY, Text.XLSX_START, Text.XLSX_END, Text.XLSX_HOURS,
                Text.XLSX_PLACE, Text.XLSX_ADDRESS, Text.XLSX_NOTE, Text.XLSX_RECURRING};
        Widths widths = new Widths(headers.length);
        for (int c = 0; c < headers.length; c++) headerCell(sheet, widths, c, catalogue.t(lang, headers[c].key()));
        String yes = catalogue.t(lang, Text.XLSX_YES.key());
        String no = catalogue.t(lang, Text.XLSX_NO.key());
        String total = catalogue.t(lang, Text.XLSX_TOTAL.key());
        int r = 1;
        for (DigestWeek.Member member : week.members()) {
            List<WeekJob> jobs = week.jobsOf(member.membershipId());
            if (jobs.isEmpty()) continue;
            for (WeekJob job : jobs) {
                text(sheet, widths, r, 0, job.memberName());
                sheet.value(r, 1, job.date());
                sheet.style(r, 1).format(DATE_FORMAT).set();
                widths.fit(1, DATE_WIDTH);
                text(sheet, widths, r, 2, job.date().getDayOfWeek().getDisplayName(TextStyle.FULL, locale));
                if (job.start() != null) {
                    time(sheet, widths, r, 3, job.start());
                    time(sheet, widths, r, 4, end(job.start(), job.hours()));
                }
                hours(sheet, widths, r, 5, job.hours(), false);
                text(sheet, widths, r, 6, job.placeName());
                text(sheet, widths, r, 7, job.placeAddress());
                text(sheet, widths, r, 8, job.note());
                text(sheet, widths, r, 9, job.recurring() ? yes : no);
                r++;
            }
            text(sheet, widths, r, 0, member.name());
            text(sheet, widths, r, 1, total);
            sheet.style(r, 0).bold().set();
            sheet.style(r, 1).bold().set();
            hours(sheet, widths, r, 5, week.total(member.membershipId()), true);
            r++;
        }
        finish(sheet, widths, r - 1);
    }

    private static void hoursSheet(Worksheet sheet, DigestWeek week, Language lang, Catalogue catalogue) {
        Locale locale = Formats.locale(lang);
        DateTimeFormatter weekday = DateTimeFormatter.ofPattern("EEE", locale);
        DateTimeFormatter dayMonth = DateTimeFormatter.ofPattern("d/M", locale);
        int payColumn = 9;
        int columns = week.withPay() ? 10 : 9;
        Widths widths = new Widths(columns);
        headerCell(sheet, widths, 0, catalogue.t(lang, Text.XLSX_EMPLOYEE.key()));
        for (int i = 0; i < 7; i++) {
            LocalDate date = week.monday().plusDays(i);
            String day = date.format(weekday).replace(".", "");
            day = day.substring(0, Math.min(3, day.length()));
            headerCell(sheet, widths, 1 + i, day.substring(0, 1).toUpperCase(locale) + day.substring(1) + " " + date.format(dayMonth));
        }
        headerCell(sheet, widths, 8, catalogue.t(lang, Text.XLSX_WEEK_TOTAL.key()));
        if (week.withPay()) headerCell(sheet, widths, payColumn, catalogue.t(lang, Text.XLSX_PAY.key(), Map.of("currency", week.workspace().currency)));
        int r = 1;
        // The team's pay is the sum of everyone's, or blank when someone with hours has no rate (a partial sum would
        // read as the whole team's).
        BigDecimal teamPay = null;
        boolean teamPayComplete = true;
        for (DigestWeek.Member member : week.members()) {
            text(sheet, widths, r, 0, member.name());
            int c = 1;
            for (BigDecimal value : week.hoursPerDay(member.membershipId()).values()) hours(sheet, widths, r, c++, value, false);
            BigDecimal total = week.total(member.membershipId());
            hours(sheet, widths, r, 8, total, true);
            if (week.withPay()) {
                BigDecimal pay = week.pay(member);
                if (pay != null) {
                    money(sheet, widths, r, payColumn, pay, false);
                    teamPay = teamPay == null ? pay : teamPay.add(pay);
                } else if (total.signum() > 0) {
                    teamPayComplete = false;
                }
            }
            r++;
        }
        if (week.employer()) {
            text(sheet, widths, r, 0, catalogue.t(lang, Text.XLSX_TEAM.key()));
            sheet.style(r, 0).bold().set();
            for (int i = 0; i < 7; i++) hours(sheet, widths, r, 1 + i, week.teamTotal(week.monday().plusDays(i)), true);
            hours(sheet, widths, r, 8, week.teamTotal(), true);
            if (week.withPay() && teamPay != null && teamPayComplete) {
                money(sheet, widths, r, payColumn, teamPay, true);
            }
            r++;
        }
        finish(sheet, widths, r - 1);
    }

    // The end of a job that starts at `start` and lasts `hours`, on a 24-hour clock (a night job wraps past midnight).
    static LocalTime end(LocalTime start, BigDecimal hours) {
        long minutes = hours.multiply(BigDecimal.valueOf(60)).setScale(0, RoundingMode.HALF_UP).longValueExact();
        return start.plusMinutes(minutes);
    }

    private static void headerCell(Worksheet sheet, Widths widths, int c, String value) {
        sheet.value(0, c, value);
        sheet.style(0, c).bold().set();
        widths.fit(c, value.length());
    }

    private static void text(Worksheet sheet, Widths widths, int r, int c, String value) {
        if (value == null || value.isEmpty()) return;
        sheet.value(r, c, value);
        widths.fit(c, value.length());
    }

    private static void time(Worksheet sheet, Widths widths, int r, int c, LocalTime value) {
        sheet.value(r, c, value.toSecondOfDay() / SECONDS_PER_DAY);
        sheet.style(r, c).format(TIME_FORMAT).set();
        widths.fit(c, TIME_WIDTH);
    }

    private static void hours(Worksheet sheet, Widths widths, int r, int c, BigDecimal value, boolean bold) {
        sheet.value(r, c, value.setScale(2, RoundingMode.HALF_UP));
        if (bold) sheet.style(r, c).format(HOURS_FORMAT).bold().set();
        else sheet.style(r, c).format(HOURS_FORMAT).set();
        widths.fit(c, NUMBER_WIDTH);
    }

    private static void money(Worksheet sheet, Widths widths, int r, int c, BigDecimal value, boolean bold) {
        sheet.value(r, c, value.setScale(2, RoundingMode.HALF_UP));
        if (bold) sheet.style(r, c).format(PAY_FORMAT).bold().set();
        else sheet.style(r, c).format(PAY_FORMAT).set();
        widths.fit(c, value.toPlainString().length() + 2);
    }

    // Header row frozen, a filter over the table, every column as wide as its longest value (capped).
    private static void finish(Worksheet sheet, Widths widths, int lastRow) {
        sheet.freezePane(0, 1);
        sheet.setAutoFilter(0, 0, Math.max(lastRow, 0), widths.size() - 1);
        for (int c = 0; c < widths.size(); c++) sheet.width(c, widths.width(c));
    }

    private static final class Widths {
        private final int[] longest;

        Widths(int columns) {
            longest = new int[columns];
        }

        void fit(int column, int length) {
            longest[column] = Math.max(longest[column], length);
        }

        int size() {
            return longest.length;
        }

        int width(int column) {
            return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, longest[column] + 2));
        }
    }
}
