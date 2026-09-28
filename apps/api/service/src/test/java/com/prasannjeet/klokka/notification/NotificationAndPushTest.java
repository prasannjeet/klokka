package com.prasannjeet.klokka.notification;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.contract.model.NotificationKind;
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

    private static Map<String, Object> sitting(Object... dateBeforeAfter) {
        Map<String, Object> changes = new java.util.LinkedHashMap<>();
        for (int i = 0; i < dateBeforeAfter.length; i += 3) {
            Map<String, Object> change = new java.util.HashMap<>();
            change.put("before", dateBeforeAfter[i + 1] == null ? null : new BigDecimal(dateBeforeAfter[i + 1].toString()));
            change.put("after", dateBeforeAfter[i + 2] == null ? null : new BigDecimal(dateBeforeAfter[i + 2].toString()));
            changes.put(dateBeforeAfter[i].toString(), change);
        }
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("actorName", "Anna Admin");
        payload.put("changes", changes);
        return payload;
    }

    private NotificationTexts.Rendered hours(Map<String, Object> payload, Language lang) {
        return texts.render(NotificationKind.HOURS_CHANGED, payload, lang, "Kafé Nord", "SEK");
    }

    // CHQ-145: the title says who did what, the body where and which days; the same text for push and in-app.
    @Test
    void hoursTextsNameTheDayOrCountTheDaysWithTheBusinessInTheBody() {
        var one = hours(sitting("2026-09-28", null, "5"), Language.EN);
        assertThat(one.title()).isEqualTo("Anna Admin added Monday 28 Sept");
        assertThat(one.body()).isEqualTo("Kafé Nord: 5 h");
        var oneSv = hours(sitting("2026-09-28", null, "5"), Language.SV);
        assertThat(oneSv.title()).isEqualTo("Anna Admin la till måndag 28 sep");
        assertThat(oneSv.body()).isEqualTo("Kafé Nord: 5 h");

        var changed = hours(sitting("2026-09-29", "5", "6"), Language.EN);
        assertThat(changed.title()).isEqualTo("Anna Admin changed Tuesday 29 Sept");
        assertThat(changed.body()).isEqualTo("Kafé Nord: 6 h, was 5 h");

        var two = hours(sitting("2026-09-28", null, "5", "2026-09-29", null, "6"), Language.EN);
        assertThat(two.title()).isEqualTo("Anna Admin added 2 days");
        assertThat(two.body()).isEqualTo("Kafé Nord, week 40: Mon 28 Sept 5 h, Tue 29 Sept 6 h");
        var twoSv = hours(sitting("2026-09-28", null, "5", "2026-09-29", null, "6"), Language.SV);
        assertThat(twoSv.title()).isEqualTo("Anna Admin la till 2 dagar");
        assertThat(twoSv.body()).isEqualTo("Kafé Nord, vecka 40: mån 28 sep 5 h, tis 29 sep 6 h");

        var five = hours(sitting("2026-09-28", null, "8", "2026-09-29", null, "8", "2026-09-30", null, "8", "2026-10-01", null, "7",
                "2026-10-02", null, "7"), Language.EN);
        assertThat(five.title()).isEqualTo("Anna Admin added 5 days");
        assertThat(five.body()).isEqualTo("Kafé Nord, week 40: Mon 28 Sept to Fri 2 Oct, 38 h");
        assertThat(five.detail()).isNull();

        var removed = hours(sitting("2026-09-29", "2", null), Language.EN);
        assertThat(removed.title()).isEqualTo("Anna Admin removed 1 day");
        assertThat(removed.body()).isEqualTo("Kafé Nord, week 40: Tue 29 Sept 2 h");
        var removedTwoWeeks = hours(sitting("2026-09-27", "2", null, "2026-09-28", "3", null), Language.SV);
        assertThat(removedTwoWeeks.title()).isEqualTo("Anna Admin tog bort 2 dagar");
        assertThat(removedTwoWeeks.body()).isEqualTo("Kafé Nord: sön 27 sep 2 h, mån 28 sep 3 h");

        var mixed = hours(sitting("2026-09-28", "5", "6", "2026-09-29", "4", null), Language.EN);
        assertThat(mixed.title()).isEqualTo("Anna Admin changed 2 days");
        assertThat(mixed.body()).isEqualTo("Kafé Nord, week 40: Mon 28 Sept 6 h, Tue 29 Sept removed");
        var reverted = hours(sitting("2026-09-28", null, null), Language.EN);
        assertThat(reverted.title()).isEqualTo("Anna Admin changed your hours and put them back");
        assertThat(reverted.body()).isEqualTo("Kafé Nord");
        for (var r : List.of(one, oneSv, changed, two, twoSv, five, removed, removedTwoWeeks, mixed)) {
            assertThat(r.body().length()).as(r.body()).isLessThanOrEqualTo(100);
        }
    }

    @Test
    void theOtherKindsSayWhatHappenedAndWhere() {
        Map<String, Object> flag = new java.util.HashMap<>(Map.of("actorName", "Test Testsson", "date", "2026-09-29",
                "loggedHours", new BigDecimal("5.00"), "suggestedHours", new BigDecimal("6"), "message", "I stayed until closing."));
        var flagged = texts.render(NotificationKind.ENTRY_FLAGGED, flag, Language.EN, "Kafé Nord", "SEK");
        assertThat(flagged.title()).isEqualTo("Test Testsson flagged Tuesday 29 Sept");
        assertThat(flagged.body()).isEqualTo("Kafé Nord: logged 5 h, says 6 h");
        assertThat(flagged.detail()).isEqualTo("I stayed until closing.");
        Map<String, Object> fixed = new java.util.HashMap<>(Map.of("actorName", "Anna Admin", "date", "2026-09-29", "hours", "6", "action", "FIX"));
        var fixedSv = texts.render(NotificationKind.FLAG_RESOLVED, fixed, Language.SV, "Kafé Nord", "SEK");
        assertThat(fixedSv.title()).isEqualTo("Anna Admin rättade din flagga");
        assertThat(fixedSv.body()).isEqualTo("Kafé Nord: tis 29 sep är nu 6 h");
        fixed.put("action", "DISMISS");
        fixed.put("hours", "5");
        var kept = texts.render(NotificationKind.FLAG_RESOLVED, fixed, Language.EN, "Kafé Nord", "SEK");
        assertThat(kept.title()).isEqualTo("Anna Admin reviewed your flag");
        assertThat(kept.body()).isEqualTo("Kafé Nord: Tue 29 Sept stays at 5 h");
        var accepted = texts.render(NotificationKind.INVITE_ACCEPTED, Map.of("actorName", "Test Testsson"), Language.SV, "Kafé Nord", "SEK");
        assertThat(accepted.title()).isEqualTo("Test Testsson accepterade din inbjudan");
        assertThat(accepted.body()).isEqualTo("Kafé Nord: Test Testsson är nu anställd");
        var reopened = texts.render(NotificationKind.MONTH_REOPENED, Map.of("actorName", "Anna Admin", "month", "2026-09"), Language.EN, "Kafé Nord", "SEK");
        assertThat(reopened.title()).isEqualTo("Anna Admin reopened September 2026");
        assertThat(reopened.body()).isEqualTo("Kafé Nord: entries can change again");
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aSittingThatAddsAndClearsTheSameDaysIsNoNews() {
        String base = "/v1/workspaces/" + ws + "/members/" + maria + "/entries/";
        given().contentType("application/json").body("{\"hours\":4}").when().put(base + "2026-09-21").then().statusCode(200);
        assertThat(data.count("select count(*) from notification where logto_user_id = ? and workspace_id = ?", MARIA, ws)).isEqualTo(1);
        given().when().delete(base + "2026-09-21").then().statusCode(204);
        assertThat(data.count("select count(*) from notification where logto_user_id = ? and workspace_id = ?", MARIA, ws))
                .as("added and cleared within the quiet window: nothing to tell").isZero();
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aSittingCoalescesWithASlidingWindowCappedAtTenMinutesAndRendersInSwedish() {
        String base = "/v1/workspaces/" + ws + "/members/" + maria + "/entries/";
        given().contentType("application/json").body("{\"hours\":4}").when().put(base + "2026-09-21").then().statusCode(200);
        // The in-app row exists from the first change; only the push waits for the quiet window.
        UUID id = (UUID) data.scalar("select id from notification where logto_user_id = ? and workspace_id = ?", MARIA, ws);
        assertThat(data.scalar("select push_due_at from notification where id = ?", id)).isEqualTo(MutableClock.DEFAULT.plusSeconds(2 * 60));
        clock.set(MutableClock.DEFAULT.plusSeconds(90));
        given().contentType("application/json").body("{\"hours\":4}").when().put(base + "2026-09-22").then().statusCode(200);
        assertThat(data.scalar("select push_due_at from notification where id = ?", id)).isEqualTo(MutableClock.DEFAULT.plusSeconds(90 + 2 * 60));
        clock.set(MutableClock.DEFAULT.plusSeconds(9 * 60));
        given().contentType("application/json").body("{\"hours\":4.5}").when().put(base + "2026-09-23").then().statusCode(200);
        assertThat(data.scalar("select push_due_at from notification where id = ?", id)).as("capped at created + 10 min").isEqualTo(MutableClock.DEFAULT.plusSeconds(10 * 60));
        assertThat(data.count("select count(*) from notification where logto_user_id = ? and workspace_id = ?", MARIA, ws)).isEqualTo(1);

        // Not due yet: nothing is sent for this row (other tests' rows may be swept). Once due, one Expo message with
        // Maria's token and Swedish text.
        data.pushToken(MARIA, "ExponentPushToken[nt-maria]");
        sweeper.sweep();
        assertThat(data.scalar("select pushed_at from notification where id = ?", id)).isNull();
        assertThat(messagesTo("ExponentPushToken[nt-maria]")).isEmpty();
        clock.set(MutableClock.DEFAULT.plusSeconds(10 * 60 + 30));
        sweeper.sweep();
        List<Map<String, Object>> mine = messagesTo("ExponentPushToken[nt-maria]");
        assertThat(mine).hasSize(1);
        Map<String, Object> message = mine.get(0);
        assertThat(message.get("to")).isEqualTo("ExponentPushToken[nt-maria]");
        assertThat(message.get("title")).isEqualTo("Nora Lind la till 3 dagar");
        assertThat(message.get("body")).isEqualTo("Notify Corp, vecka 39: mån 21 sep 4 h, tis 22 sep 4 h, ons 23 sep 4,5 h");
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
                .body("items[0].title", is("Nora Lind stängde augusti 2026")).body("items[0].body", org.hamcrest.Matchers.matchesPattern("Notify Corp: 96 h, 15\\p{Z}840\\p{Z}kr"))
                .body("items[0].detail", is("Inget ändras förrän den öppnas igen. Dela ditt kort från Profil."))
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
        assertThat(messagesTo("ExponentPushToken[nt-live]").get(0).get("title")).isEqualTo("Nora Lind reopened August 2026");
        assertThat(messagesTo("ExponentPushToken[nt-live]").get(0).get("body")).isEqualTo("Notify Corp: entries can change again");
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
