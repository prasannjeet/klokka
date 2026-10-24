package com.prasannjeet.klokka.mail;

import static com.prasannjeet.klokka.error.ProblemCode.CONFLICT;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.error.KlokkaException;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jboss.logging.Logger;

// Every email Klokka causes goes through here and into the email_send ledger: the ones the API sends itself
// (the digest, through quarkus-mailer) and the ones Logto sends on Klokka's behalf (invitation, sign-up code),
// which are recorded so the daily quota (KLOKKA_MAIL_DAILY_QUOTA, a rolling 24 hours) counts them too (CHQ-133,
// CHQ-189).
@ApplicationScoped
public class MailService {

    private static final Logger LOG = Logger.getLogger(MailService.class);
    private static final Duration WINDOW = Duration.ofHours(24);

    @Inject
    Mailer mailer;

    @Inject
    EmailSendRepository ledger;

    @Inject
    KlokkaConfig config;

    @Inject
    Clock clock;

    // A file sent with an email (the digest's workbook).
    public record Attachment(String fileName, String contentType, byte[] data) {}

    // A reserve that leaves the digest no room is a misconfiguration: the boot fails instead of the digest going quiet.
    void validate(@Observes StartupEvent event) {
        if (config.digest().reserve() >= config.mail().dailyQuota()) {
            throw new IllegalStateException("klokka.digest.reserve (" + config.digest().reserve() + ") must be below klokka.mail.daily-quota ("
                    + config.mail().dailyQuota() + ")");
        }
    }

    // Emails that left in the last 24 hours, (now - 24h, now].
    public long sentLast24h() {
        Instant now = clock.instant();
        return ledger.countSentIn(now.minus(WINDOW), now);
    }

    // Refuses before an action that will cost `emails` sends; 409 so the client can say "quota".
    public void requireBudget(int emails) {
        long sent = sentLast24h();
        if (sent + emails > config.mail().dailyQuota()) {
            throw new KlokkaException(CONFLICT, "The daily email quota (" + config.mail().dailyQuota() + " in 24 hours) would be exceeded: "
                    + sent + " sent, " + emails + " more needed.");
        }
    }

    // True while one more digest leaves `klokka.digest.reserve` of the daily quota free for invitations and codes.
    public boolean digestBudgetLeft() {
        return sentLast24h() + 1 <= config.mail().dailyQuota() - config.digest().reserve();
    }

    public void recordExternal(String kind, String recipient, UUID workspaceId, UUID membershipId, String userId) {
        ledger.record(kind, recipient, workspaceId, membershipId, userId, EmailSendRepository.STATUS_SENT, null, clock.instant());
    }

    // Sends synchronously and records the outcome; a failure is logged and ledgered, never thrown into a job.
    public boolean send(String kind, String to, String subject, String text, String userId) {
        return send(kind, to, subject, text, null, userId, List.of());
    }

    // With `html`, the email is HTML with `text` as its plain-text alternative (clients that show no HTML use it).
    public boolean send(String kind, String to, String subject, String text, String html, String userId) {
        return send(kind, to, subject, text, html, userId, List.of());
    }

    public boolean send(String kind, String to, String subject, String text, String html, String userId, List<Attachment> attachments) {
        Instant now = clock.instant();
        try {
            Mail mail = Mail.withText(to, subject, text);
            if (html != null) mail.setHtml(html);
            for (Attachment a : attachments) mail.addAttachment(a.fileName(), a.data(), a.contentType());
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
