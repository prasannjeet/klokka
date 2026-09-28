package com.prasannjeet.klokka.notification;

import static com.prasannjeet.klokka.i18n.Formats.hours;
import static com.prasannjeet.klokka.i18n.Formats.dayDate;
import static com.prasannjeet.klokka.i18n.Formats.money;
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

    // Title says who did what, body says where and which days (CHQ-145), the same for the push and the in-app
    // row; the business name leads the body, so a push needs no prefix.
    public Rendered render(NotificationKind kind, Map<String, Object> payload, Language lang, String workspaceName, String currency) {
        String where = workspaceName == null || workspaceName.isBlank() ? str(payload, "workspaceName") : workspaceName;
        String name = str(payload, "actorName");
        return switch (kind) {
            case HOURS_CHANGED -> hoursChanged(payload, lang, where);
            case INVITE_ACCEPTED -> new Rendered(
                    t(lang, Text.INVITE_ACCEPTED_TITLE, Map.of("name", name)),
                    t(lang, Text.INVITE_ACCEPTED_BODY, Map.of("name", name, "workspace", where)),
                    null);
            case ENTRY_FLAGGED -> {
                String date = dayDate(LocalDate.parse(str(payload, "date")), lang);
                BigDecimal suggested = decimal(payload.get("suggestedHours"));
                String message = str(payload, "message");
                String body = suggested == null
                        ? t(lang, Text.ENTRY_FLAGGED_BODY_MESSAGE, Map.of("workspace", where, "message", clip(message)))
                        : t(lang, Text.ENTRY_FLAGGED_BODY, Map.of("workspace", where,
                                "logged", hours(decimal(payload.get("loggedHours")), lang, catalogue), "suggested", hours(suggested, lang, catalogue)));
                yield new Rendered(t(lang, Text.ENTRY_FLAGGED_TITLE, Map.of("name", name, "date", date)), body,
                        suggested == null || message.isBlank() ? null : message);
            }
            case FLAG_RESOLVED -> {
                String date = shortDate(LocalDate.parse(str(payload, "date")), lang);
                String hoursText = hours(decimal(payload.get("hours")), lang, catalogue);
                Map<String, String> params = Map.of("workspace", where, "date", date, "hours", hoursText);
                if ("FIX".equals(payload.get("action"))) {
                    yield new Rendered(t(lang, Text.FLAG_FIXED_TITLE, Map.of("name", name)),
                            t(lang, Text.FLAG_FIXED_BODY, params), strOrNull(payload, "note"));
                }
                yield new Rendered(t(lang, Text.FLAG_DISMISSED_TITLE, Map.of("name", name)),
                        t(lang, Text.FLAG_DISMISSED_BODY, params), strOrNull(payload, "note"));
            }
            case MONTH_CLOSED -> {
                String month = Formats.month(YearMonth.parse(str(payload, "month")), lang);
                String hoursText = hours(decimal(payload.get("hours")), lang, catalogue);
                BigDecimal moneyValue = decimal(payload.get("money"));
                String body = moneyValue == null
                        ? t(lang, Text.MONTH_CLOSED_BODY_HOURS_ONLY, Map.of("workspace", where, "hours", hoursText))
                        : t(lang, Text.MONTH_CLOSED_BODY, Map.of("workspace", where, "hours", hoursText, "money", money(moneyValue, currency, lang)));
                yield new Rendered(t(lang, Text.MONTH_CLOSED_TITLE, Map.of("name", name, "month", month)), body,
                        t(lang, Text.MONTH_CLOSED_HINT, Map.of()));
            }
            case MONTH_REOPENED -> {
                String month = Formats.month(YearMonth.parse(str(payload, "month")), lang);
                yield new Rendered(t(lang, Text.MONTH_REOPENED_TITLE, Map.of("name", name, "month", month)),
                        t(lang, Text.MONTH_REOPENED_BODY, Map.of("workspace", where)), null);
            }
        };
    }

    // Days listed one by one up to this many; more become a range with the total.
    private static final int LISTED_DAYS = 3;
    // A flag message in a body is clipped so the body stays phone-sized; the full message is the detail.
    private static final int MESSAGE_IN_BODY = 80;

    // One sitting's changes: {date -> {before, after}}. The verb is what happened to every day: added, changed or
    // removed (a mix reads as changed). One added or changed day names the day in the title; otherwise the title
    // counts the days, and the body lists them (up to three) or gives the range and the total.
    private Rendered hoursChanged(Map<String, Object> payload, Language lang, String where) {
        String name = str(payload, "actorName");
        TreeMap<LocalDate, BigDecimal[]> changes = changes(payload);
        changes.values().removeIf(c -> c[0] == null && c[1] == null);
        if (changes.isEmpty()) {
            return new Rendered(catalogue.plural(lang, Text.HOURS_CHANGED.key(), 0, Map.of("name", name)), where, null);
        }
        boolean allAdded = changes.values().stream().allMatch(c -> c[0] == null);
        boolean allRemoved = changes.values().stream().allMatch(c -> c[1] == null);
        String note = strOrNull(payload, "note");
        if (changes.size() == 1 && !allRemoved) {
            var only = changes.firstEntry();
            String date = dayDate(only.getKey(), lang);
            BigDecimal before = only.getValue()[0];
            BigDecimal after = only.getValue()[1];
            String title = t(lang, allAdded ? Text.HOURS_ADDED_ONE : Text.HOURS_CHANGED_ONE, Map.of("name", name, "date", date));
            String body = before == null
                    ? t(lang, Text.HOURS_BODY_ONE, Map.of("workspace", where, "hours", hours(after, lang, catalogue)))
                    : t(lang, Text.HOURS_BODY_CHANGED_ONE, Map.of("workspace", where, "hours", hours(after, lang, catalogue), "before", hours(before, lang, catalogue)));
            return new Rendered(title, body, note == null ? null : t(lang, Text.HOURS_NOTE, Map.of("note", note)));
        }
        Text verb = allAdded ? Text.HOURS_ADDED : allRemoved ? Text.HOURS_REMOVED : Text.HOURS_CHANGED;
        String title = catalogue.plural(lang, verb.key(), changes.size(), Map.of("name", name));
        LocalDate from = changes.firstKey();
        LocalDate to = changes.lastKey();
        int week = from.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        boolean oneWeek = week == to.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR) && from.get(IsoFields.WEEK_BASED_YEAR) == to.get(IsoFields.WEEK_BASED_YEAR);
        String body;
        if (changes.size() <= LISTED_DAYS) {
            List<String> days = new ArrayList<>();
            for (var e : changes.entrySet()) {
                String date = shortDate(e.getKey(), lang);
                BigDecimal after = e.getValue()[1];
                days.add(after == null && !allRemoved
                        ? t(lang, Text.HOURS_DAY_REMOVED, Map.of("date", date))
                        : t(lang, Text.HOURS_DAY, Map.of("date", date, "hours", hours(after == null ? e.getValue()[0] : after, lang, catalogue))));
            }
            String list = String.join(", ", days);
            body = oneWeek ? t(lang, Text.HOURS_BODY_WEEK, Map.of("workspace", where, "week", Integer.toString(week), "days", list))
                    : t(lang, Text.HOURS_BODY_DAYS, Map.of("workspace", where, "days", list));
        } else {
            BigDecimal total = BigDecimal.ZERO;
            for (BigDecimal[] c : changes.values()) total = total.add(allRemoved ? c[0] : c[1] == null ? BigDecimal.ZERO : c[1]);
            Map<String, String> params = Map.of("workspace", where, "week", Integer.toString(week), "from", shortDate(from, lang),
                    "to", shortDate(to, lang), "hours", hours(total, lang, catalogue));
            body = t(lang, oneWeek ? Text.HOURS_RANGE_WEEK : Text.HOURS_RANGE, params);
        }
        return new Rendered(title, body, null);
    }

    private static String clip(String message) {
        return message.length() <= MESSAGE_IN_BODY ? message : message.substring(0, MESSAGE_IN_BODY - 1).stripTrailing() + "\u2026";
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
