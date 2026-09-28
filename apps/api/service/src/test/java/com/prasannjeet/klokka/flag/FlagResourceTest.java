package com.prasannjeet.klokka.flag;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

import com.prasannjeet.klokka.support.Fake;
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

// Flags (CHQ-135): raise on your own entry, one open at a time, FIX goes through the entries funnel with history,
// DISMISS keeps the entry; both sides are notified.
@QuarkusTest
class FlagResourceTest {

    private static final String NORA = "usr_fl_nora";
    private static final String MARIA = "usr_fl_maria";
    private static final String JONAS = "usr_fl_jonas";

    @Inject
    AgroalDataSource dataSource;

    TestData data;
    UUID ws;
    UUID maria;
    UUID jonas;
    UUID entry;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        data.user(NORA, "nora@cafenord.example", "Nora Lind");
        data.user(MARIA, "maria@example.com", "Maria Lind");
        data.user(JONAS, "jonas@example.com", "Jonas Berg");
        ws = data.workspace("Flag Corp", "flag-" + UUID.randomUUID().toString().substring(0, 8), false, "QUARTER", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@example.com", null, "ACTIVE");
        jonas = data.member(ws, JONAS, "EMPLOYEE", "Jonas Berg", "jonas@example.com", null, "ACTIVE");
        entry = data.entry(ws, maria, LocalDate.of(2026, 9, 22), new BigDecimal("4.00"), null, NORA);
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void theEntrysMemberRaisesOneOpenFlagAndTheEmployerIsTold() {
        String flagId = given().contentType("application/json").body("{\"reason\":\"MORE\",\"message\":\"I stayed until closing, 6 h not 4.\",\"suggestedHours\":6}")
                .when().post("/v1/workspaces/" + ws + "/entries/" + entry + "/flags")
                .then().statusCode(201)
                .body("entryId", is(entry.toString())).body("membershipId", is(maria.toString())).body("memberName", is("Maria Lind"))
                .body("workDate", is("2026-09-22")).body("loggedHours", is(4.0f)).body("suggestedHours", is(6)).body("reason", is("MORE"))
                .body("status", is("OPEN")).body("raisedBy.userId", is(MARIA)).body("resolvedAt", nullValue())
                .extract().path("id");
        given().contentType("application/json").body("{\"reason\":\"LESS\",\"message\":\"again\"}")
                .when().post("/v1/workspaces/" + ws + "/entries/" + entry + "/flags")
                .then().statusCode(409).body("code", is("FLAG_ALREADY_OPEN"));
        assertThat(data.query("select kind, flag_id from hour_entry_change where entry_id = ? order by seq", entry))
                .containsExactly(java.util.Arrays.asList("CREATED", null), java.util.Arrays.asList("FLAGGED", UUID.fromString(flagId)));
        assertThat(data.query("select kind from notification where logto_user_id = ? and workspace_id = ?", NORA, ws)).containsExactly(List.of("ENTRY_FLAGGED"));
        given().when().get("/v1/workspaces/" + ws + "/flags").then().statusCode(200).body("", hasSize(1)).body("[0].id", is(flagId));
        given().when().get("/v1/workspaces/" + ws + "/entries?from=2026-09-21&to=2026-09-27").then().statusCode(200)
                .body("[0].flag.id", is(flagId)).body("[0].flag.status", is("OPEN"));
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void oneFlagIsReadableByItsMember() {
        String flagId = given().contentType("application/json").body("{\"reason\":\"MORE\",\"suggestedHours\":6,\"message\":\"I worked 6 h\"}")
                .when().post("/v1/workspaces/" + ws + "/entries/" + entry + "/flags").then().statusCode(201).extract().path("id");
        given().when().get("/v1/workspaces/" + ws + "/flags/" + flagId).then().statusCode(200)
                .body("id", is(flagId)).body("status", is("OPEN")).body("memberName", is("Maria Lind")).body("suggestedHours", is(6.0f));
        given().when().get("/v1/workspaces/" + ws + "/flags/" + UUID.randomUUID()).then().statusCode(404).body("code", is("NOT_FOUND"));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void theEmployerReadsAnyFlagOfTheWorkspace() {
        UUID flagId = UUID.randomUUID();
        data.run("insert into entry_flag (id, workspace_id, entry_id, membership_id, raised_by, reason, message, logged_hours, status) values (?, ?, ?, ?, ?, 'MORE', 'x', 4, 'OPEN')",
                flagId, ws, entry, maria, MARIA);
        given().when().get("/v1/workspaces/" + ws + "/flags/" + flagId).then().statusCode(200)
                .body("id", is(flagId.toString())).body("membershipId", is(maria.toString())).body("entryId", is(entry.toString()));
    }

    @Test
    @TestSecurity(user = JONAS)
    @OidcSecurity(claims = {@Claim(key = "sub", value = JONAS)})
    void anotherMemberCannotFlagOrSeeIt() {
        given().contentType("application/json").body("{\"reason\":\"MORE\",\"message\":\"not mine\"}")
                .when().post("/v1/workspaces/" + ws + "/entries/" + entry + "/flags").then().statusCode(403);
        UUID flagId = UUID.randomUUID();
        data.run("insert into entry_flag (id, workspace_id, entry_id, membership_id, raised_by, reason, message, logged_hours, status) values (?, ?, ?, ?, ?, 'MORE', 'x', 4, 'OPEN')",
                flagId, ws, entry, maria, MARIA);
        given().when().get("/v1/workspaces/" + ws + "/flags").then().statusCode(200).body("", hasSize(0));
        // Someone else's flag is a 404, not a hint that it exists.
        given().when().get("/v1/workspaces/" + ws + "/flags/" + flagId).then().statusCode(404).body("code", is("NOT_FOUND"));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void fixWritesTheEntryThroughTheFunnelAndDismissKeepsIt() {
        UUID flag = UUID.randomUUID();
        data.run("insert into entry_flag (id, workspace_id, entry_id, membership_id, raised_by, reason, message, logged_hours, suggested_hours, status) values (?, ?, ?, ?, ?, 'MORE', 'x', 4, 6, 'OPEN')",
                flag, ws, entry, maria, MARIA);
        given().contentType("application/json").body("{\"action\":\"FIX\"}")
                .when().post("/v1/workspaces/" + ws + "/flags/" + flag + "/resolve").then().statusCode(400).body("code", is("VALIDATION"));
        given().contentType("application/json").body("{\"action\":\"FIX\",\"hours\":5.9,\"note\":\"You are right.\"}")
                .when().post("/v1/workspaces/" + ws + "/flags/" + flag + "/resolve").then().statusCode(200)
                .body("status", is("FIXED")).body("resolvedBy.name", is("Nora Lind")).body("resolution.action", is("FIX")).body("resolution.hours", is(6.0f)).body("resolution.note", is("You are right."));
        assertThat(data.scalar("select hours from hour_entry where id = ?", entry)).isEqualTo(new BigDecimal("6.00"));
        assertThat(data.query("select kind from hour_entry_change where entry_id = ? order by seq", entry))
                .containsExactly(List.of("CREATED"), List.of("UPDATED"), List.of("FLAG_FIXED"));
        assertThat(data.query("select kind, payload->>'action', payload->>'hours' from notification where logto_user_id = ? and workspace_id = ?", MARIA, ws))
                .containsExactly(List.of("FLAG_RESOLVED", "FIX", "6.00"));
        given().contentType("application/json").body("{\"action\":\"DISMISS\"}")
                .when().post("/v1/workspaces/" + ws + "/flags/" + flag + "/resolve").then().statusCode(409).body("code", is("CONFLICT"));

        UUID second = data.entry(ws, maria, LocalDate.of(2026, 9, 23), new BigDecimal("3.00"), null, NORA);
        UUID flag2 = UUID.randomUUID();
        data.run("insert into entry_flag (id, workspace_id, entry_id, membership_id, raised_by, reason, message, logged_hours, status) values (?, ?, ?, ?, ?, 'NOT_IN', 'x', 3, 'OPEN')",
                flag2, ws, second, maria, MARIA);
        given().contentType("application/json").body("{\"action\":\"DISMISS\",\"note\":\"The rota says you were in.\"}")
                .when().post("/v1/workspaces/" + ws + "/flags/" + flag2 + "/resolve").then().statusCode(200)
                .body("status", is("DISMISSED")).body("resolution.action", is("DISMISS")).body("resolution.hours", nullValue());
        assertThat(data.scalar("select hours from hour_entry where id = ?", second)).isEqualTo(new BigDecimal("3.00"));
        given().when().get("/v1/workspaces/" + ws + "/flags?status=DISMISSED").then().statusCode(200).body("", hasSize(1)).body("[0].id", is(flag2.toString()));
        given().when().get("/v1/workspaces/" + ws + "/flags").then().statusCode(200).body("", hasSize(2));
    }
}
