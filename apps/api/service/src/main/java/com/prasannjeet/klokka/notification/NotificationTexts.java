package com.prasannjeet.klokka.notification;

import static com.prasannjeet.klokka.i18n.Formats.hours;
import static com.prasannjeet.klokka.i18n.Formats.dayDate;
import static com.prasannjeet.klokka.i18n.Formats.longDate;
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
import java.util.Comparator;
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
            case JOB_REMINDER -> jobReminder(payload, lang, where);
            case JOB_CHANGED -> jobChanged(payload, lang, where);
            case MONTH_REOPENED -> {
                String month = Formats.month(YearMonth.parse(str(payload, "month")), lang);
                yield new Rendered(t(lang, Text.MONTH_REOPENED_TITLE, Map.of("name", name, "month", month)),
                        t(lang, Text.MONTH_REOPENED_BODY, Map.of("workspace", where)), null);
            }
        };
    }

    // "Job at Café Nord in 1 hour" / "Job tomorrow at 09:00", then where, when and how long (CHQ-156). A job with a
    // title is named by it, "Window cleaning in 1 hour" (CHQ-191); the place stays in the body's address.
    private Rendered jobReminder(Map<String, Object> payload, Language lang, String where) {
        String named = strOrNull(payload, "title");
        String place = strOrNull(payload, "placeName");
        String time = str(payload, "startTime");
        String lead = str(payload, "lead");
        String title;
        if ("DAY_BEFORE".equals(lead)) {
            if (named != null) title = t(lang, Text.JOB_REMINDER_TITLE_NAMED_TOMORROW, Map.of("title", named, "time", time));
            else if (place == null) title = t(lang, Text.JOB_REMINDER_TITLE_TOMORROW, Map.of("time", time));
            else title = t(lang, Text.JOB_REMINDER_TITLE_PLACE_TOMORROW, Map.of("place", place, "time", time));
        } else {
            String in = t(lang, switch (lead) {
                case "MINUTES_15" -> Text.JOB_REMINDER_IN_15;
                case "MINUTES_30" -> Text.JOB_REMINDER_IN_30;
                case "HOURS_2" -> Text.JOB_REMINDER_IN_120;
                default -> Text.JOB_REMINDER_IN_60;
            }, Map.of());
            if (named != null) title = t(lang, Text.JOB_REMINDER_TITLE_NAMED, Map.of("title", named, "lead", in));
            else if (place == null) title = t(lang, Text.JOB_REMINDER_TITLE, Map.of("lead", in));
            else title = t(lang, Text.JOB_REMINDER_TITLE_PLACE, Map.of("place", place, "lead", in));
        }
        String hoursText = hours(decimal(payload.get("hours")), lang, catalogue);
        String address = strOrNull(payload, "placeAddress");
        String body = address == null
                ? t(lang, Text.JOB_REMINDER_BODY, Map.of("workspace", where, "time", time, "hours", hoursText))
                : t(lang, Text.JOB_REMINDER_BODY_ADDRESS, Map.of("workspace", where, "time", time, "hours", hoursText, "address", address));
        return new Rendered(title, body, strOrNull(payload, "note"));
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
        // Rows written before net-nothing sittings were dropped (06b14a3) can still hold days that went back.
        if (changes.isEmpty()) return new Rendered(t(lang, Text.HOURS_REVERTED, Map.of("name", name)), where, null);
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

    // Dates listed in a several-jobs detail before the rest are counted.
    private static final int LISTED_JOBS = 5;

    // What one job's write in a sitting reads as (CHQ-188): its date, kind and the values shown.
    public record JobNews(LocalDate date, String kind, String startTime, String title, String placeName) {}

    // One sitting's job writes: {jobId -> {date, kind, startTime, title, placeName, hours}} (CHQ-188), counted per job.
    // One job with a title names the title instead of its place (CHQ-191); rows written before have no title. On a
    // date where jobs were both removed and added (a schedule change replaces a date's job with a new one), each
    // removed and added pair reads as one changed job with the added one's values. One job says what happened and
    // when; several count them (a mix of kinds reads as changed), name the date or give the range, and list the
    // first dates in the detail.
    private Rendered jobChanged(Map<String, Object> payload, Language lang, String where) {
        String name = str(payload, "actorName");
        List<JobNews> jobs = paired(jobs(payload));
        if (jobs.isEmpty()) return new Rendered(t(lang, Text.JOBS_CHANGED, Map.of("name", name)), where, null);
        List<String> kinds = jobs.stream().map(JobNews::kind).distinct().toList();
        String kind = kinds.size() == 1 ? kinds.get(0) : "CHANGED";
        if (jobs.size() == 1) {
            JobNews only = jobs.getFirst();
            Text title = switch (kind) {
                case "ADDED" -> Text.JOBS_ADDED;
                case "REMOVED" -> Text.JOBS_REMOVED;
                default -> Text.JOBS_CHANGED;
            };
            String date = dayDate(only.date(), lang);
            String time = only.startTime();
            String named = only.title();
            String place = only.placeName();
            String body;
            if (named != null) {
                body = time == null ? t(lang, Text.JOBS_WHEN_TITLE, Map.of("workspace", where, "date", date, "title", named))
                        : t(lang, Text.JOBS_WHEN_TIME_TITLE, Map.of("workspace", where, "date", date, "time", time, "title", named));
            } else if (time == null && place == null) body = t(lang, Text.JOBS_WHEN, Map.of("workspace", where, "date", date));
            else if (place == null) body = t(lang, Text.JOBS_WHEN_TIME, Map.of("workspace", where, "date", date, "time", time));
            else if (time == null) body = t(lang, Text.JOBS_WHEN_PLACE, Map.of("workspace", where, "date", date, "place", place));
            else body = t(lang, Text.JOBS_WHEN_TIME_PLACE, Map.of("workspace", where, "date", date, "time", time, "place", place));
            return new Rendered(t(lang, title, Map.of("name", name)), body, null);
        }
        Text title = switch (kind) {
            case "ADDED" -> Text.JOBS_ADDED_MANY;
            case "REMOVED" -> Text.JOBS_REMOVED_MANY;
            default -> Text.JOBS_CHANGED_MANY;
        };
        String plural = catalogue.plural(lang, title.key(), jobs.size(), Map.of("name", name));
        List<LocalDate> dates = jobs.stream().map(JobNews::date).distinct().toList();
        if (dates.size() == 1) return new Rendered(plural, t(lang, Text.JOBS_WHEN, Map.of("workspace", where, "date", dayDate(dates.getFirst(), lang))), null);
        // A series planned a year ahead spans two years; without them "Wed 18 Nov to Wed 17 Nov" reads as nothing.
        LocalDate first = dates.getFirst();
        LocalDate last = dates.getLast();
        boolean oneYear = first.getYear() == last.getYear();
        String body = t(lang, Text.JOBS_RANGE, Map.of("workspace", where,
                "from", oneYear ? shortDate(first, lang) : longDate(first, lang),
                "to", oneYear ? shortDate(last, lang) : longDate(last, lang)));
        String detail = String.join(", ", dates.stream().limit(LISTED_JOBS).map(d -> shortDate(d, lang)).toList());
        if (dates.size() > LISTED_JOBS) detail += " " + t(lang, Text.JOBS_MORE, Map.of("count", Integer.toString(dates.size() - LISTED_JOBS)));
        return new Rendered(plural, body, detail);
    }

    // Per date, removed and added jobs paired into changed ones (the added job's values); by date, then kind.
    private static List<JobNews> paired(List<JobNews> jobs) {
        List<JobNews> out = new ArrayList<>();
        TreeMap<LocalDate, List<JobNews>> byDate = new TreeMap<>();
        for (JobNews job : jobs) byDate.computeIfAbsent(job.date(), d -> new ArrayList<>()).add(job);
        for (List<JobNews> day : byDate.values()) {
            List<JobNews> added = day.stream().filter(j -> j.kind().equals("ADDED")).toList();
            List<JobNews> removed = day.stream().filter(j -> j.kind().equals("REMOVED")).toList();
            int pairs = Math.min(added.size(), removed.size());
            for (int i = 0; i < pairs; i++) {
                JobNews now = added.get(i);
                out.add(new JobNews(now.date(), "CHANGED", now.startTime(), now.title(), now.placeName()));
            }
            out.addAll(added.subList(pairs, added.size()));
            out.addAll(removed.subList(pairs, removed.size()));
            out.addAll(day.stream().filter(j -> j.kind().equals("CHANGED")).toList());
        }
        return out;
    }

    // The sitting's jobs as written by NotificationService.jobChanged, by date then start time.
    @SuppressWarnings("unchecked")
    static List<JobNews> jobs(Map<String, Object> payload) {
        List<JobNews> out = new ArrayList<>();
        Object raw = payload.get("jobs");
        if (!(raw instanceof Map<?, ?> map)) return out;
        for (Object value : map.values()) {
            Map<String, Object> job = (Map<String, Object>) value;
            out.add(new JobNews(LocalDate.parse(str(job, "date")), str(job, "kind"), strOrNull(job, "startTime"), strOrNull(job, "title"),
                    strOrNull(job, "placeName")));
        }
        out.sort(Comparator.comparing(JobNews::date).thenComparing(JobNews::startTime, Comparator.nullsLast(Comparator.naturalOrder())));
        return out;
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
