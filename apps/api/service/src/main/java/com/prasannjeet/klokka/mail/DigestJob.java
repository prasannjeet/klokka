package com.prasannjeet.klokka.mail;

import static com.prasannjeet.klokka.i18n.Formats.hours;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.i18n.Catalogue;
import com.prasannjeet.klokka.i18n.Formats;
import com.prasannjeet.klokka.i18n.Text;
import com.prasannjeet.klokka.me.MeRepository;
import com.prasannjeet.klokka.persistence.AppUserEntity;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.UserPreferenceEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import io.quarkus.qute.Location;
import io.quarkus.qute.Template;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.jboss.logging.Logger;

// The opt-in weekly digest (CHQ-133): one email per user and ISO week, sent once a workspace of theirs has reached
// Monday at the configured local hour. digest_run's primary key makes a repeat sweep a no-op; a user whose week
// had nothing to report is recorded without an email so the quota is spent only on real content.
@ApplicationScoped
public class DigestJob {

    private static final Logger LOG = Logger.getLogger(DigestJob.class);

    @Inject
    EmailSendRepository ledger;

    @Inject
    MeRepository users;

    @Inject
    EntryRepository entries;

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

    public record Result(int considered, int sent, int skipped) {}

    @Scheduled(every = "15m", identity = "weekly-digest", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduledRun() {
        Result result = run();
        if (result.considered() > 0) LOG.infof("digest: %d considered, %d sent, %d skipped", result.considered(), result.sent(), result.skipped());
    }

    @Transactional
    public Result run() {
        Instant now = clock.instant();
        int sent = 0;
        int skipped = 0;
        List<String> optIns = ledger.digestOptIns(config.digest().batchSize());
        for (String userId : optIns) {
            try {
                if (sendOne(userId, now)) sent++;
                else skipped++;
            } catch (RuntimeException e) {
                LOG.errorf(e, "digest for %s failed; continuing with the next user", userId);
                skipped++;
            }
        }
        return new Result(optIns.size(), sent, skipped);
    }

    private boolean sendOne(String userId, Instant now) {
        Optional<AppUserEntity> user = users.findUser(userId);
        Optional<UserPreferenceEntity> preferences = users.findPreferences(userId);
        if (user.isEmpty() || preferences.isEmpty() || user.get().email == null) return false;
        List<MeRepository.Membership> memberships = users.listMemberships(userId);
        // Due when any workspace of the user has passed Monday 07:00 local time this week.
        LocalDate lastWeekMonday = null;
        for (MeRepository.Membership m : memberships) {
            ZonedDateTime local = now.atZone(zone(m.workspace()));
            if (local.getDayOfWeek() == DayOfWeek.MONDAY && local.getHour() >= config.digest().localHour()) {
                lastWeekMonday = local.toLocalDate().minusWeeks(1);
                break;
            }
        }
        if (lastWeekMonday == null) return false;
        String isoWeek = lastWeekMonday.get(IsoFields.WEEK_BASED_YEAR) + "-W" + String.format("%02d", lastWeekMonday.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
        if (!ledger.recordDigestRun(userId, isoWeek, now)) return false;
        Language lang = preferences.get().language;
        LocalDate lastWeekSunday = lastWeekMonday.plusDays(6);
        int week = lastWeekMonday.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        List<String> lines = new ArrayList<>();
        List<DigestMail.Workspace> blocks = new ArrayList<>();
        // The subject and headline name the first workspace that had hours, so they never read "0 h".
        String headlineWorkspace = null;
        BigDecimal headlineHours = null;
        for (MeRepository.Membership m : memberships) {
            WorkspaceEntity ws = m.workspace();
            MembershipEntity membership = m.membership();
            boolean employer = membership.role == Role.EMPLOYER;
            WorkspaceId id = WorkspaceId.of(ws.id);
            Map<LocalDate, BigDecimal> perDay = entries.hoursPerDay(id, employer ? null : membership.id, lastWeekMonday, lastWeekSunday);
            BigDecimal weekHours = sum(perDay);
            YearMonth month = YearMonth.from(lastWeekSunday);
            BigDecimal monthHours = sum(entries.hoursPerDay(id, employer ? null : membership.id, month.atDay(1), lastWeekSunday));
            String weekText = hours(weekHours, lang, catalogue);
            String monthText = hours(monthHours, lang, catalogue);
            lines.add(catalogue.t(lang, Text.EMAIL_DIGEST_WORKSPACE.key(), Map.of("emoji", ws.emoji, "workspace", ws.name)));
            lines.add(catalogue.t(lang, (employer ? Text.DIGEST_TEAM_HOURS : Text.DIGEST_YOUR_HOURS).key(),
                    Map.of("week", Integer.toString(week), "hours", weekText)));
            lines.add(catalogue.t(lang, Text.DIGEST_MONTH_SO_FAR.key(), Map.of("month", Formats.month(month, lang), "hours", monthText)));
            lines.add("");
            blocks.add(new DigestMail.Workspace(ws.emoji, ws.name, range(lastWeekMonday, lastWeekSunday, lang),
                    days(perDay, lastWeekMonday, lang),
                    catalogue.t(lang, (employer ? Text.DIGEST_TEAM_HOURS_LABEL : Text.DIGEST_YOUR_HOURS_LABEL).key(), Map.of("week", Integer.toString(week))),
                    weekText,
                    capitalized(catalogue.t(lang, Text.DIGEST_MONTH_SO_FAR_LABEL.key(), Map.of("month", Formats.month(month, lang))), lang),
                    monthText));
            if (headlineWorkspace == null && weekHours.signum() > 0) {
                headlineWorkspace = ws.name;
                headlineHours = weekHours;
            }
        }
        if (headlineWorkspace == null) return false;
        boolean employerAnywhere = memberships.stream().anyMatch(m -> m.membership().role == Role.EMPLOYER);
        String subject = employerAnywhere
                ? catalogue.t(lang, Text.DIGEST_SUBJECT_EMPLOYER.key(), Map.of("week", Integer.toString(week), "workspace", headlineWorkspace, "hours", hours(headlineHours, lang, catalogue)))
                : catalogue.t(lang, Text.DIGEST_SUBJECT.key(), Map.of("week", Integer.toString(week), "workspace", headlineWorkspace));
        String greeting = catalogue.t(lang, Text.EMAIL_GREETING.key(), Map.of("name", user.get().displayName));
        String intro = catalogue.t(lang, Text.DIGEST_INTRO.key());
        String unsubscribe = catalogue.t(lang, Text.DIGEST_UNSUBSCRIBE.key());
        String footer = catalogue.t(lang, Text.EMAIL_FOOTER.key());
        StringBuilder body = new StringBuilder();
        body.append(greeting).append("\n\n").append(intro).append("\n\n");
        for (String line : lines) body.append(line).append('\n');
        body.append(unsubscribe).append('\n').append(footer).append('\n');
        // The footer links the public site; the operator's landing address is that site in every environment.
        URI site = config.operator().landingUrl().orElse(config.webBaseUrl());
        String html = digest.data("m", new DigestMail(lang.toString(), subject,
                catalogue.t(lang, Text.DIGEST_TITLE_WEEK.key(), Map.of("week", Integer.toString(week))),
                catalogue.plural(lang, Text.DIGEST_TITLE_HOURS.key(), headlineHours.compareTo(BigDecimal.ONE) == 0 ? 1 : 2,
                        Map.of("hours", Formats.number(headlineHours, lang))),
                greeting, intro, blocks, catalogue.t(lang, Text.DIGEST_ACTION.key()), config.webBaseUrl().toString(), unsubscribe,
                footer, site.toString().replaceAll("/+$", ""), site.getHost())).render();
        return mail.send(EmailSendRepository.KIND_DIGEST, user.get().email, subject, body.toString(), html, userId);
    }

    // Monday to Sunday: short weekday, the day's hours or "off", and the busiest day marked.
    private List<DigestMail.Day> days(Map<LocalDate, BigDecimal> perDay, LocalDate monday, Language lang) {
        LocalDate busiest = null;
        for (int i = 0; i < 7; i++) {
            BigDecimal v = perDay.get(monday.plusDays(i));
            if (v != null && v.signum() > 0 && (busiest == null || v.compareTo(perDay.get(busiest)) > 0)) busiest = monday.plusDays(i);
        }
        DateTimeFormatter weekday = DateTimeFormatter.ofPattern("EEE", Formats.locale(lang));
        List<DigestMail.Day> days = new ArrayList<>(7);
        for (int i = 0; i < 7; i++) {
            LocalDate date = monday.plusDays(i);
            BigDecimal v = perDay.get(date);
            boolean off = v == null || v.signum() == 0;
            String label = date.format(weekday).replace(".", "");
            // Three letters in both languages, as in the app (Swedish CLDR writes Thursday "tors").
            days.add(new DigestMail.Day(capitalized(label.substring(0, Math.min(3, label.length())), lang),
                    off ? catalogue.t(lang, Text.DIGEST_DAY_OFF.key()) : Formats.number(v, lang), date.equals(busiest), off));
        }
        return days;
    }

    // "14\u201320 september", or "31 aug\u20136 september" across a month end.
    private static String range(LocalDate from, LocalDate to, Language lang) {
        Locale locale = Formats.locale(lang);
        String start = from.getMonth() == to.getMonth() ? Integer.toString(from.getDayOfMonth())
                : from.format(DateTimeFormatter.ofPattern("d MMM", locale)).replace(".", "");
        return start + "\u2013" + to.format(DateTimeFormatter.ofPattern("d MMMM", locale));
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
