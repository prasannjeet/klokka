package com.prasannjeet.klokka.mail;

import static com.prasannjeet.klokka.i18n.Formats.hours;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.entry.JobLabels;
import com.prasannjeet.klokka.i18n.Catalogue;
import com.prasannjeet.klokka.i18n.Formats;
import com.prasannjeet.klokka.i18n.Text;
import com.prasannjeet.klokka.me.MeRepository;
import com.prasannjeet.klokka.persistence.AppUserEntity;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.JobRepository;
import com.prasannjeet.klokka.persistence.JobRepository.WeekJob;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import com.prasannjeet.klokka.persistence.UserPreferenceEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.qute.Location;
import io.quarkus.qute.Template;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.jboss.logging.Logger;

// The weekly digest (CHQ-133, CHQ-189): one email per user and ISO week, on by default, with one Excel workbook per
// workspace that had anything last week. Last week's digest is due from Monday at the configured local hour in any of
// the user's active workspaces until the end of Monday plus the catch-up days; past that it is dropped. A sweep reads
// one bounded list of candidates (the longest-waiting first) and handles each in its own transaction; it stops when
// the daily quota's digest share is used up or a send fails (a held digest goes out on a later sweep inside the
// window). digest_run's primary key makes a repeat sweep a no-op; a user whose week had nothing to report is recorded
// without an email so the quota is spent only on real content.
@ApplicationScoped
public class DigestJob {

    private static final Logger LOG = Logger.getLogger(DigestJob.class);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    // Not a tunable but a property of a weekly schedule: a user with a digest_run younger than this is left out of the
    // candidates (digest_run's primary key, not this, is what prevents a second email). Six days keeps this week's
    // handled users out for the default window, and a user handled even at the very end of a window is a candidate
    // again a day before the next window closes, since windows end seven days apart.
    private static final Duration DONE_THIS_WEEK = Duration.ofDays(6);

    @Inject
    EmailSendRepository ledger;

    @Inject
    MeRepository users;

    @Inject
    EntryRepository entries;

    @Inject
    JobRepository jobs;

    @Inject
    MembershipRepository memberships;

    @Inject
    MailService mail;

    @Inject
    Catalogue catalogue;

    @Inject
    KlokkaConfig config;

    @Inject
    Clock clock;

    @Inject
    @Location("digest.html")
    Template digest;

    // FAILED: the mail server refused the email (the sweep stops); ERROR: this user's digest threw (the sweep goes on).
    public enum Outcome { NOT_DUE, NOTHING, SENT, NO_BUDGET, FAILED, ERROR }

    public record Result(int considered, int sent, int skipped, boolean budgetOut, boolean mailFailed) {}

    @Scheduled(every = "15m", identity = "weekly-digest", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduledRun() {
        Result result = run();
        if (result.sent() > 0 || result.budgetOut() || result.mailFailed()) {
            LOG.infof("digest: %d considered, %d sent, %d skipped", result.considered(), result.sent(), result.skipped());
        }
    }

    public Result run() {
        Instant now = clock.instant();
        List<String> candidates = QuarkusTransaction.requiringNew()
                .call(() -> ledger.digestCandidates(now.minus(DONE_THIS_WEEK), config.digest().maxUsersPerRun()));
        int sent = 0;
        int skipped = 0;
        for (int i = 0; i < candidates.size(); i++) {
            String userId = candidates.get(i);
            Outcome outcome;
            try {
                outcome = QuarkusTransaction.requiringNew().call(() -> sendOne(userId, now));
            } catch (RuntimeException e) {
                LOG.errorf(e, "digest for %s failed; continuing with the next user", userId);
                outcome = Outcome.ERROR;
            }
            if (outcome == Outcome.SENT) {
                sent++;
            } else {
                skipped++;
            }
            int left = candidates.size() - i - 1;
            if (outcome == Outcome.NO_BUDGET) {
                LOG.infof("digest: the daily email quota's digest share is used up; %s and %d more candidate(s) wait for a later sweep", userId, left);
                return new Result(i + 1, sent, skipped, true, false);
            }
            if (outcome == Outcome.FAILED) {
                LOG.warnf("digest: the email to %s failed; the sweep stops and it and %d more candidate(s) wait for a later sweep", userId, left);
                return new Result(i + 1, sent, skipped, false, true);
            }
        }
        return new Result(candidates.size(), sent, skipped, false, false);
    }

    Outcome sendOne(String userId, Instant now) {
        Optional<AppUserEntity> user = users.findUser(userId);
        Optional<UserPreferenceEntity> preferences = users.findPreferences(userId);
        if (user.isEmpty() || preferences.isEmpty() || user.get().email == null) return Outcome.NOT_DUE;
        // Only active memberships count: a deactivated member (or a deleted account) gets no digest.
        List<MeRepository.Membership> list = users.listMemberships(userId).stream()
                .filter(m -> m.membership().status == MemberStatus.ACTIVE)
                .toList();
        LocalDate lastWeekMonday = dueWeek(list, now);
        if (lastWeekMonday == null) return Outcome.NOT_DUE;
        String isoWeek = lastWeekMonday.get(IsoFields.WEEK_BASED_YEAR) + "-W" + String.format(Locale.ROOT, "%02d", lastWeekMonday.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
        if (ledger.digestRunExists(userId, isoWeek)) return Outcome.NOT_DUE;

        Language lang = preferences.get().language;
        LocalDate lastWeekSunday = lastWeekMonday.plusDays(6);
        String week = Integer.toString(lastWeekMonday.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
        YearMonth month = YearMonth.from(lastWeekSunday);
        StringBuilder lines = new StringBuilder();
        List<DigestMail.Workspace> blocks = new ArrayList<>();
        List<DigestWeek> withRows = new ArrayList<>();
        int jobLinesLeft = config.digest().maxJobsInEmail();
        int teamRowsLeft = config.digest().maxPeopleInEmail();
        // The subject and headline name the first workspace that had hours, so they never read "0 h".
        String headlineWorkspace = null;
        BigDecimal headlineHours = null;
        for (MeRepository.Membership m : list) {
            WorkspaceEntity ws = m.workspace();
            MembershipEntity membership = m.membership();
            boolean employer = membership.role == Role.EMPLOYER;
            WorkspaceId id = WorkspaceId.of(ws.id);
            UUID scope = employer ? null : membership.id;
            Map<LocalDate, BigDecimal> perDay = entries.hoursPerDay(id, scope, lastWeekMonday, lastWeekSunday);
            BigDecimal weekHours = sum(perDay);
            BigDecimal monthHours = sum(entries.hoursPerDay(id, scope, month.atDay(1), lastWeekSunday));
            String weekText = hours(weekHours, lang, catalogue);
            String monthText = hours(monthHours, lang, catalogue);
            DigestWeek digestWeek = week(ws, membership, employer, lastWeekMonday);

            lines.append(catalogue.t(lang, Text.EMAIL_DIGEST_WORKSPACE.key(), Map.of("emoji", ws.emoji, "workspace", ws.name))).append('\n');
            lines.append(catalogue.t(lang, (employer ? Text.DIGEST_TEAM_HOURS : Text.DIGEST_YOUR_HOURS).key(), Map.of("week", week, "hours", weekText))).append('\n');
            lines.append(capitalized(catalogue.t(lang, Text.DIGEST_MONTH_SO_FAR.key(), Map.of("month", Formats.month(month, lang), "hours", monthText)), lang))
                    .append('\n');

            // The team table lists at most the email's remaining rows; the workbook has everyone.
            List<DigestMail.TeamRow> allRows = employer ? team(digestWeek, lang) : List.of();
            List<DigestMail.TeamRow> team = allRows.subList(0, Math.min(allRows.size(), Math.max(teamRowsLeft, 0)));
            teamRowsLeft -= team.size();
            int hiddenPeople = allRows.size() - team.size();
            String morePeopleLine = hiddenPeople > 0 ? catalogue.plural(lang, Text.DIGEST_MORE_PEOPLE_IN_FILE.key(), hiddenPeople, Map.of()) : null;
            if (!allRows.isEmpty()) {
                lines.append('\n').append(catalogue.t(lang, Text.DIGEST_TEAM_TITLE.key())).append('\n');
                for (DigestMail.TeamRow row : team) lines.append(teamLine(row, digestWeek, lang)).append('\n');
                if (morePeopleLine != null) lines.append(morePeopleLine).append('\n');
            }
            List<DigestMail.PersonJobs> people = new ArrayList<>();
            int shown = 0;
            if (!digestWeek.isEmpty() && jobLinesLeft > 0) {
                lines.append('\n').append(catalogue.t(lang, Text.DIGEST_JOBS_TITLE.key())).append('\n');
                for (DigestWeek.Member member : digestWeek.members()) {
                    if (jobLinesLeft - shown <= 0) break;
                    List<DigestMail.DayJobs> days = new ArrayList<>();
                    Map<LocalDate, List<DigestMail.JobLine>> byDay = new LinkedHashMap<>();
                    for (WeekJob job : digestWeek.jobsOf(member.membershipId())) {
                        if (jobLinesLeft - shown <= 0) break;
                        byDay.computeIfAbsent(job.date(), d -> new ArrayList<>()).add(jobLine(job, lang));
                        shown++;
                    }
                    String total = hours(digestWeek.total(member.membershipId()), lang, catalogue);
                    String name = employer ? member.name() : null;
                    if (name != null) lines.append(catalogue.t(lang, Text.DIGEST_PERSON_LINE.key(), Map.of("name", name, "total", total))).append('\n');
                    for (Map.Entry<LocalDate, List<DigestMail.JobLine>> day : byDay.entrySet()) {
                        String label = capitalized(Formats.shortDate(day.getKey(), lang), lang);
                        days.add(new DigestMail.DayJobs(label, day.getValue()));
                        lines.append(label).append('\n');
                        for (DigestMail.JobLine job : day.getValue()) {
                            lines.append("  ").append(job.time().isEmpty() ? "" : job.time() + "  ").append(plainLabel(job, lang)).append("  ").append(job.hours()).append('\n');
                        }
                    }
                    people.add(new DigestMail.PersonJobs(name, total, days));
                }
            }
            jobLinesLeft -= shown;
            String fileLine = null;
            String moreLine = null;
            if (!digestWeek.isEmpty()) {
                String file = DigestWorkbook.fileName(digestWeek);
                withRows.add(digestWeek);
                fileLine = catalogue.t(lang, Text.DIGEST_ATTACHED.key(), Map.of("file", file));
                int hidden = digestWeek.jobs().size() - shown;
                if (hidden > 0) moreLine = catalogue.plural(lang, Text.DIGEST_MORE_IN_FILE.key(), hidden, Map.of());
                lines.append('\n').append(fileLine).append('\n');
                if (moreLine != null) lines.append(moreLine).append('\n');
            }
            lines.append('\n');
            blocks.add(new DigestMail.Workspace(ws.emoji, ws.name, range(lastWeekMonday, lastWeekSunday, lang),
                    days(perDay, lastWeekMonday, lang),
                    catalogue.t(lang, (employer ? Text.DIGEST_TEAM_HOURS_LABEL : Text.DIGEST_YOUR_HOURS_LABEL).key(), Map.of("week", week)),
                    weekText,
                    capitalized(catalogue.t(lang, Text.DIGEST_MONTH_SO_FAR_LABEL.key(), Map.of("month", Formats.month(month, lang))), lang),
                    monthText, List.copyOf(team), morePeopleLine, people, fileLine, moreLine));
            if (headlineWorkspace == null && weekHours.signum() > 0) {
                headlineWorkspace = ws.name;
                headlineHours = weekHours;
            }
        }
        if (headlineWorkspace == null && withRows.isEmpty()) {
            ledger.recordDigestRun(userId, isoWeek, now);
            return Outcome.NOTHING;
        }
        if (headlineWorkspace == null) {
            // Rows last week but zero hours everywhere: the first workspace with rows names the email.
            headlineWorkspace = blocks.stream().filter(b -> b.fileLine() != null).findFirst().orElseThrow().name();
            headlineHours = BigDecimal.ZERO;
        }
        if (!mail.digestBudgetLeft()) return Outcome.NO_BUDGET;
        // Recorded before the send so a concurrent sweep waits on the row instead of sending twice; a failed send
        // takes the row back out below.
        if (!ledger.recordDigestRun(userId, isoWeek, now)) return Outcome.NOT_DUE;
        // The workbooks are written only for an email that goes out.
        List<MailService.Attachment> attachments = withRows.stream()
                .map(w -> new MailService.Attachment(DigestWorkbook.fileName(w), DigestWorkbook.CONTENT_TYPE, DigestWorkbook.build(w, lang, catalogue)))
                .toList();

        boolean employerAnywhere = list.stream().anyMatch(m -> m.membership().role == Role.EMPLOYER);
        String subject = employerAnywhere
                ? catalogue.t(lang, Text.DIGEST_SUBJECT_EMPLOYER.key(), Map.of("week", week, "workspace", headlineWorkspace, "hours", hours(headlineHours, lang, catalogue)))
                : catalogue.t(lang, Text.DIGEST_SUBJECT.key(), Map.of("week", week, "workspace", headlineWorkspace));
        String greeting = catalogue.t(lang, Text.EMAIL_GREETING.key(), Map.of("name", user.get().displayName));
        String intro = catalogue.t(lang, Text.DIGEST_INTRO.key());
        String unsubscribe = catalogue.t(lang, Text.DIGEST_UNSUBSCRIBE.key());
        String footer = catalogue.t(lang, Text.EMAIL_FOOTER.key());
        String body = greeting + "\n\n" + intro + "\n\n" + lines + unsubscribe + '\n' + footer + '\n';
        // The footer links the public site; the operator's landing address is that site in every environment.
        URI site = config.operator().landingUrl().orElse(config.webBaseUrl());
        String html = digest.data("m", new DigestMail(lang.toString(), subject,
                catalogue.t(lang, Text.DIGEST_TITLE_WEEK.key(), Map.of("week", week)),
                catalogue.plural(lang, Text.DIGEST_TITLE_HOURS.key(), headlineHours.compareTo(BigDecimal.ONE) == 0 ? 1 : 2,
                        Map.of("hours", Formats.number(headlineHours, lang))),
                greeting, intro, blocks, catalogue.t(lang, Text.DIGEST_ACTION.key()), config.webBaseUrl().toString(), unsubscribe,
                footer, site.toString().replaceAll("/+$", ""), site.getHost(), catalogue.t(lang, Text.DIGEST_TEAM_TITLE.key()),
                catalogue.t(lang, Text.DIGEST_JOBS_TITLE.key()), catalogue.t(lang, Text.XLSX_TOTAL.key()))).render();
        if (mail.send(EmailSendRepository.KIND_DIGEST, user.get().email, subject, body, html, userId, attachments)) return Outcome.SENT;
        ledger.forgetDigestRun(userId, isoWeek);
        return Outcome.FAILED;
    }

    // Last week's Monday when the digest is due in any of these workspaces: from Monday at the local hour until the
    // end of Monday plus the catch-up days, local time; null otherwise.
    private LocalDate dueWeek(List<MeRepository.Membership> list, Instant now) {
        for (MeRepository.Membership m : list) {
            ZonedDateTime local = now.atZone(zone(m.workspace()));
            LocalDate monday = local.toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            boolean started = !local.toLocalDate().equals(monday) || local.getHour() >= config.digest().localHour();
            boolean open = !local.toLocalDate().isAfter(monday.plusDays(config.digest().catchUpDays()));
            if (started && open) return monday.minusWeeks(1);
        }
        return null;
    }

    // Last week in one workspace as this member may see it.
    private DigestWeek week(WorkspaceEntity ws, MembershipEntity membership, boolean employer, LocalDate monday) {
        WorkspaceId id = WorkspaceId.of(ws.id);
        List<WeekJob> rows = jobs.weekJobs(id, employer ? null : membership.id, monday, monday.plusDays(6));
        Map<UUID, BigDecimal> rates = new LinkedHashMap<>();
        if (employer) {
            for (MembershipEntity member : memberships.listMembers(id)) rates.put(member.id, member.hourlyRate);
        } else {
            rates.put(membership.id, membership.hourlyRate);
        }
        Map<UUID, DigestWeek.Member> members = new LinkedHashMap<>();
        for (WeekJob row : rows) {
            members.computeIfAbsent(row.membershipId(), mid -> new DigestWeek.Member(mid, row.memberName(), rates.get(mid)));
        }
        boolean withPay = ws.showPay && (employer || membership.hourlyRate != null);
        return new DigestWeek(ws, employer, monday, rows, List.copyOf(members.values()), withPay);
    }

    private List<DigestMail.TeamRow> team(DigestWeek week, Language lang) {
        List<DigestMail.TeamRow> rows = new ArrayList<>();
        for (DigestWeek.Member member : week.members()) {
            List<DigestMail.TeamCell> cells = new ArrayList<>(7);
            for (BigDecimal v : week.hoursPerDay(member.membershipId()).values()) {
                cells.add(v.signum() == 0 ? new DigestMail.TeamCell(catalogue.t(lang, Text.DIGEST_NO_HOURS.key()), true)
                        : new DigestMail.TeamCell(Formats.number(v, lang), false));
            }
            rows.add(new DigestMail.TeamRow(member.name(), cells, Formats.number(week.total(member.membershipId()), lang)));
        }
        return rows;
    }

    // "Maria Lind: Mon 4, Fri 6.5 (10.5 h)": the plain-text team table, days without hours left out.
    private String teamLine(DigestMail.TeamRow row, DigestWeek week, Language lang) {
        List<String> worked = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            DigestMail.TeamCell cell = row.days().get(i);
            if (!cell.zero()) worked.add(catalogue.t(lang, Text.DIGEST_TEAM_DAY.key(), Map.of("day", weekday(week.monday().plusDays(i), lang), "hours", cell.value())));
        }
        return catalogue.t(lang, Text.DIGEST_TEAM_LINE.key(), Map.of("name", row.name(),
                "days", String.join(catalogue.t(lang, Text.DIGEST_DAY_SEPARATOR.key()), worked),
                "total", catalogue.t(lang, Text.HOURS_VALUE.key(), Map.of("hours", row.total()))));
    }

    private DigestMail.JobLine jobLine(WeekJob job, Language lang) {
        String label = JobLabels.label(job.title(), job.placeName());
        return new DigestMail.JobLine(job.start() == null ? "" : job.start().format(TIME),
                label != null ? label : catalogue.t(lang, Text.DIGEST_NO_PLACE.key()), JobLabels.secondLine(job.title(), job.placeName()),
                hours(job.hours(), lang, catalogue));
    }

    // The plain-text line's label: "Window cleaning, Café Nord" when a title and a place are both there.
    private String plainLabel(DigestMail.JobLine job, Language lang) {
        return job.place() == null ? job.label()
                : catalogue.t(lang, Text.EMAIL_DIGEST_JOB_WITH_PLACE.key(), Map.of("title", job.label(), "place", job.place()));
    }

    // Monday to Sunday: short weekday, the day's hours or "off", and the busiest day marked.
    private List<DigestMail.Day> days(Map<LocalDate, BigDecimal> perDay, LocalDate monday, Language lang) {
        LocalDate busiest = null;
        for (int i = 0; i < 7; i++) {
            BigDecimal v = perDay.get(monday.plusDays(i));
            if (v != null && v.signum() > 0 && (busiest == null || v.compareTo(perDay.get(busiest)) > 0)) busiest = monday.plusDays(i);
        }
        List<DigestMail.Day> days = new ArrayList<>(7);
        for (int i = 0; i < 7; i++) {
            LocalDate date = monday.plusDays(i);
            BigDecimal v = perDay.get(date);
            boolean off = v == null || v.signum() == 0;
            days.add(new DigestMail.Day(weekday(date, lang), off ? catalogue.t(lang, Text.DIGEST_DAY_OFF.key()) : Formats.number(v, lang),
                    date.equals(busiest), off));
        }
        return days;
    }

    // Three letters in both languages, as in the app (Swedish CLDR writes Thursday "tors").
    private static String weekday(LocalDate date, Language lang) {
        String label = date.format(DateTimeFormatter.ofPattern("EEE", Formats.locale(lang))).replace(".", "");
        return capitalized(label.substring(0, Math.min(3, label.length())), lang);
    }

    // "14–20 september", or "31 aug–6 september" across a month end.
    private static String range(LocalDate from, LocalDate to, Language lang) {
        Locale locale = Formats.locale(lang);
        String start = from.getMonth() == to.getMonth() ? Integer.toString(from.getDayOfMonth())
                : from.format(DateTimeFormatter.ofPattern("d MMM", locale)).replace(".", "");
        return start + "–" + to.format(DateTimeFormatter.ofPattern("d MMMM", locale));
    }

    private static String capitalized(String text, Language lang) {
        return text.isEmpty() ? text : text.substring(0, 1).toUpperCase(Formats.locale(lang)) + text.substring(1);
    }

    private static BigDecimal sum(Map<LocalDate, BigDecimal> perDay) {
        BigDecimal total = BigDecimal.ZERO;
        for (BigDecimal v : perDay.values()) total = total.add(v);
        return total;
    }

    private static ZoneId zone(WorkspaceEntity workspace) {
        return ZoneId.of(workspace.timezone);
    }
}
