package com.prasannjeet.klokka.webhook;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;

import com.prasannjeet.klokka.support.FakeServers;
import com.prasannjeet.klokka.support.TestData;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// POST /webhooks/logto (CHQ-109): HMAC over the raw body, idempotent by (hookId, event, createdAt), user profile
// sync into app_user, membership deactivation on user deletion.
@QuarkusTest
class WebhookResourceTest {

    @Inject
    AgroalDataSource dataSource;

    TestData data;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
    }

    @Test
    void aWrongSignatureIs401AndNothingIsApplied() {
        String id = "usr_wh_" + UUID.randomUUID().toString().substring(0, 8);
        String body = event("User.Created", "2026-09-27T14:07:00Z", id, "wrong@example.com", "Wrong");
        given().contentType("application/json").header("logto-signature-sha-256", WebhookService.sign("other-key", body.getBytes(StandardCharsets.UTF_8)))
                .body(body).when().post("/v1/webhooks/logto")
                .then().statusCode(401).body("code", is("INVALID_SIGNATURE"));
        assertThat(data.count("select count(*) from app_user where logto_user_id = ?", id)).isZero();
    }

    @Test
    void userCreatedAndUpdatedSyncEmailAndNameIntoTheProfile() {
        String id = "usr_wh_" + UUID.randomUUID().toString().substring(0, 8);
        post(event("User.Created", "2026-09-27T14:07:00Z", id, "Lina.Ahmed@example.com", "Lina Ahmed")).then().statusCode(204);
        assertThat(data.query("select email, display_name from app_user where logto_user_id = ?", id))
                .containsExactly(java.util.List.of("lina.ahmed@example.com", "Lina Ahmed"));

        post(event("User.Data.Updated", "2026-09-27T14:08:00Z", id, "lina@new.example", "Lina A")).then().statusCode(204);
        assertThat(data.query("select email, display_name from app_user where logto_user_id = ?", id))
                .containsExactly(java.util.List.of("lina@new.example", "Lina A"));
    }

    @Test
    void theSameEventTwiceIsAppliedOnce() {
        String id = "usr_wh_" + UUID.randomUUID().toString().substring(0, 8);
        String created = event("User.Created", "2026-09-27T15:00:00Z", id, "first@example.com", "First");
        post(created).then().statusCode(204);
        // A later change, then the original event replayed: the replay must not roll the profile back.
        post(event("User.Data.Updated", "2026-09-27T15:01:00Z", id, "second@example.com", "Second")).then().statusCode(204);
        post(created).then().statusCode(204);
        assertThat(data.scalar("select email from app_user where logto_user_id = ?", id)).isEqualTo("second@example.com");
        assertThat(data.count("select count(*) from webhook_event where hook_id = 'hook_test' and event = 'User.Created' and created_at = '2026-09-27T15:00:00Z'")).isEqualTo(1);
    }

    @Test
    void userDeletedDeactivatesTheirMemberships() {
        String id = "usr_wh_" + UUID.randomUUID().toString().substring(0, 8);
        data.user(id, id + "@example.com", "Gone Person");
        UUID ws = data.workspace("Deleted Corp", "deleted-" + id, false, "NONE", "Europe/Stockholm");
        UUID membership = data.member(ws, id, "EMPLOYEE", "Gone Person", id + "@example.com", null, "ACTIVE");
        post(event("User.Deleted", "2026-09-27T16:00:00Z", id, null, null)).then().statusCode(204);
        assertThat(data.scalar("select status from membership where id = ?", membership)).isEqualTo("DEACTIVATED");
        assertThat(data.scalar("select deactivated_at from membership where id = ?", membership)).isNotNull();
    }

    @Test
    void eventsKlokkaDoesNotActOnAreAcknowledged() {
        post("{\"hookId\":\"hook_test\",\"event\":\"Organization.Membership.Updated\",\"createdAt\":\"2026-09-27T17:00:00Z\",\"data\":{\"organizationId\":\"org_x\"}}")
                .then().statusCode(204);
    }

    private static io.restassured.response.Response post(String body) {
        return given().contentType("application/json")
                .header("logto-signature-sha-256", WebhookService.sign(FakeServers.SIGNING_KEY, body.getBytes(StandardCharsets.UTF_8)))
                .body(body).when().post("/v1/webhooks/logto");
    }

    private static String event(String event, String createdAt, String userId, String email, String name) {
        return "{\"hookId\":\"hook_test\",\"event\":\"" + event + "\",\"createdAt\":\"" + createdAt + "\",\"data\":{\"id\":\"" + userId + "\""
                + (email == null ? "" : ",\"primaryEmail\":\"" + email + "\"")
                + (name == null ? "" : ",\"name\":\"" + name + "\"")
                + ",\"customData\":{},\"avatar\":null}}";
    }

    static BigDecimal bd(String s) {
        return new BigDecimal(s);
    }
}
