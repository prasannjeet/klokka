package com.prasannjeet.klokka.mail;

import static org.assertj.core.api.Assertions.assertThat;

import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.i18n.Catalogue;
import com.prasannjeet.klokka.i18n.TestCatalogue;
import com.prasannjeet.klokka.persistence.JobRepository.WeekJob;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.ReadingOptions;
import org.dhatim.fastexcel.reader.Row;
import org.dhatim.fastexcel.reader.Sheet;
import org.junit.jupiter.api.Test;

// The digest's workbook (CHQ-189), read back with fastexcel-reader: sheets, headers, one row per job in order, totals,
// the Hours sheet and when Pay appears.
class DigestWorkbookTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 19);
    private static final UUID ANNA = UUID.randomUUID();
    private static final UUID MARIA = UUID.randomUUID();

    private final Catalogue catalogue = TestCatalogue.load();

    @Test
    void theEmployerWorkbookListsEveryJobWithTotalsAndPay() throws IOException {
        DigestWeek week = new DigestWeek(workspace(true), true, MONDAY, List.of(
                new WeekJob(ANNA, "Anna Berg", MONDAY, LocalTime.of(9, 0), new BigDecimal("4.00"), "Café Nord", "Storgatan 1", null, true),
                new WeekJob(ANNA, "Anna Berg", MONDAY.plusDays(2), null, new BigDecimal("2.50"), null, null, "Inventory", false),
                new WeekJob(MARIA, "Maria Lind", MONDAY, LocalTime.of(8, 0), new BigDecimal("3.00"), "Kafé Syd", null, null, false),
                new WeekJob(MARIA, "Maria Lind", MONDAY, LocalTime.of(13, 30), new BigDecimal("1.50"), "Café Nord", null, "=HYPERLINK(\"x\")", false)),
                List.of(new DigestWeek.Member(ANNA, "Anna Berg", new BigDecimal("150.00")), new DigestWeek.Member(MARIA, "Maria Lind", null)),
                true);

        try (ReadableWorkbook workbook = read(week, Language.EN)) {
            assertThat(workbook.getSheets().map(Sheet::getName).toList()).containsExactly("Jobs", "Hours");
            List<Row> jobs = rows(workbook, "Jobs");
            assertThat(texts(jobs.get(0), 10)).containsExactly("Employee", "Date", "Weekday", "Start", "End", "Hours", "Place", "Address", "Note",
                    "Recurring");
            assertThat(jobs).hasSize(7);
            // Anna's job at Café Nord: a real date, time cells, two-decimal hours, recurring.
            Row first = jobs.get(1);
            assertThat(first.getCellText(0)).isEqualTo("Anna Berg");
            assertThat(first.getCellAsDate(1)).contains(LocalDateTime.of(2026, 10, 19, 0, 0));
            assertThat(first.getCell(1).getDataFormatString()).isEqualTo("yyyy-mm-dd");
            assertThat(first.getCellText(2)).isEqualTo("Monday");
            assertThat(first.getCellAsDate(3).orElseThrow().toLocalTime()).isEqualTo(LocalTime.of(9, 0));
            assertThat(first.getCellAsDate(4).orElseThrow().toLocalTime()).isEqualTo(LocalTime.of(13, 0));
            assertThat(number(first, 5)).isEqualTo("4");
            assertThat(first.getCell(5).getDataFormatString()).isEqualTo("0.00");
            assertThat(texts(first, 10).subList(6, 10)).containsExactly("Café Nord", "Storgatan 1", "", "Yes");
            // A day without jobs is one row with the day's hours and note, no start or place.
            Row noJobs = jobs.get(2);
            assertThat(noJobs.getCellText(2)).isEqualTo("Wednesday");
            assertThat(noJobs.getCellText(3)).isEmpty();
            assertThat(number(noJobs, 5)).isEqualTo("2.5");
            assertThat(noJobs.getCellText(8)).isEqualTo("Inventory");
            assertThat(noJobs.getCellText(9)).isEqualTo("No");
            // Anna's total row, then Maria's two jobs (by start time) and her total.
            assertThat(jobs.get(3).getCellText(0)).isEqualTo("Anna Berg");
            assertThat(jobs.get(3).getCellText(1)).isEqualTo("Total");
            assertThat(number(jobs.get(3), 5)).isEqualTo("6.5");
            assertThat(jobs.get(4).getCellText(6)).isEqualTo("Kafé Syd");
            assertThat(jobs.get(5).getCellText(6)).isEqualTo("Café Nord");
            // Typed text stays a string cell, never a formula.
            assertThat(jobs.get(5).getCellText(8)).isEqualTo("=HYPERLINK(\"x\")");
            assertThat(jobs.get(5).getCell(8).getFormula()).isNull();
            assertThat(jobs.get(6).getCellText(1)).isEqualTo("Total");
            assertThat(number(jobs.get(6), 5)).isEqualTo("4.5");

            List<Row> hours = rows(workbook, "Hours");
            assertThat(texts(hours.get(0), 10)).containsExactly("Employee", "Mon 19/10", "Tue 20/10", "Wed 21/10", "Thu 22/10", "Fri 23/10",
                    "Sat 24/10", "Sun 25/10", "Week total", "Pay (SEK)");
            assertThat(hours).hasSize(4);
            assertThat(hours.get(1).getCellText(0)).isEqualTo("Anna Berg");
            assertThat(numbers(hours.get(1), 1, 9)).containsExactly("4", "0", "2.5", "0", "0", "0", "0", "6.5");
            assertThat(number(hours.get(1), 9)).isEqualTo("975");
            // Maria has no rate: no pay for her, the team row sums what there is.
            assertThat(hours.get(2).getCellText(9)).isEmpty();
            assertThat(hours.get(3).getCellText(0)).isEqualTo("Whole team");
            assertThat(numbers(hours.get(3), 1, 9)).containsExactly("8.5", "0", "2.5", "0", "0", "0", "0", "11");
            assertThat(number(hours.get(3), 9)).isEqualTo("975");
        }
    }

    @Test
    void withoutPayTheHoursSheetHasNoPayColumn() throws IOException {
        DigestWeek week = new DigestWeek(workspace(false), true, MONDAY,
                List.of(new WeekJob(ANNA, "Anna Berg", MONDAY, null, new BigDecimal("8.00"), null, null, null, false)),
                List.of(new DigestWeek.Member(ANNA, "Anna Berg", new BigDecimal("150.00"))), false);
        try (ReadableWorkbook workbook = read(week, Language.SV)) {
            assertThat(workbook.getSheets().map(Sheet::getName).toList()).containsExactly("Jobb", "Timmar");
            List<Row> hours = rows(workbook, "Timmar");
            assertThat(hours.get(0).getCellCount()).isEqualTo(9);
            assertThat(hours.get(0).getCellText(1)).isEqualTo("Mån 19/10");
            assertThat(hours.get(0).getCellText(8)).isEqualTo("Veckan totalt");
            assertThat(hours.get(2).getCellText(0)).isEqualTo("Hela teamet");
        }
    }

    @Test
    void theEmployeeWorkbookHasOnlyTheirRowsAndNoTeamRow() throws IOException {
        List<WeekJob> own = List.of(new WeekJob(MARIA, "Maria Lind", MONDAY.plusDays(4), LocalTime.of(10, 0), new BigDecimal("6.00"), "Kafé Syd",
                null, null, false));
        List<DigestWeek.Member> self = List.of(new DigestWeek.Member(MARIA, "Maria Lind", new BigDecimal("170.00")));
        // Pay on and an own rate: the employee sees their pay.
        try (ReadableWorkbook workbook = read(new DigestWeek(workspace(true), false, MONDAY, own, self, true), Language.EN)) {
            assertThat(rows(workbook, "Jobs")).hasSize(3);
            List<Row> hours = rows(workbook, "Hours");
            assertThat(hours).hasSize(2);
            assertThat(hours.get(1).getCellText(0)).isEqualTo("Maria Lind");
            assertThat(number(hours.get(1), 9)).isEqualTo("1020");
        }
        // Pay off (or no own rate, which the caller turns into withPay = false): hours only.
        try (ReadableWorkbook workbook = read(new DigestWeek(workspace(false), false, MONDAY, own, self, false), Language.EN)) {
            List<Row> hours = rows(workbook, "Hours");
            assertThat(hours).hasSize(2);
            assertThat(hours.get(0).getCellCount()).isEqualTo(9);
        }
    }

    @Test
    void aNightJobEndsAfterMidnight() throws IOException {
        DigestWeek week = new DigestWeek(workspace(false), false, MONDAY,
                List.of(new WeekJob(MARIA, "Maria Lind", MONDAY, LocalTime.of(22, 0), new BigDecimal("3.75"), null, null, null, false)),
                List.of(new DigestWeek.Member(MARIA, "Maria Lind", null)), false);
        try (ReadableWorkbook workbook = read(week, Language.EN)) {
            assertThat(rows(workbook, "Jobs").get(1).getCellAsDate(4).orElseThrow().toLocalTime()).isEqualTo(LocalTime.of(1, 45));
        }
        assertThat(DigestWorkbook.fileName(week)).isEqualTo("klokka-cafe-nord-2026-W43.xlsx");
    }

    private ReadableWorkbook read(DigestWeek week, Language lang) throws IOException {
        byte[] bytes = DigestWorkbook.build(week, lang, catalogue);
        return new ReadableWorkbook(new ByteArrayInputStream(bytes), new ReadingOptions(true, false));
    }

    private static List<Row> rows(ReadableWorkbook workbook, String sheet) throws IOException {
        return workbook.findSheet(sheet).orElseThrow().read();
    }

    private static List<String> texts(Row row, int columns) {
        List<String> out = new ArrayList<>();
        for (int c = 0; c < columns; c++) out.add(row.getCellText(c));
        return out;
    }

    private static String number(Row row, int column) {
        return row.getCellAsNumber(column).orElseThrow().stripTrailingZeros().toPlainString();
    }

    private static List<String> numbers(Row row, int from, int to) {
        List<String> out = new ArrayList<>();
        for (int c = from; c < to; c++) out.add(row.getCellAsNumber(c).orElseThrow().stripTrailingZeros().toPlainString());
        return out;
    }

    private static WorkspaceEntity workspace(boolean showPay) {
        WorkspaceEntity ws = new WorkspaceEntity();
        ws.id = UUID.randomUUID();
        ws.name = "Café Nord";
        ws.slug = "cafe-nord";
        ws.currency = "SEK";
        ws.timezone = "Europe/Stockholm";
        ws.showPay = showPay;
        return ws;
    }
}
