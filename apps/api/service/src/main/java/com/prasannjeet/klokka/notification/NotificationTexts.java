package com.prasannjeet.klokka.notification;

import static com.prasannjeet.klokka.i18n.Formats.hours;
import static com.prasannjeet.klokka.i18n.Formats.longDate;
import static com.prasannjeet.klokka.i18n.Formats.money;
import static com.prasannjeet.klokka.i18n.Formats.number;
import static com.prasannjeet.klokka.i18n.Formats.shortDate;

import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.contract.model.NotificationKind;
import com.prasannjeet.klokka.i18n.Catalogue;
import com.prasannjeet.klokka.i18n.Formats;
import com.prasannjeet.klokka.i18n.Text;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

// Turns a notification's payload into the recipient's title, body and detail, in their language (D2). The
// payload is the only input, so a push sent later and the in-app list say the same thing.
@ApplicationScoped
public class NotificationTexts {

    public record Rendered(String title, String body, String detail) {}

    @Inject
    Catalogue catalogue;

    public Rendered render(NotificationKind kind, Map<String, Object> payload, Language lang, String currency) {
        return switch (kind) {
            case HOURS_CHANGED -> hoursChanged(payload, lang);
            case INVITE_ACCEPTED -> new Rendered(
                    t(lang, Text.INVITE_ACCEPTED_TITLE, Map.of("name", str(payload, "actorName"))),
                    t(lang, Text.INVITE_ACCEPTED_BODY, Map.of("name", str(payload, "actorName"), "workspace", str(payload, "workspaceName"))),
                    null);
            case ENTRY_FLAGGED -> {
                String date = shortDate(LocalDate.parse(str(payload, "date")), lang);
                BigDecimal suggested = decimal(payload.get("suggestedHours"));
                String body = suggested == null ? str(payload, "message")
                        : t(lang, Text.ENTRY_FLAGGED_BODY, Map.of("logged", hours(decimal(payload.get("loggedHours")), lang, catalogue),
                                "name", str(payload, "actorName"), "suggested", hours(suggested, lang, catalogue)));
                yield new Rendered(t(lang, Text.ENTRY_FLAGGED_TITLE, Map.of("name", str(payload, "actorName"), "date", date)),
                        body, suggested == null ? null : str(payload, "message"));
            }
            case FLAG_RESOLVED -> {
                String date = shortDate(LocalDate.parse(str(payload, "date")), lang);
                String hoursText = hours(decimal(payload.get("hours")), lang, catalogue);
                if ("FIX".equals(payload.get("action"))) {
                    yield new Rendered(t(lang, Text.FLAG_FIXED_TITLE, Map.of("name", str(payload, "actorName"))),
                            t(lang, Text.FLAG_FIXED_BODY, Map.of("date", date, "hours", hoursText)), strOrNull(payload, "note"));
                }
                yield new Rendered(t(lang, Text.FLAG_DISMISSED_TITLE, Map.of("name", str(payload, "actorName"), "date", date, "hours", hoursText)),
                        t(lang, Text.FLAG_DISMISSED_BODY, Map.of()), strOrNull(payload, "note"));
            }
            case MONTH_CLOSED -> {
                String month = Formats.month(YearMonth.parse(str(payload, "month")), lang);
                String hoursText = hours(decimal(payload.get("hours")), lang, catalogue);
                BigDecimal moneyValue = decimal(payload.get("money"));
                String body = moneyValue == null ? t(lang, Text.MONTH_CLOSED_BODY_HOURS_ONLY, Map.of("hours", hoursText))
                        : t(lang, Text.MONTH_CLOSED_BODY, Map.of("hours", hoursText, "money", money(moneyValue, currency, lang)));
                yield new Rendered(t(lang, Text.MONTH_CLOSED_TITLE, Map.of("month", capitalize(month))), body,
                        t(lang, Text.MONTH_CLOSED_HINT, Map.of("name", str(payload, "actorName"))));
            }
            case MONTH_REOPENED -> {
                String month = Formats.month(YearMonth.parse(str(payload, "month")), lang);
                yield new Rendered(t(lang, Text.MONTH_REOPENED_TITLE, Map.of("month", capitalize(month))),
                        t(lang, Text.MONTH_REOPENED_BODY, Map.of("name", str(payload, "actorName"))), null);
            }
        };
    }

    // One sitting's changes: {date -> {before, after}}. A single create, update or removal gets its own wording;
    // anything bigger becomes "{name} added N days, H h" with the week or the date range as the body.
    private Rendered hoursChanged(Map<String, Object> payload, Language lang) {
        String name = str(payload, "actorName");
        TreeMap<LocalDate, BigDecimal[]> changes = changes(payload);
        if (changes.isEmpty()) return new Rendered(t(lang, Text.HOURS_ADDED_TITLE.key() + "_other", Map.of("name", name, "count", "0", "hours", "0")), "", null);
        if (changes.size() == 1) {
            var entry = changes.firstEntry();
            LocalDate date = entry.getKey();
            BigDecimal before = entry.getValue()[0];
            BigDecimal after = entry.getValue()[1];
            String dateText = shortDate(date, lang);
            if (before != null && after == null) {
                return new Rendered(t(lang, Text.HOURS_REMOVED_TITLE, Map.of("name", name, "date", dateText)),
                        t(lang, Text.HOURS_REMOVED_BODY, Map.of("hours", hours(before, lang, catalogue))), null);
            }
            if (before != null && after != null) {
                String note = strOrNull(payload, "note");
                return new Rendered(t(lang, Text.HOURS_CHANGED_TITLE, Map.of("name", name, "date", dateText)),
                        t(lang, Text.HOURS_CHANGED_BODY, Map.of("before", hours(before, lang, catalogue), "after", hours(after, lang, catalogue))),
                        note == null ? null : t(lang, Text.HOURS_CHANGED_NOTE, Map.of("note", note)));
            }
            BigDecimal total = after == null ? BigDecimal.ZERO : after;
            return new Rendered(catalogue.plural(lang, Text.HOURS_ADDED_TITLE.key(), 1, Map.of("name", name, "hours", number(total, lang))),
                    t(lang, Text.HOURS_ADDED_BODY, Map.of("hours", hours(total, lang, catalogue), "week", Integer.toString(date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)))),
                    longDate(date, lang));
        }
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal takenOff = BigDecimal.ZERO;
        int removed = 0;
        for (BigDecimal[] change : changes.values()) {
            if (change[1] != null) total = total.add(change[1]);
            else if (change[0] != null) {
                removed++;
                takenOff = takenOff.add(change[0]);
            }
        }
        LocalDate from = changes.firstKey();
        LocalDate to = changes.lastKey();
        String range = t(lang, Text.HOURS_ADDED_RANGE, Map.of("from", shortDate(from, lang), "to", shortDate(to, lang)));
        // A sitting that only cleared days is a removal, not "added N days, 0 h" (staging, after two deletes).
        if (removed == changes.size()) {
            return new Rendered(catalogue.plural(lang, Text.HOURS_REMOVED_MANY_TITLE.key(), removed, Map.of("name", name)),
                    t(lang, Text.HOURS_REMOVED_BODY, Map.of("hours", hours(takenOff, lang, catalogue))), range);
        }
        int weekFrom = from.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        int weekTo = to.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        String title = catalogue.plural(lang, Text.HOURS_ADDED_TITLE.key(), changes.size(), Map.of("name", name, "hours", number(total, lang)));
        String body = weekFrom == weekTo && from.getYear() == to.getYear()
                ? t(lang, Text.HOURS_ADDED_BODY, Map.of("hours", hours(total, lang, catalogue), "week", Integer.toString(weekFrom)))
                : range;
        return new Rendered(title, body, range);
    }

    @SuppressWarnings("unchecked")
    static TreeMap<LocalDate, BigDecimal[]> changes(Map<String, Object> payload) {
        TreeMap<LocalDate, BigDecimal[]> out = new TreeMap<>();
        Object raw = payload.get("changes");
        if (!(raw instanceof Map<?, ?> map)) return out;
        for (Map.Entry<?, ?> e : map.entrySet()) {
            Map<String, Object> change = (Map<String, Object>) e.getValue();
            out.put(LocalDate.parse(e.getKey().toString()), new BigDecimal[] {decimal(change.get("before")), decimal(change.get("after"))});
        }
        return out;
    }

    // What the contract's `payload` shows: the raw facts, with derived days/hours/from/to for HOURS_CHANGED.
    public Map<String, Object> publicPayload(NotificationKind kind, Map<String, Object> payload) {
        Map<String, Object> out = new HashMap<>(payload);
        if (kind == NotificationKind.HOURS_CHANGED) {
            TreeMap<LocalDate, BigDecimal[]> changes = changes(payload);
            BigDecimal total = BigDecimal.ZERO;
            List<Map<String, Object>> list = new ArrayList<>();
            for (var e : changes.entrySet()) {
                if (e.getValue()[1] != null) total = total.add(e.getValue()[1]);
                Map<String, Object> item = new HashMap<>();
                item.put("date", e.getKey().toString());
                item.put("before", e.getValue()[0]);
                item.put("after", e.getValue()[1]);
                list.add(item);
            }
            out.put("changes", list);
            out.put("days", changes.size());
            out.put("hours", total);
            if (!changes.isEmpty()) {
                out.put("from", changes.firstKey().toString());
                out.put("to", changes.lastKey().toString());
                out.put("isoWeek", changes.firstKey().get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
            }
        }
        return out;
    }

    private String t(Language lang, Text text, Map<String, ?> params) {
        return catalogue.t(lang, text.key(), params);
    }

    private String t(Language lang, String key, Map<String, ?> params) {
        return catalogue.t(lang, key, params);
    }

    static String str(Map<String, Object> payload, String key) {
        Object v = payload.get(key);
        return v == null ? "" : v.toString();
    }

    static String strOrNull(Map<String, Object> payload, String key) {
        Object v = payload.get(key);
        return v == null || v.toString().isBlank() ? null : v.toString();
    }

    static BigDecimal decimal(Object value) {
        if (value == null) return null;
        if (value instanceof BigDecimal d) return d;
        return new BigDecimal(value.toString());
    }

    private static String capitalize(String s) {
        return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
