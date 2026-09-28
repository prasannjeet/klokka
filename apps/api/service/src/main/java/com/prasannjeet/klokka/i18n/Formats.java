package com.prasannjeet.klokka.i18n;

import com.prasannjeet.klokka.contract.model.Language;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.Currency;
import java.util.Locale;

// Locale-aware rendering of the numbers and dates that go into notification and email text. Presentation only;
// every figure is computed elsewhere.
public final class Formats {

    private Formats() {}

    public static Locale locale(Language language) {
        return language == Language.SV ? Locale.forLanguageTag("sv-SE") : Locale.forLanguageTag("en-GB");
    }

    // 22.50 -> "22,5" (sv) / "22.5" (en); 8.00 -> "8".
    public static String number(BigDecimal value, Language language) {
        NumberFormat format = NumberFormat.getNumberInstance(locale(language));
        format.setMinimumFractionDigits(0);
        format.setMaximumFractionDigits(2);
        format.setGroupingUsed(true);
        return format.format(value.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros());
    }

    public static String hours(BigDecimal value, Language language, Catalogue catalogue) {
        return catalogue.t(language, Text.HOURS_VALUE.key(), java.util.Map.of("hours", number(value, language)));
    }

    // 15840 SEK -> "15 840 kr" (sv) / "SEK 15,840" (en).
    public static String money(BigDecimal value, String currencyCode, Language language) {
        NumberFormat format = NumberFormat.getCurrencyInstance(locale(language));
        format.setCurrency(Currency.getInstance(currencyCode));
        format.setMinimumFractionDigits(0);
        format.setMaximumFractionDigits(2);
        return format.format(value.setScale(2, RoundingMode.HALF_UP));
    }

    // "september 2026" (sv) / "September 2026" (en).
    public static String month(YearMonth month, Language language) {
        String name = month.getMonth().getDisplayName(TextStyle.FULL_STANDALONE, locale(language));
        return name + " " + month.getYear();
    }

    // "ons 23 sep." (sv) / "Wed 23 Sept" (en).
    // Swedish abbreviates months with a period ("24 sep."); dropped, since these dates end sentences in the
    // notifications ("flaggade tors 24 sep.." on staging) and "24 sep" reads fine anywhere.
    public static String shortDate(LocalDate date, Language language) {
        String text = date.format(DateTimeFormatter.ofPattern("EEE d MMM", locale(language)));
        return text.endsWith(".") ? text.substring(0, text.length() - 1) : text;
    }

    public static String longDate(LocalDate date, Language language) {
        return date.format(DateTimeFormatter.ofPattern("d MMMM yyyy", locale(language)));
    }
}
