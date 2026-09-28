package com.prasannjeet.klokka.member;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.notNullValue;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// /workspaces/{id}/members (CHQ-113 invite and resend, CHQ-116 management, CHQ-127 who sees rates).
@QuarkusTest
@SuppressWarnings("unchecked")
class MemberResourceTest {

    private static final String NORA = "usr_mb_nora";
    private static final String MARIA = "usr_mb_maria";

    @Inject
    AgroalDataSource dataSource;

    @Inject
    MutableClock clock;

    TestData data;
    UUID ws;
    UUID employer;
    UUID maria;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        data.user(NORA, "nora@cafenord.example", "Nora Lind");
        data.user(MARIA, "maria@example.com", "Maria Lind");
        ws = data.workspace("Members Corp", "members-" + UUID.randomUUID().toString().substring(0, 8), true, "NONE", "Europe/Stockholm");
        employer = data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@example.com", new BigDecimal("170.00"), "ACTIVE");
        data.entry(ws, maria, LocalDate.of(2026, 9, 21), new BigDecimal("4.00"), "Counter", NORA);
        data.entry(ws, maria, LocalDate.of(2026, 9, 22), new BigDecimal("6.50"), null, NORA);
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void invitingCreatesTheLogtoInvitationAndAnInvitedMemberWithALedgerRow() {
        String id = given().contentType("application/json")
                .body("{\"name\":\"Lina Ahmed\",\"email\":\"Lina.Ahmed@Example.com\",\"hourlyRate\":160}")
                .when().post("/v1/workspaces/" + ws + "/members")
                .then().statusCode(201)
                .body("displayName", is("Lina Ahmed"))
                .body("email", is("lina.ahmed@example.com"))
                .body("status", is("INVITED"))
                .body("hourlyRate", is(160))
                .body("invitation.status", is("PENDING"))
                .body("invitation.resendCount", is(0))
                .body("invitation.expiresAt", is("2026-09-30T12:00:00Z"))
                .body("month.hours", is(0))
                .extract().path("id");
        String token = (String) data.scalar("select invitation_token from membership where id = ?::uuid", id);
        assertThat(token).startsWith("inv_").hasSize(36);
        List<Map<String, Object>> invitations = Fake.list("invitations");
        assertThat(invitations).hasSize(1);
        Map<String, Object> invitation = invitations.get(0);
        assertThat(invitation.get("organizationId")).isEqualTo(data.scalar("select logto_org_id from workspace where id = ?", ws));
        assertThat(invitation.get("invitee")).isEqualTo("lina.ahmed@example.com");
        assertThat(invitation.get("inviterId")).isEqualTo(NORA);
        assertThat((List<Object>) invitation.get("organizationRoleIds")).containsExactly("0ibpq0bo3w9b8p926ykrd");
        assertThat(((Map<String, Object>) invitation.get("messagePayload")).get("link")).isEqualTo("https://app.klokka.test/join?token=" + token);
        assertThat(((Number) invitation.get("expiresAt")).longValue()).isEqualTo(java.time.Instant.parse("2026-09-30T12:00:00Z").toEpochMilli());
        assertThat(data.scalar("select logto_invitation_id from membership where id = ?::uuid", id)).isEqualTo(invitation.get("id"));
        assertThat(data.count("select count(*) from email_send where membership_id = ?::uuid and kind = 'INVITATION' and status = 'SENT'", id)).isEqualTo(1);

        given().contentType("application/json").body("{\"name\":\"Again\",\"email\":\"lina.ahmed@example.com\"}")
                .when().post("/v1/workspaces/" + ws + "/members")
                .then().statusCode(409).body("code", is("CONFLICT"));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aLogtoRefusalLeavesNoInvitedMember() {
        given().contentType("application/json").body("{\"name\":\"Nope\",\"email\":\"" + FakeServers.FAIL_INVITE_MARKER + "example.com\"}")
                .when().post("/v1/workspaces/" + ws + "/members")
                .then().statusCode(500).body("code", is("INTERNAL"));
        assertThat(data.count("select count(*) from membership where workspace_id = ? and email like 'fail-invite@%'", ws)).isZero();
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void theEmailQuotaRefusesAnInviteThatWouldExceedIt() {
        // 100 is the quota in tests; fill it to 99 this month so the 2-email budget of an invite does not fit.
        for (int i = 0; i < 99; i++) {
            data.run("insert into email_send (id, kind, recipient, status, sent_at) values (?, 'DIGEST', 'q@example.com', 'SENT', ?)",
                    UUID.randomUUID(), clock.instant());
        }
        try {
            given().contentType("application/json").body("{\"name\":\"Over\",\"email\":\"over-quota@example.com\"}")
                    .when().post("/v1/workspaces/" + ws + "/members")
                    .then().statusCode(409).body("code", is("CONFLICT"));
            assertThat(Fake.<Object>list("invitations")).isEmpty();
        } finally {
            data.run("delete from email_send where recipient = 'q@example.com'");
        }
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void resendingRevokesTheOldInvitationAndMovesTheExpiryForward() {
        String id = given().contentType("application/json").body("{\"name\":\"Sam Ali\",\"email\":\"sam@example.com\"}")
                .when().post("/v1/workspaces/" + ws + "/members").then().statusCode(201).extract().path("id");
        String firstLogtoId = (String) data.scalar("select logto_invitation_id from membership where id = ?::uuid", id);
        clock.set(MutableClock.DEFAULT.plusSeconds(3600));
        try {
            given().when().post("/v1/workspaces/" + ws + "/members/" + id + "/invitation/resend")
                    .then().statusCode(200)
                    .body("invitation.resendCount", is(1))
                    .body("invitation.status", is("PENDING"))
                    .body("invitation.expiresAt", is("2026-09-30T13:00:00Z"));
        } finally {
            clock.reset();
        }
        assertThat(Fake.<String>list("deletedInvitations")).containsExactly(firstLogtoId);
        assertThat(Fake.<Object>list("invitations")).hasSize(2);
        assertThat(data.count("select count(*) from email_send where membership_id = ?::uuid and kind = 'INVITATION'", id)).isEqualTo(2);
        given().when().post("/v1/workspaces/" + ws + "/members/" + maria + "/invitation/resend")
                .then().statusCode(409).body("code", is("CONFLICT"));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void anExpiredInvitationShowsAsExpiredUntilResent() {
        UUID expired = data.invited(ws, "Old Invite", "old@example.com", "inv_" + UUID.randomUUID().toString().replace("-", ""),
                clock.instant().minusSeconds(10 * 86400), clock.instant().minusSeconds(3 * 86400), "inv_old");
        given().when().get("/v1/workspaces/" + ws + "/members/" + expired).then().statusCode(200)
                .body("status", is("INVITED")).body("invitation.status", is("EXPIRED"));
        given().when().post("/v1/workspaces/" + ws + "/members/" + expired + "/invitation/resend").then().statusCode(200)
                .body("invitation.status", is("PENDING")).body("invitation.expiresAt", is("2026-09-30T12:00:00Z"));
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void anEmployeeSeesNamesButOnlyTheirOwnRateAndFigures() {
        given().when().get("/v1/workspaces/" + ws + "/members?month=2026-09").then().statusCode(200)
                .body("find { it.id == '" + maria + "' }.hourlyRate", is(170.0f))
                .body("find { it.id == '" + maria + "' }.month.hours", is(10.5f))
                .body("find { it.id == '" + maria + "' }.month.daysWorked", is(2))
                .body("find { it.id == '" + maria + "' }.month.earnings", is(1785.0f))
                .body("find { it.id == '" + maria + "' }.lastEntryDate", is("2026-09-22"))
                .body("find { it.id == '" + employer + "' }.displayName", is("Nora Lind"))
                .body("find { it.id == '" + employer + "' }.hourlyRate", nullValue())
                .body("find { it.id == '" + employer + "' }.lastEntryDate", nullValue());
        given().when().get("/v1/workspaces/" + ws + "/members/" + employer).then().statusCode(403).body("code", is("FORBIDDEN"));
        given().contentType("application/json").body("{\"name\":\"X\",\"email\":\"x@example.com\"}")
                .when().post("/v1/workspaces/" + ws + "/members").then().statusCode(403);
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void patchLeavesAbsentFieldsAloneAndNullClearsTheRate() {
        given().contentType("application/json").body("{\"displayName\":\"Maria L\"}")
                .when().patch("/v1/workspaces/" + ws + "/members/" + maria)
                .then().statusCode(200).body("displayName", is("Maria L")).body("hourlyRate", is(170.0f));
        given().contentType("application/json").body("{\"hourlyRate\":null}")
                .when().patch("/v1/workspaces/" + ws + "/members/" + maria)
                .then().statusCode(200).body("displayName", is("Maria L")).body("hourlyRate", nullValue());
        given().contentType("application/json").body("{\"hourlyRate\":175.5}")
                .when().patch("/v1/workspaces/" + ws + "/members/" + maria)
                .then().statusCode(200).body("hourlyRate", is(175.5f));
        given().contentType("application/json").body("{\"hourlyRate\":-1}")
                .when().patch("/v1/workspaces/" + ws + "/members/" + maria)
                .then().statusCode(400).body("code", is("VALIDATION"));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void deactivateAndReactivateKeepTheHistoryAndTheEmployerCannotBeTouched() {
        given().contentType("application/json").body("{\"status\":\"DEACTIVATED\"}")
                .when().patch("/v1/workspaces/" + ws + "/members/" + maria)
                .then().statusCode(200).body("status", is("DEACTIVATED")).body("month.hours", is(10.5f)).body("deactivatedAt", notNullValue());
        assertThat(data.scalar("select deactivated_at from membership where id = ?", maria)).isNotNull();
        given().contentType("application/json").body("{\"status\":\"ACTIVE\"}")
                .when().patch("/v1/workspaces/" + ws + "/members/" + maria)
                .then().statusCode(200).body("status", is("ACTIVE")).body("deactivatedAt", nullValue());
        given().contentType("application/json").body("{\"status\":\"DEACTIVATED\"}")
                .when().patch("/v1/workspaces/" + ws + "/members/" + employer)
                .then().statusCode(409).body("code", is("CONFLICT"));
        given().when().delete("/v1/workspaces/" + ws + "/members/" + employer).then().statusCode(409);
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void removingDeletesAnInvitedMemberButOnlyDeactivatesOneWithHours() {
        String invited = given().contentType("application/json").body("{\"name\":\"Temp\",\"email\":\"temp@example.com\"}")
                .when().post("/v1/workspaces/" + ws + "/members").then().statusCode(201).extract().path("id");
        String logtoInvitation = (String) data.scalar("select logto_invitation_id from membership where id = ?::uuid", invited);
        given().when().delete("/v1/workspaces/" + ws + "/members/" + invited).then().statusCode(204);
        assertThat(data.count("select count(*) from membership where id = ?::uuid", invited)).isZero();
        assertThat(Fake.<String>list("deletedInvitations")).containsExactly(logtoInvitation);

        given().when().delete("/v1/workspaces/" + ws + "/members/" + maria).then().statusCode(204);
        assertThat(data.scalar("select status from membership where id = ?", maria)).isEqualTo("DEACTIVATED");
        assertThat(data.count("select count(*) from hour_entry where membership_id = ?", maria)).isEqualTo(2);

        data.user("usr_mb_nohours", "nohours@example.com", "No Hours");
        UUID noHours = data.member(ws, "usr_mb_nohours", "EMPLOYEE", "No Hours", "nohours@example.com", null, "ACTIVE");
        given().when().delete("/v1/workspaces/" + ws + "/members/" + noHours).then().statusCode(204);
        assertThat(data.count("select count(*) from membership where id = ?", noHours)).isZero();
        assertThat(Fake.<Map<String, Object>>list("removedUsers")).anySatisfy(m -> assertThat(m.get("userId")).isEqualTo("usr_mb_nohours"));
    }
}
