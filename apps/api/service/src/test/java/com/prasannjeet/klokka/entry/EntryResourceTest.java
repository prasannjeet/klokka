package com.prasannjeet.klokka.entry;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.MutableClock;
import com.prasannjeet.klokka.support.TestData;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// Entries (CHQ-117 PUT/DELETE with rounding and history, CHQ-118 batch, CHQ-119 history, CHQ-123 listing, CHQ-132
// coalescing of one sitting into one notification row).
@QuarkusTest
class EntryResourceTest {

    private static final String NORA = "usr_en_nora";
    private static final String MARIA = "usr_en_maria";
    private static final String JONAS = "usr_en_jonas";

    @Inject
    AgroalDataSource dataSource;

    @Inject
    MutableClock clock;

    TestData data;
    UUID ws;
    UUID maria;
    UUID jonas;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        data.user(NORA, "nora@cafenord.example", "Nora Lind");
        data.user(MARIA, "maria@example.com", "Maria Lind");
        data.user(JONAS, "jonas@example.com", "Jonas Berg");
        ws = data.workspace("Entries Corp", "entries-" + UUID.randomUUID().toString().substring(0, 8), true, "HALF", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@example.com", new BigDecimal("170.00"), "ACTIVE");
        jonas = data.member(ws, JONAS, "EMPLOYEE", "Jonas Berg", "jonas@example.com", new BigDecimal("150.00"), "ACTIVE");
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void putRoundsByTheWorkspaceRuleKeepsHistoryAndCoalescesTheNotification() {
        String base = "/v1/workspaces/" + ws + "/members/" + maria + "/entries/";
        String entryId = given().contentType("application/json").body("{\"hours\":3.8,\"note\":\"Opened early\"}")
                .when().put(base + "2026-09-21").then().statusCode(200)
                .body("hours", is(4.0f)).body("note", is("Opened early")).body("earnings", is(680.0f))
                .body("memberName", is("Maria Lind")).body("createdBy.name", is("Nora Lind")).body("changeCount", is(1)).body("locked", is(false))
                .extract().path("id");
        given().contentType("application/json").body("{\"hours\":6.2}")
                .when().put(base + "2026-09-21").then().statusCode(200)
                .body("id", is(entryId)).body("hours", is(6.0f)).body("note", nullValue()).body("changeCount", is(2));
        // The same value again changes nothing: no history row, no notification change.
        given().contentType("application/json").body("{\"hours\":6}")
                .when().put(base + "2026-09-21").then().statusCode(200).body("changeCount", is(2));
        given().contentType("application/json").body("{\"hours\":4}")
                .when().put(base + "2026-09-22").then().statusCode(200);

        given().when().get("/v1/workspaces/" + ws + "/entries/" + entryId + "/history").then().statusCode(200)
                .body("size()", is(2))
                .body("[0].kind", is("UPDATED")).body("[0].hoursBefore", is(4.0f)).body("[0].hoursAfter", is(6.0f))
                .body("[0].noteBefore", is("Opened early")).body("[0].noteAfter", nullValue())
                .body("[1].kind", is("CREATED")).body("[1].hoursAfter", is(4.0f)).body("[1].changedBy.userId", is(NORA));

        // One sitting, one HOURS_CHANGED row for Maria carrying both days, due after the quiet window.
        List<List<Object>> rows = data.query("select kind, payload->'changes'->'2026-09-21'->>'after', payload->'changes'->'2026-09-22'->>'after', "
                + "payload->>'changeCount', push_due_at, pushed_at from notification where logto_user_id = ? and workspace_id = ?", MARIA, ws);
        assertThat(rows).containsExactly(java.util.Arrays.asList("HOURS_CHANGED", "6.0", "4.00", "3", MutableClock.DEFAULT.plusSeconds(120), null));
        given().when().get("/v1/notifications").then().statusCode(200).body("items", hasSize(0));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void deleteIsSoftKeepsHistoryAndIsRepeatSafe() {
        String base = "/v1/workspaces/" + ws + "/members/" + jonas + "/entries/";
        String entryId = given().contentType("application/json").body("{\"hours\":8}").when().put(base + "2026-09-23").then().statusCode(200).extract().path("id");
        given().when().delete(base + "2026-09-23").then().statusCode(204);
        given().when().delete(base + "2026-09-23").then().statusCode(204);
        assertThat(data.scalar("select deleted_at from hour_entry where id = ?::uuid", entryId)).isNotNull();
        given().when().get("/v1/workspaces/" + ws + "/entries?from=2026-09-21&to=2026-09-27&membershipId=" + jonas).then().statusCode(200).body("size()", is(0));
        given().when().get("/v1/workspaces/" + ws + "/entries/" + entryId + "/history").then().statusCode(200)
                .body("[0].kind", is("DELETED")).body("[0].hoursBefore", is(8.0f)).body("[0].hoursAfter", nullValue());
        // Re-adding the day creates a fresh live row (the old one stays as history).
        given().contentType("application/json").body("{\"hours\":2}").when().put(base + "2026-09-23").then().statusCode(200)
                .body("id", is(org.hamcrest.Matchers.not(entryId))).body("hours", is(2.0f));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aLockedMonthRefusesEveryWrite() {
        given().when().put("/v1/workspaces/" + ws + "/months/2026-08/lock").then().statusCode(200).body("locked", is(true));
        given().contentType("application/json").body("{\"hours\":4}")
                .when().put("/v1/workspaces/" + ws + "/members/" + maria + "/entries/2026-08-03")
                .then().statusCode(409).body("code", is("MONTH_LOCKED"));
        given().contentType("application/json")
                .body("{\"items\":[{\"membershipId\":\"" + maria + "\",\"workDate\":\"2026-09-07\",\"hours\":4},{\"membershipId\":\"" + maria + "\",\"workDate\":\"2026-08-31\",\"hours\":4}]}")
                .when().post("/v1/workspaces/" + ws + "/entries/batch")
                .then().statusCode(409).body("code", is("MONTH_LOCKED"))
                // Only the cell in the closed month is named, so the grid rings that one and not the open September cell.
                .body("errors", hasSize(1)).body("errors[0].field", is("items[1].workDate")).body("errors[0].message", is("August 2026 is closed"));
        assertThat(data.count("select count(*) from hour_entry where membership_id = ? and work_date = '2026-09-07'", maria)).isZero();
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void theBatchIsAtomicValidatedAsAWholeAndNotifiesEachMemberOnce() {
        String invalid = "{\"items\":[{\"membershipId\":\"" + maria + "\",\"workDate\":\"2026-09-14\",\"hours\":4},"
                + "{\"membershipId\":\"" + UUID.randomUUID() + "\",\"workDate\":\"2026-09-15\",\"hours\":4}]}";
        given().contentType("application/json").body(invalid).when().post("/v1/workspaces/" + ws + "/entries/batch")
                .then().statusCode(400).body("code", is("VALIDATION")).body("errors[0].field", is("items[1].membershipId"));
        assertThat(data.count("select count(*) from hour_entry where membership_id = ? and work_date = '2026-09-14'", maria)).isZero();

        data.entry(ws, jonas, LocalDate.of(2026, 9, 16), new BigDecimal("5.00"), null, NORA);
        String batch = "{\"items\":["
                + "{\"membershipId\":\"" + maria + "\",\"workDate\":\"2026-09-14\",\"hours\":4,\"note\":\"Counter\"},"
                + "{\"membershipId\":\"" + maria + "\",\"workDate\":\"2026-09-15\",\"hours\":4.3},"
                + "{\"membershipId\":\"" + jonas + "\",\"workDate\":\"2026-09-16\",\"hours\":null},"
                + "{\"membershipId\":\"" + jonas + "\",\"workDate\":\"2026-09-17\",\"hours\":null}]}";
        given().contentType("application/json").body(batch).when().post("/v1/workspaces/" + ws + "/entries/batch")
                .then().statusCode(200)
                .body("saved", hasSize(2))
                .body("saved[1].hours", is(4.5f))
                .body("removed", hasSize(1))
                .body("removed[0].workDate", is("2026-09-16"))
                .body("membersNotified", is(2));
        assertThat(data.count("select count(*) from notification where workspace_id = ? and kind = 'HOURS_CHANGED'", ws)).isEqualTo(2);
        assertThat(data.count("select count(*) from hour_entry_change c join hour_entry e on e.id = c.entry_id where e.workspace_id = ? and c.kind in ('CREATED','UPDATED','DELETED')", ws)).isEqualTo(4);
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void anEmployeeReadsTheirOwnEntriesOnlyAndCannotWrite() {
        data.entry(ws, maria, LocalDate.of(2026, 9, 21), new BigDecimal("4.00"), null, NORA);
        UUID jonasEntry = data.entry(ws, jonas, LocalDate.of(2026, 9, 21), new BigDecimal("7.00"), null, NORA);
        given().when().get("/v1/workspaces/" + ws + "/entries?from=2026-09-21&to=2026-09-27&membershipId=" + jonas)
                .then().statusCode(200).body("size()", is(1)).body("[0].membershipId", is(maria.toString())).body("[0].earnings", is(680.0f));
        given().when().get("/v1/workspaces/" + ws + "/entries/" + jonasEntry + "/history").then().statusCode(403);
        given().contentType("application/json").body("{\"hours\":8}")
                .when().put("/v1/workspaces/" + ws + "/members/" + maria + "/entries/2026-09-22").then().statusCode(403);
        given().when().get("/v1/workspaces/" + ws + "/entries?from=2026-01-01&to=2026-12-31").then().statusCode(400).body("code", is("VALIDATION"));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aDeactivatedMemberCannotBeLoggedFor() {
        data.run("update membership set status = 'DEACTIVATED', deactivated_at = now() where id = ?", jonas);
        given().contentType("application/json").body("{\"hours\":8}")
                .when().put("/v1/workspaces/" + ws + "/members/" + jonas + "/entries/2026-09-22")
                .then().statusCode(409).body("code", is("MEMBER_NOT_ACTIVE"));
    }
}
