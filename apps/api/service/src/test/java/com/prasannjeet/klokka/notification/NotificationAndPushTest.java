package com.prasannjeet.klokka.notification;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import com.prasannjeet.klokka.push.PushSweeper;
import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.FakeServers;
import com.prasannjeet.klokka.support.MutableClock;
import com.prasannjeet.klokka.support.TestData;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// The notification centre (CHQ-131), the coalescing rules (CHQ-132) and the push jobs (CHQ-130): texts in the
// recipient's language, cursor paging, the quiet window and its cap, Expo batches, receipts, dead tokens.
@QuarkusTest
@SuppressWarnings("unchecked")
class NotificationAndPushTest {

    private static final String NORA = "usr_nt_nora";
    private static final String MARIA = "usr_nt_maria";

    @Inject
    AgroalDataSource dataSource;

    @Inject
    MutableClock clock;

    @Inject
    PushSweeper sweeper;

    TestData data;
    UUID ws;
    UUID maria;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        data.user(NORA, "nora@cafenord.example", "Nora Lind");
        data.user(MARIA, "maria@example.com", "Maria Lind");
        data.preferences(MARIA, "sv", true, false);
        ws = data.workspace("Notify Corp", "notify-" + UUID.randomUUID().toString().substring(0, 8), true, "NONE", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@example.com", new BigDecimal("170.00"), "ACTIVE");
        data.run("delete from push_delivery where token like 'ExponentPushToken[nt-%' or token = ?", FakeServers.DEAD_TOKEN);
        data.run("delete from push_token where token like 'ExponentPushToken[nt-%' or token = ?", FakeServers.DEAD_TOKEN);
    }

    @AfterEach
    void tearDown() {
        clock.reset();
    }

    @Inject
    NotificationTexts texts;

    @Test
    void aSittingThatOnlyClearedDaysReadsAsARemoval() {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("actorName", "Nora Lind");
        payload.put("changes", Map.of(
                "2026-09-29", Map.of("before", new BigDecimal("2.00")),
                "2026-10-01", Map.of("before", new BigDecimal("3.00"))));
        NotificationTexts.Rendered sv = texts.render(com.prasannjeet.klokka.contract.model.NotificationKind.HOURS_CHANGED, payload,
                com.prasannjeet.klokka.contract.model.Language.SV, "SEK");
        assertThat(sv.title()).isEqualTo("Nora Lind tog bort 2 dagar");
        assertThat(sv.body()).isEqualTo("5 h togs bort från din månad.");
        assertThat(sv.detail()).isEqualTo("tis 29 sep till tors 1 okt");
        NotificationTexts.Rendered en = texts.render(com.prasannjeet.klokka.contract.model.NotificationKind.HOURS_CHANGED, payload,
                com.prasannjeet.klokka.contract.model.Language.EN, "SEK");
        assertThat(en.title()).isEqualTo("Nora Lind removed 2 days");
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aSittingCoalescesWithASlidingWindowCappedAtThirtyMinutesAndRendersInSwedish() {
        String base = "/v1/workspaces/" + ws + "/members/" + maria + "/entries/";
        given().contentType("application/json").body("{\"hours\":4}").when().put(base + "2026-09-21").then().statusCode(200);
        clock.set(MutableClock.DEFAULT.plusSeconds(8 * 60));
        given().contentType("application/json").body("{\"hours\":4}").when().put(base + "2026-09-22").then().statusCode(200);
        UUID id = (UUID) data.scalar("select id from notification where logto_user_id = ? and workspace_id = ?", MARIA, ws);
        assertThat(data.scalar("select push_due_at from notification where id = ?", id)).isEqualTo(MutableClock.DEFAULT.plusSeconds(18 * 60));
        clock.set(MutableClock.DEFAULT.plusSeconds(25 * 60));
        given().contentType("application/json").body("{\"hours\":4.5}").when().put(base + "2026-09-23").then().statusCode(200);
        assertThat(data.scalar("select push_due_at from notification where id = ?", id)).as("capped at created + 30 min").isEqualTo(MutableClock.DEFAULT.plusSeconds(30 * 60));
        assertThat(data.count("select count(*) from notification where logto_user_id = ? and workspace_id = ?", MARIA, ws)).isEqualTo(1);

        // Not due yet: nothing is sent for this row (other tests' rows may be swept). Once due, one Expo message with
        // Maria's token and Swedish text.
        data.pushToken(MARIA, "ExponentPushToken[nt-maria]");
        sweeper.sweep();
        assertThat(data.scalar("select pushed_at from notification where id = ?", id)).isNull();
        assertThat(messagesTo("ExponentPushToken[nt-maria]")).isEmpty();
        clock.set(MutableClock.DEFAULT.plusSeconds(31 * 60));
        sweeper.sweep();
        List<Map<String, Object>> mine = messagesTo("ExponentPushToken[nt-maria]");
        assertThat(mine).hasSize(1);
        Map<String, Object> message = mine.get(0);
        assertThat(message.get("to")).isEqualTo("ExponentPushToken[nt-maria]");
        assertThat(message.get("title")).isEqualTo("Notify Corp: Nora Lind lade till 3 dagar, 12,5 h");
        assertThat(message.get("body")).isEqualTo("12,5 h i vecka 39.");
        assertThat(((Map<String, Object>) message.get("data")).get("notificationId")).isEqualTo(id.toString());
        // The phone's allowlisted deep link and Android channel (registerPushToken in the contract).
        assertThat(((Map<String, Object>) message.get("data")).get("url")).isEqualTo("/w/" + ws + "/members/" + maria + "/month/2026-09");
        assertThat(message.get("channelId")).isEqualTo("hours");
        assertThat(data.scalar("select pushed_at from notification where id = ?", id)).isNotNull();
        assertThat(data.count("select count(*) from push_delivery where notification_id = ? and status = 'SENT'", id)).isEqualTo(1);
        sweeper.sweep();
        assertThat(messagesTo("ExponentPushToken[nt-maria]")).as("closed rows are not sent twice").hasSize(1);

        // A change after the push opens a new sitting.
        given().contentType("application/json").body("{\"hours\":2}").when().put(base + "2026-09-24").then().statusCode(200);
        assertThat(data.count("select count(*) from notification where logto_user_id = ? and workspace_id = ?", MARIA, ws)).isEqualTo(2);
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void theCentrePagesByCursorFiltersUnreadAndMarksRead() {
        for (int i = 0; i < 3; i++) {
            data.run("insert into notification (id, logto_user_id, workspace_id, kind, payload, created_at, updated_at, push_due_at, pushed_at) "
                    + "values (?, ?, ?, 'MONTH_CLOSED', ?::jsonb, ?, ?, ?, ?)",
                    UUID.randomUUID(), MARIA, ws, "{\"actorName\":\"Nora Lind\",\"workspaceName\":\"Notify Corp\",\"membershipId\":\"" + maria + "\",\"month\":\"2026-0" + (6 + i) + "\",\"hours\":96,\"money\":15840}",
                    clock.instant().minusSeconds(3600L * (3 - i)), clock.instant(), clock.instant(), clock.instant());
        }
        String cursor = given().when().get("/v1/notifications?workspaceId=" + ws + "&limit=2").then().statusCode(200)
                .body("items", hasSize(2)).body("unreadCount", is(3)).body("nextCursor", notNullValue())
                .body("items[0].kind", is("MONTH_CLOSED")).body("items[0].workspaceName", is("Notify Corp")).body("items[0].workspaceEmoji", is("☕"))
                .body("items[0].title", is("Augusti 2026 är stängd.")).body("items[0].body", org.hamcrest.Matchers.matchesPattern("96 h, 15\\p{Z}840\\p{Z}kr\\.")).body("items[0].detail", is("Nora Lind låste månaden. Dela ditt kort från Profil."))
                .body("items[0].link.month", is("2026-08")).body("items[0].link.membershipId", is(maria.toString())).body("items[0].readAt", nullValue())
                .body("items[1].link.month", is("2026-07"))
                .extract().path("nextCursor");
        String lastId = given().when().get("/v1/notifications?workspaceId=" + ws + "&limit=2&cursor=" + cursor).then().statusCode(200)
                .body("items", hasSize(1)).body("nextCursor", nullValue()).body("items[0].link.month", is("2026-06"))
                .extract().path("items[0].id");
        given().when().post("/v1/notifications/" + lastId + "/read").then().statusCode(204);
        given().when().get("/v1/notifications?workspaceId=" + ws + "&unreadOnly=true").then().statusCode(200).body("items", hasSize(2)).body("unreadCount", is(2));
        given().when().post("/v1/notifications/read-all?workspaceId=" + ws).then().statusCode(204);
        given().when().get("/v1/notifications?workspaceId=" + ws + "&unreadOnly=true").then().statusCode(200).body("items", hasSize(0)).body("unreadCount", is(0));
        given().when().post("/v1/notifications/" + UUID.randomUUID() + "/read").then().statusCode(404);
        given().when().get("/v1/notifications?cursor=not-a-cursor").then().statusCode(400).body("code", is("VALIDATION"));
    }

    @Test
    void deadTokensAreDeletedAtSendTimeAndFromReceipts() {
        String other = "usr_nt_other_" + UUID.randomUUID().toString().substring(0, 6);
        data.user(other, other + "@example.com", "Other");
        data.preferences(other, "en", true, false);
        data.pushToken(other, FakeServers.DEAD_TOKEN);
        data.pushToken(other, "ExponentPushToken[nt-gone]");
        data.pushToken(other, "ExponentPushToken[nt-live]");
        UUID id = UUID.randomUUID();
        data.run("insert into notification (id, logto_user_id, workspace_id, kind, payload, created_at, updated_at, push_due_at) values (?, ?, ?, 'MONTH_REOPENED', ?::jsonb, ?, ?, ?)",
                id, other, ws, "{\"actorName\":\"Nora Lind\",\"workspaceName\":\"Notify Corp\",\"membershipId\":\"" + maria + "\",\"month\":\"2026-08\"}",
                clock.instant(), clock.instant(), clock.instant());
        sweeper.sweep();
        assertThat(messagesTo(FakeServers.DEAD_TOKEN)).hasSize(1);
        assertThat(messagesTo("ExponentPushToken[nt-live]")).hasSize(1);
        assertThat(messagesTo("ExponentPushToken[nt-live]").get(0).get("title")).isEqualTo("Notify Corp: August 2026 was reopened.");
        assertThat(data.count("select count(*) from push_token where token = ?", FakeServers.DEAD_TOKEN)).as("DeviceNotRegistered at send deletes the token").isZero();
        assertThat(data.count("select count(*) from push_delivery where notification_id = ? and status = 'SENT'", id)).isEqualTo(2);
        assertThat(data.count("select count(*) from push_delivery where notification_id = ? and status = 'FAILED' and error_code = 'DeviceNotRegistered'", id)).isEqualTo(1);

        assertThat(sweeper.receipts()).as("too early for receipts").isZero();
        clock.set(clock.instant().plusSeconds(16 * 60));
        assertThat(sweeper.receipts()).isGreaterThanOrEqualTo(2);
        List<List<String>> requests = Fake.list("receiptRequests");
        assertThat(requests).hasSize(1);
        assertThat(requests.get(0)).anyMatch(t -> t.endsWith("[nt-gone]")).anyMatch(t -> t.endsWith("[nt-live]"));
        assertThat(data.count("select count(*) from push_token where token = 'ExponentPushToken[nt-gone]'")).as("DeviceNotRegistered receipt deletes the token").isZero();
        assertThat(data.count("select count(*) from push_token where token = 'ExponentPushToken[nt-live]'")).isEqualTo(1);
        assertThat(data.query("select token, status from push_delivery where notification_id = ? and receipt_checked_at is not null order by token", id))
                .containsExactly(List.of("ExponentPushToken[nt-gone]", "FAILED"), List.of("ExponentPushToken[nt-live]", "DELIVERED"));
        assertThat(sweeper.receipts()).isZero();
    }

    @Test
    void pushOffOrNoTokenStillClosesTheRow() {
        data.preferences(MARIA, "sv", false, false);
        UUID id = UUID.randomUUID();
        data.run("insert into notification (id, logto_user_id, workspace_id, kind, payload, created_at, updated_at, push_due_at) values (?, ?, ?, 'MONTH_REOPENED', ?::jsonb, ?, ?, ?)",
                id, MARIA, ws, "{\"actorName\":\"Nora Lind\",\"workspaceName\":\"Notify Corp\",\"membershipId\":\"" + maria + "\",\"month\":\"2026-08\"}",
                clock.instant(), clock.instant(), clock.instant());
        sweeper.sweep();
        assertThat(data.scalar("select pushed_at from notification where id = ?", id)).isNotNull();
        assertThat(data.count("select count(*) from push_delivery where notification_id = ?", id)).isZero();
    }

    private static List<Map<String, Object>> messagesTo(String token) {
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (List<Map<String, Object>> batch : Fake.<List<Map<String, Object>>>list("pushSends")) {
            for (Map<String, Object> m : batch) if (token.equals(m.get("to"))) out.add(m);
        }
        return out;
    }
}
