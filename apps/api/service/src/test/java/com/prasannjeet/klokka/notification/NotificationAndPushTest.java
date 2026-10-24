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
        // Maria's rows still open from an earlier test would be pushed by this test's sweeps: close them first.
        data.run("update notification set pushed_at = now() where logto_user_id = ? and pushed_at is null", MARIA);
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

    // One sitting's payload: a job per (date, kind, startTime, placeName), keyed by its own job id.
    private static Map<String, Object> jobSitting(Object... dateKindTimePlace) {
        Map<String, Object> jobs = new java.util.LinkedHashMap<>();
        for (int i = 0; i < dateKindTimePlace.length; i += 4) {
            Map<String, Object> job = new java.util.HashMap<>();
            job.put("date", dateKindTimePlace[i].toString());
            job.put("kind", dateKindTimePlace[i + 1]);
            job.put("startTime", dateKindTimePlace[i + 2]);
            job.put("placeName", dateKindTimePlace[i + 3]);
            job.put("hours", new BigDecimal("3"));
            jobs.put(UUID.randomUUID().toString(), job);
        }
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("actorName", "Anna Admin");
        payload.put("jobs", jobs);
        return payload;
    }

    private NotificationTexts.Rendered jobs(Map<String, Object> payload, Language lang) {
        return texts.render(NotificationKind.JOB_CHANGED, payload, lang, "Kafé Nord", "SEK");
    }

    // CHQ-188: one job names what happened and when; several count the jobs, give the range and list the first five.
    @Test
    void jobTextsSayWhatHappenedToWhichJobs() {
        var added = jobs(jobSitting("2026-09-28", "ADDED", "09:00", "Café Nord"), Language.EN);
        assertThat(added.title()).isEqualTo("Anna Admin added a job for you");
        assertThat(added.body()).isEqualTo("Kafé Nord: Monday 28 Sept, 09:00 at Café Nord");
        assertThat(added.detail()).isNull();
        var addedSv = jobs(jobSitting("2026-09-28", "ADDED", "09:00", "Café Nord"), Language.SV);
        assertThat(addedSv.title()).isEqualTo("Anna Admin la till ett jobb åt dig");
        assertThat(addedSv.body()).isEqualTo("Kafé Nord: måndag 28 sep kl. 09:00 på Café Nord");
        var changed = jobs(jobSitting("2026-09-28", "CHANGED", "10:00", null), Language.EN);
        assertThat(changed.title()).isEqualTo("Anna Admin changed your job");
        assertThat(changed.body()).isEqualTo("Kafé Nord: Monday 28 Sept, 10:00");
        var removed = jobs(jobSitting("2026-09-28", "REMOVED", null, null), Language.SV);
        assertThat(removed.title()).isEqualTo("Anna Admin tog bort ditt jobb");
        assertThat(removed.body()).isEqualTo("Kafé Nord: måndag 28 sep");
        var placeOnly = jobs(jobSitting("2026-09-28", "CHANGED", null, "Café Nord"), Language.EN);
        assertThat(placeOnly.body()).isEqualTo("Kafé Nord: Monday 28 Sept at Café Nord");

        var six = jobs(jobSitting("2026-09-23", "ADDED", "09:00", null, "2026-09-30", "ADDED", "09:00", null,
                "2026-10-07", "ADDED", "09:00", null, "2026-10-14", "ADDED", "09:00", null, "2026-10-21", "ADDED", "09:00", null,
                "2026-10-28", "ADDED", "09:00", null), Language.EN);
        assertThat(six.title()).isEqualTo("Anna Admin added 6 jobs for you");
        assertThat(six.body()).isEqualTo("Kafé Nord: Wed 23 Sept to Wed 28 Oct");
        assertThat(six.detail()).isEqualTo("Wed 23 Sept, Wed 30 Sept, Wed 7 Oct, Wed 14 Oct, Wed 21 Oct and 1 more");
        var twoRemovedSv = jobs(jobSitting("2026-09-23", "REMOVED", null, null, "2026-09-30", "REMOVED", null, null), Language.SV);
        assertThat(twoRemovedSv.title()).isEqualTo("Anna Admin tog bort 2 jobb");
        assertThat(twoRemovedSv.body()).isEqualTo("Kafé Nord: ons 23 sep till ons 30 sep");
        assertThat(twoRemovedSv.detail()).isEqualTo("ons 23 sep, ons 30 sep");
        var mixed = jobs(jobSitting("2026-09-23", "ADDED", null, null, "2026-09-30", "REMOVED", null, null), Language.EN);
        assertThat(mixed.title()).isEqualTo("Anna Admin changed 2 jobs");

        // Review fix: jobs are counted, not dates; a job removed and another added on the same date read as one change.
        var twoOnADay = jobs(jobSitting("2026-09-28", "ADDED", "09:00", null, "2026-09-28", "ADDED", "14:00", null), Language.EN);
        assertThat(twoOnADay.title()).isEqualTo("Anna Admin added 2 jobs for you");
        assertThat(twoOnADay.body()).isEqualTo("Kafé Nord: Monday 28 Sept");
        assertThat(twoOnADay.detail()).isNull();
        var replaced = jobs(jobSitting("2026-09-28", "REMOVED", "09:00", null, "2026-09-28", "ADDED", "10:00", null), Language.EN);
        assertThat(replaced.title()).isEqualTo("Anna Admin changed your job");
        assertThat(replaced.body()).isEqualTo("Kafé Nord: Monday 28 Sept, 10:00");
    }

    // CHQ-191: one job with a title names the title instead of its place; a payload without one reads as before.
    @Test
    void jobTextsNameTheTitleWhenTheJobHasOne() {
        Map<String, Object> titled = jobSitting("2026-09-28", "ADDED", "09:00", "Café Nord");
        titledJob(titled).put("title", "Window cleaning");
        assertThat(jobs(titled, Language.EN).body()).isEqualTo("Kafé Nord: Monday 28 Sept, 09:00, Window cleaning");
        assertThat(jobs(titled, Language.SV).body()).isEqualTo("Kafé Nord: måndag 28 sep kl. 09:00, Window cleaning");
        Map<String, Object> noTime = jobSitting("2026-09-28", "CHANGED", null, null);
        titledJob(noTime).put("title", "Window cleaning");
        assertThat(jobs(noTime, Language.EN).body()).isEqualTo("Kafé Nord: Monday 28 Sept, Window cleaning");
        // Positive control: a blank title is no title, the place line stays.
        Map<String, Object> blank = jobSitting("2026-09-28", "ADDED", "09:00", "Café Nord");
        titledJob(blank).put("title", " ");
        assertThat(jobs(blank, Language.EN).body()).isEqualTo("Kafé Nord: Monday 28 Sept, 09:00 at Café Nord");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> titledJob(Map<String, Object> sitting) {
        return (Map<String, Object>) ((Map<String, Object>) sitting.get("jobs")).values().iterator().next();
    }

    // A title-only edit is news, and the row's payload carries the title the push names.
    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aTitleOnlyEditIsNewsAndThePushNamesTheTitle() {
        UUID entry = data.entry(ws, maria, java.time.LocalDate.parse("2026-09-14"), new BigDecimal("4"), null, NORA);
        given().contentType("application/json").body("{\"hours\":4,\"title\":\"Window cleaning\"}")
                .when().put("/v1/workspaces/" + ws + "/jobs/" + jobId(entry)).then().statusCode(200);
        assertThat(jobRows()).containsExactly(List.of("JOB_CHANGED", "2026-09-14:CHANGED"));
        assertThat(data.scalar("select j.value->>'title' from notification n, jsonb_each(n.payload->'jobs') j "
                + "where n.logto_user_id = ? and n.workspace_id = ?", MARIA, ws)).isEqualTo("Window cleaning");
        data.pushToken(MARIA, "ExponentPushToken[nt-title]");
        clock.set(MutableClock.DEFAULT.plusSeconds(10 * 60 + 30));
        sweeper.sweep();
        List<Map<String, Object>> sent = messagesTo("ExponentPushToken[nt-title]");
        assertThat(sent).hasSize(1);
        assertThat(sent.get(0).get("body")).isEqualTo("Notify Corp: måndag 14 sep, Window cleaning");
    }

    // An open-ended series is planned a year ahead, so its range spans two years and needs them to make sense.
    @Test
    void jobRangeAcrossYearsNamesTheYears() {
        var series = jobs(jobSitting("2026-11-18", "ADDED", "09:00", null, "2027-11-17", "ADDED", "09:00", null), Language.EN);
        assertThat(series.body()).isEqualTo("Kafé Nord: 18 November 2026 to 17 November 2027");
        var seriesSv = jobs(jobSitting("2026-11-18", "ADDED", "09:00", null, "2027-11-17", "ADDED", "09:00", null), Language.SV);
        assertThat(seriesSv.body()).isEqualTo("Kafé Nord: 18 november 2026 till 17 november 2027");
    }

    private String jobId(UUID entry) {
        return data.scalar("select id from job where entry_id = ?", entry).toString();
    }

    // The test clock is fixed, so rows of two sittings share created_at: the pushed (earlier) sitting sorts first.
    private List<List<Object>> jobRows() {
        return data.query("select kind, (select string_agg((j.value->>'date') || ':' || (j.value->>'kind'), ',' "
                + "order by j.value->>'date', j.value->>'kind') "
                + "from jsonb_each(n.payload->'jobs') j) from notification n where logto_user_id = ? and workspace_id = ? "
                + "order by created_at, pushed_at nulls last, kind", MARIA, ws);
    }

    // A start-time-only or place-only edit is news even though the day's hours stay the same, past dates included;
    // it is a JOB_CHANGED row (no HOURS_CHANGED), pushed on the jobs channel and linking to the day.
    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aStartTimeOrPlaceOnlyEditIsOneJobChangedRowOnTheJobsChannel() {
        UUID entry = data.entry(ws, maria, java.time.LocalDate.parse("2026-09-14"), new BigDecimal("4"), null, NORA);
        String job = jobId(entry);
        given().contentType("application/json").body("{\"hours\":4,\"startTime\":\"10:00\"}")
                .when().put("/v1/workspaces/" + ws + "/jobs/" + job).then().statusCode(200);
        assertThat(jobRows()).containsExactly(List.of("JOB_CHANGED", "2026-09-14:CHANGED"));

        data.pushToken(MARIA, "ExponentPushToken[nt-jobs]");
        clock.set(MutableClock.DEFAULT.plusSeconds(10 * 60 + 30));
        sweeper.sweep();
        List<Map<String, Object>> sent = messagesTo("ExponentPushToken[nt-jobs]");
        assertThat(sent).hasSize(1);
        assertThat(sent.get(0).get("title")).isEqualTo("Nora Lind ändrade ditt jobb");
        assertThat(sent.get(0).get("body")).isEqualTo("Notify Corp: måndag 14 sep kl. 10:00");
        assertThat(sent.get(0).get("channelId")).isEqualTo("jobs");
        assertThat(((Map<String, Object>) sent.get(0).get("data")).get("url")).isEqualTo("/w/" + ws + "/members/" + maria + "/day/2026-09-14");

        // The pushed row is closed; a place-only edit opens a new sitting.
        given().contentType("application/json").body("{\"hours\":4,\"startTime\":\"10:00\",\"location\":{\"name\":\"Café Nord\","
                + "\"latitude\":59.33459,\"longitude\":18.06324}}")
                .when().put("/v1/workspaces/" + ws + "/jobs/" + job).then().statusCode(200);
        assertThat(jobRows()).containsExactly(List.of("JOB_CHANGED", "2026-09-14:CHANGED"), List.of("JOB_CHANGED", "2026-09-14:CHANGED"));
        // The same values again are no news (the open row is closed first, so a new one would show).
        data.run("update notification set pushed_at = now() where logto_user_id = ? and workspace_id = ?", MARIA, ws);
        given().contentType("application/json").body("{\"hours\":4,\"startTime\":\"10:00\",\"location\":{\"name\":\"Café Nord\","
                + "\"latitude\":59.33459,\"longitude\":18.06324}}")
                .when().put("/v1/workspaces/" + ws + "/jobs/" + job).then().statusCode(200);
        assertThat(jobRows()).hasSize(2);
    }

    // A new series is one row listing every date; a schedule change that removes and re-adds a date says changed.
    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aSeriesIsOneRowAndAScheduleChangeReadsAsChanged() {
        String body = "{\"hours\":3,\"startTime\":\"09:00\",\"requestId\":\"" + UUID.randomUUID() + "\",\"recurrence\":"
                + "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"WEDNESDAY\"],\"periodCount\":6}}";
        String first = given().contentType("application/json").body(body)
                .when().post("/v1/workspaces/" + ws + "/members/" + maria + "/entries/2026-09-23/jobs").then().statusCode(201)
                .extract().path("jobs[0].id");
        assertThat(jobRows()).containsExactly(List.of("JOB_CHANGED", "2026-09-23:ADDED,2026-09-30:ADDED,2026-10-07:ADDED,"
                + "2026-10-14:ADDED,2026-10-21:ADDED,2026-10-28:ADDED"));

        data.pushToken(MARIA, "ExponentPushToken[nt-series]");
        clock.set(MutableClock.DEFAULT.plusSeconds(10 * 60 + 30));
        sweeper.sweep();
        List<Map<String, Object>> sent = messagesTo("ExponentPushToken[nt-series]");
        assertThat(sent).hasSize(1);
        assertThat(sent.get(0).get("title")).isEqualTo("Nora Lind la till 6 jobb åt dig");
        assertThat(sent.get(0).get("body")).isEqualTo("Notify Corp: ons 23 sep till ons 28 okt");
        assertThat(((Map<String, Object>) sent.get(0).get("data")).get("url")).isEqualTo("/w/" + ws + "/members/" + maria + "/month/2026-09");

        String change = "{\"hours\":5,\"startTime\":\"09:00\",\"requestId\":\"" + UUID.randomUUID() + "\",\"recurrence\":"
                + "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"WEDNESDAY\"],\"periodCount\":2}}";
        given().contentType("application/json").body(change)
                .when().put("/v1/workspaces/" + ws + "/jobs/" + first + "?scope=THIS_AND_FUTURE").then().statusCode(200);
        assertThat(jobRows()).hasSize(2);
        // The rewrite removes every job and adds new ones on the first two dates: those dates read as changed.
        assertThat(jobRows().get(1)).containsExactly("JOB_CHANGED", "2026-09-23:ADDED,2026-09-23:REMOVED,2026-09-30:ADDED,"
                + "2026-09-30:REMOVED,2026-10-07:REMOVED,2026-10-14:REMOVED,2026-10-21:REMOVED,2026-10-28:REMOVED");
        assertThat(openJobRow().title()).isEqualTo("Nora Lind changed 6 jobs");
    }

    // The open JOB_CHANGED row, rendered in English.
    private NotificationTexts.Rendered openJobRow() {
        String json = data.scalar("select payload::text from notification where logto_user_id = ? and workspace_id = ? "
                + "and kind = 'JOB_CHANGED' and pushed_at is null", MARIA, ws).toString();
        try {
            return jobs(new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, Map.class), Language.EN);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    // Review fix: a sitting is merged per job, so two jobs on one date are two jobs, and adding one job while removing
    // another on the same date is still news (it reads as a change).
    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aSittingCountsJobsNotDates() {
        String path = "/v1/workspaces/" + ws + "/members/" + maria + "/entries/2026-09-21/jobs";
        String b = given().contentType("application/json").body("{\"hours\":2,\"startTime\":\"08:00\"}")
                .when().post(path).then().statusCode(201).extract().path("jobs[0].id");
        given().contentType("application/json").body("{\"hours\":2,\"startTime\":\"13:00\"}")
                .when().post(path).then().statusCode(201);
        assertThat(jobRows()).containsExactly(List.of("JOB_CHANGED", "2026-09-21:ADDED,2026-09-21:ADDED"));
        assertThat(openJobRow().title()).isEqualTo("Nora Lind added 2 jobs for you");

        data.run("update notification set pushed_at = now() where logto_user_id = ? and workspace_id = ?", MARIA, ws);
        given().contentType("application/json").body("{\"hours\":3,\"startTime\":\"16:00\"}")
                .when().post(path).then().statusCode(201);
        given().when().delete("/v1/workspaces/" + ws + "/jobs/" + b).then().statusCode(204);
        assertThat(jobRows().get(1)).containsExactly("JOB_CHANGED", "2026-09-21:ADDED,2026-09-21:REMOVED");
        assertThat(openJobRow().title()).isEqualTo("Nora Lind changed your job");
        assertThat(openJobRow().body()).isEqualTo("Kafé Nord: Monday 21 Sept, 16:00");
    }

    // Added and removed again before the push is no news; the week grid's day-level writes still say HOURS_CHANGED.
    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aJobAddedAndRemovedIsNoNewsAndTheWeekGridStaysHours() {
        String job = given().contentType("application/json").body("{\"hours\":2,\"startTime\":\"08:00\"}")
                .when().post("/v1/workspaces/" + ws + "/members/" + maria + "/entries/2026-09-21/jobs").then().statusCode(201)
                .extract().path("jobs[0].id");
        assertThat(jobRows()).containsExactly(List.of("JOB_CHANGED", "2026-09-21:ADDED"));
        given().when().delete("/v1/workspaces/" + ws + "/jobs/" + job).then().statusCode(204);
        assertThat(jobRows()).as("added and removed within the quiet window").isEmpty();

        given().contentType("application/json")
                .body("{\"items\":[{\"membershipId\":\"" + maria + "\",\"workDate\":\"2026-09-22\",\"hours\":4}]}")
                .when().post("/v1/workspaces/" + ws + "/entries/batch").then().statusCode(200);
        assertThat(jobRows()).extracting(r -> r.get(0)).containsExactly("HOURS_CHANGED");
    }

    private static List<Map<String, Object>> messagesTo(String token) {
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (List<Map<String, Object>> batch : Fake.<List<Map<String, Object>>>list("pushSends")) {
            for (Map<String, Object> m : batch) if (token.equals(m.get("to"))) out.add(m);
        }
        return out;
    }
}
