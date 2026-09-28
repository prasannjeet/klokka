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
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.List;
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
        String firstWorkspace = null;
        BigDecimal firstHours = null;
        boolean anything = false;
        for (MeRepository.Membership m : memberships) {
            WorkspaceEntity ws = m.workspace();
            MembershipEntity membership = m.membership();
            boolean employer = membership.role == Role.EMPLOYER;
            WorkspaceId id = WorkspaceId.of(ws.id);
            BigDecimal weekHours = sum(entries.hoursPerDay(id, employer ? null : membership.id, lastWeekMonday, lastWeekSunday));
            YearMonth month = YearMonth.from(lastWeekSunday);
            BigDecimal monthHours = sum(entries.hoursPerDay(id, employer ? null : membership.id, month.atDay(1), lastWeekSunday));
            if (weekHours.signum() > 0) anything = true;
            lines.add(catalogue.t(lang, Text.EMAIL_DIGEST_WORKSPACE.key(), Map.of("emoji", ws.emoji, "workspace", ws.name)));
            lines.add(catalogue.t(lang, (employer ? Text.DIGEST_TEAM_HOURS : Text.DIGEST_YOUR_HOURS).key(),
                    Map.of("week", Integer.toString(week), "hours", hours(weekHours, lang, catalogue))));
            lines.add(catalogue.t(lang, Text.DIGEST_MONTH_SO_FAR.key(),
                    Map.of("month", Formats.month(month, lang), "hours", hours(monthHours, lang, catalogue))));
            lines.add("");
            if (firstWorkspace == null) {
                firstWorkspace = ws.name;
                firstHours = weekHours;
            }
        }
        if (!anything || firstWorkspace == null) return false;
        boolean employerAnywhere = memberships.stream().anyMatch(m -> m.membership().role == Role.EMPLOYER);
        String subject = employerAnywhere
                ? catalogue.t(lang, Text.DIGEST_SUBJECT_EMPLOYER.key(), Map.of("week", Integer.toString(week), "workspace", firstWorkspace, "hours", hours(firstHours, lang, catalogue)))
                : catalogue.t(lang, Text.DIGEST_SUBJECT.key(), Map.of("week", Integer.toString(week), "workspace", firstWorkspace));
        StringBuilder body = new StringBuilder();
        body.append(catalogue.t(lang, Text.EMAIL_GREETING.key(), Map.of("name", user.get().displayName))).append("\n\n");
        body.append(catalogue.t(lang, Text.DIGEST_INTRO.key())).append("\n\n");
        for (String line : lines) body.append(line).append('\n');
        body.append(catalogue.t(lang, Text.DIGEST_UNSUBSCRIBE.key())).append('\n');
        body.append(catalogue.t(lang, Text.EMAIL_FOOTER.key())).append('\n');
        return mail.send(EmailSendRepository.KIND_DIGEST, user.get().email, subject, body.toString(), userId);
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
