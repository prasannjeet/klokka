package com.prasannjeet.klokka.webhook;

import static com.prasannjeet.klokka.error.ProblemCode.INVALID_SIGNATURE;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.LogtoWebhookEvent;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.persistence.AppUserEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.jboss.logging.Logger;

// Logto webhooks (CHQ-109): the body's HMAC-SHA256 (hex, header logto-signature-sha-256) is checked against the
// hook's signing key before anything is read; each (hookId, event, createdAt) is applied once. User.Created and
// User.Data.Updated keep app_user in step with Logto (the access token carries no email); User.Deleted deactivates
// the person's memberships. Everything else is acknowledged and ignored.
@ApplicationScoped
public class WebhookService {

    private static final Logger LOG = Logger.getLogger(WebhookService.class);
    private static final String HMAC = "HmacSHA256";
    static final String USER_CREATED = "User.Created";
    static final String USER_UPDATED = "User.Data.Updated";
    static final String USER_DELETED = "User.Deleted";

    @Inject
    KlokkaConfig config;

    @Inject
    WebhookRepository repository;

    @Inject
    Clock clock;

    public void verify(String signatureHex, byte[] body) {
        String key = config.logto().webhookSigningKey()
                .filter(k -> !k.isBlank())
                .orElseThrow(() -> new KlokkaException(INVALID_SIGNATURE, "KLOKKA_LOGTO_WEBHOOK_SIGNING_KEY is not configured."));
        if (signatureHex == null || signatureHex.isBlank()) {
            throw new KlokkaException(INVALID_SIGNATURE, "logto-signature-sha-256 header is missing.");
        }
        byte[] expected = hmac(key, body);
        byte[] given;
        try {
            given = HexFormat.of().parseHex(signatureHex.trim().toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new KlokkaException(INVALID_SIGNATURE, "logto-signature-sha-256 is not hex.", e);
        }
        if (!MessageDigest.isEqual(expected, given)) {
            throw new KlokkaException(INVALID_SIGNATURE, "logto-signature-sha-256 does not match the body.");
        }
    }

    @Transactional
    public void apply(LogtoWebhookEvent event) {
        Instant now = clock.instant();
        boolean fresh = repository.recordEvent(event.getHookId(), event.getEvent(), event.getCreatedAt().toInstant(), now);
        if (!fresh) {
            LOG.debugf("Logto event %s %s at %s already applied", event.getHookId(), event.getEvent(), event.getCreatedAt());
            return;
        }
        Map<String, Object> data = event.getData() == null ? Map.of() : event.getData();
        switch (event.getEvent()) {
            case USER_CREATED, USER_UPDATED -> syncUser(data, now);
            case USER_DELETED -> deleteUser(data, now);
            default -> LOG.debugf("Logto event %s acknowledged, nothing to do", event.getEvent());
        }
    }

    private void syncUser(Map<String, Object> data, Instant now) {
        String id = string(data.get("id"));
        if (id == null) {
            LOG.warn("Logto user event without data.id ignored");
            return;
        }
        String email = string(data.get("primaryEmail"));
        String name = string(data.get("name"));
        AppUserEntity user = repository.findUser(id).orElseGet(() -> {
            AppUserEntity created = new AppUserEntity();
            created.id = id;
            created.createdAt = now;
            created.lastSeenAt = now;
            created.displayName = "";
            repository.persistUser(created);
            return created;
        });
        if (email != null) user.email = email.toLowerCase(Locale.ROOT);
        if (name != null && !name.isBlank()) user.displayName = name.trim();
        if (user.displayName.isBlank() && user.email != null) user.displayName = user.email.split("@")[0];
    }

    private void deleteUser(Map<String, Object> data, Instant now) {
        String id = string(data.get("id"));
        if (id == null) return;
        int touched = repository.deactivateMembershipsOf(id, now);
        LOG.infof("Logto user %s deleted: %d membership(s) deactivated", id, touched);
    }

    private static String string(Object value) {
        return value instanceof String s && !s.isBlank() ? s : null;
    }

    static byte[] hmac(String key, byte[] body) {
        try {
            Mac mac = Mac.getInstance(HMAC);
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), HMAC));
            return mac.doFinal(body);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC-SHA256 is unavailable", e);
        }
    }

    public static String sign(String key, byte[] body) {
        return HexFormat.of().formatHex(hmac(key, body));
    }
}
