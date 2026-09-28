package com.prasannjeet.klokka.month;

import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.i18n.Catalogue;
import com.prasannjeet.klokka.i18n.Formats;
import com.prasannjeet.klokka.i18n.Text;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.List;

// CSV as Swedish Excel opens it: UTF-8 with BOM, `;` separator, CRLF, numbers in the reader's locale (a comma
// decimal for sv), fields quoted when they contain a separator, a quote or a line break (CHQ-129). Free text
// (a person's name, a note) never becomes a formula: see text().
public final class CsvExport {

    public static final String BOM = "﻿";
    private static final String SEP = ";";
    private static final String EOL = "\r\n";
    // A cell starting with one of these is evaluated by Excel, LibreOffice and Numbers (a tab or a carriage
    // return before the sign counts too).
    private static final String FORMULA_STARTS = "=+-@\t\r";

    public record Row(LocalDate date, String member, BigDecimal hours, String note, BigDecimal rate, BigDecimal amount) {}

    private CsvExport() {}

    public static String render(List<Row> rows, boolean withPay, Language language, Catalogue catalogue) {
        NumberFormat numbers = NumberFormat.getNumberInstance(Formats.locale(language));
        numbers.setMinimumFractionDigits(0);
        numbers.setMaximumFractionDigits(2);
        numbers.setGroupingUsed(false);
        StringBuilder out = new StringBuilder(BOM);
        out.append(join(catalogue.t(language, Text.CSV_DATE.key()), catalogue.t(language, Text.CSV_WEEKDAY.key()),
                catalogue.t(language, Text.CSV_MEMBER.key()), catalogue.t(language, Text.CSV_HOURS.key()),
                catalogue.t(language, Text.CSV_NOTE.key())));
        if (withPay) out.append(SEP).append(join(catalogue.t(language, Text.CSV_RATE.key()), catalogue.t(language, Text.CSV_AMOUNT.key())));
        out.append(EOL);
        for (Row row : rows) {
            String weekday = row.date().getDayOfWeek().getDisplayName(TextStyle.FULL, Formats.locale(language));
            out.append(join(row.date().toString(), weekday, text(row.member()), numbers.format(row.hours()),
                    row.note() == null ? "" : text(row.note())));
            if (withPay) {
                out.append(SEP).append(join(row.rate() == null ? "" : numbers.format(row.rate()),
                        row.amount() == null ? "" : numbers.format(row.amount())));
            }
            out.append(EOL);
        }
        return out.toString();
    }

    private static String join(String... fields) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < fields.length; i++) {
            if (i > 0) b.append(SEP);
            b.append(quote(fields[i]));
        }
        return b.toString();
    }

    // Text a person typed (a display name, a note) as text: a leading apostrophe is how every spreadsheet marks a
    // cell as "not a formula" (CWE-1236), so `=HYPERLINK(...)` in a name never runs on the employer's machine.
    static String text(String field) {
        return !field.isEmpty() && FORMULA_STARTS.indexOf(field.charAt(0)) >= 0 ? "'" + field : field;
    }

    private static String quote(String field) {
        if (field.contains(SEP) || field.contains("\"") || field.contains("\n") || field.contains("\r")) {
            return "\"" + field.replace("\"", "\"\"") + "\"";
        }
        return field;
    }
}
