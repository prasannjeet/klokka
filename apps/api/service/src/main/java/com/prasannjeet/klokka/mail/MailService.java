package com.prasannjeet.klokka.mail;

import static com.prasannjeet.klokka.error.ProblemCode.CONFLICT;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.error.KlokkaException;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.UUID;
import org.jboss.logging.Logger;

// Every email Klokka causes goes through here and into the email_send ledger: the ones the API sends itself
// (the digest, through quarkus-mailer) and the ones Logto sends on Klokka's behalf (invitation, sign-up code),
// which are recorded so the monthly quota (KLOKKA_MAIL_MONTHLY_QUOTA) counts them too (CHQ-133).
@ApplicationScoped
public class MailService {

    private static final Logger LOG = Logger.getLogger(MailService.class);

    @Inject
    Mailer mailer;

    @Inject
    EmailSendRepository ledger;

    @Inject
    KlokkaConfig config;

    @Inject
    Clock clock;

    public long sentThisMonth() {
        Instant now = clock.instant();
        YearMonth month = YearMonth.from(now.atOffset(ZoneOffset.UTC));
        return ledger.countSentBetween(month.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC),
                month.plusMonths(1).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC));
    }

    // Refuses before an action that will cost `emails` sends this month; 409 so the client can say "quota".
    public void requireBudget(int emails) {
        long sent = sentThisMonth();
        if (sent + emails > config.mail().monthlyQuota()) {
            throw new KlokkaException(CONFLICT, "The monthly email quota (" + config.mail().monthlyQuota() + ") would be exceeded: "
                    + sent + " sent, " + emails + " more needed.");
        }
    }

    public void recordExternal(String kind, String recipient, UUID workspaceId, UUID membershipId, String userId) {
        ledger.record(kind, recipient, workspaceId, membershipId, userId, EmailSendRepository.STATUS_SENT, null, clock.instant());
    }

    // Sends synchronously and records the outcome; a failure is logged and ledgered, never thrown into a job.
    public boolean send(String kind, String to, String subject, String text, String userId) {
        return send(kind, to, subject, text, null, userId);
    }

    // With `html`, the email is HTML with `text` as its plain-text alternative (clients that show no HTML use it).
    public boolean send(String kind, String to, String subject, String text, String html, String userId) {
        Instant now = clock.instant();
        try {
            Mail mail = Mail.withText(to, subject, text);
            if (html != null) mail.setHtml(html);
            mailer.send(mail);
            ledger.record(kind, to, null, null, userId, EmailSendRepository.STATUS_SENT, null, now);
            return true;
        } catch (RuntimeException e) {
            LOG.errorf(e, "email %s to %s failed", kind, to);
            ledger.record(kind, to, null, null, userId, EmailSendRepository.STATUS_FAILED, e.getMessage(), now);
            return false;
        }
    }
}
