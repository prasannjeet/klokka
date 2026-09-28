package com.prasannjeet.klokka.invitation;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.hamcrest.Matchers.is;

import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.MutableClock;
import com.prasannjeet.klokka.support.TestData;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// /invitations/{token} (CHQ-113 lookup, CHQ-114 accept).
@QuarkusTest
@SuppressWarnings("unchecked")
class InvitationResourceTest {

    private static final String NORA = "usr_inv_nora";
    private static final String LINA = "usr_inv_lina";
    private static final String OTHER = "usr_inv_other";

    @Inject
    AgroalDataSource dataSource;

    @Inject
    MutableClock clock;

    TestData data;
    UUID ws;
    UUID invited;
    String token;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        data.user(NORA, "nora@cafenord.example", "Nora Lind");
        ws = data.workspace("Invite Corp", "invite-" + UUID.randomUUID().toString().substring(0, 8), false, "NONE", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        token = "inv_" + UUID.randomUUID().toString().replace("-", "");
        invited = data.invited(ws, "Lina Ahmed", "lina@example.com", token, clock.instant(), clock.instant().plusSeconds(7 * 86400), "logto_inv_" + token.substring(4, 12));
    }

    @Test
    void theLookupIsPublicAndLocalized() {
        given().when().get("/v1/invitations/" + token + "?lang=en").then().statusCode(200)
                .body("workspaceName", is("Invite Corp"))
                .body("inviterName", is("Nora Lind"))
                .body("email", is("lina@example.com"))
                .body("role", is("EMPLOYEE"))
                .body("status", is("PENDING"))
                .body("language", is("en"))
                .body("localized.headline", is("Nora Lind invited you to Invite Corp."))
                .body("localized.body", is("Invite Corp logs your hours in Klokka. Set a password and every one of them is yours to see, day by day, month by month."));
        given().when().get("/v1/invitations/" + token).then().statusCode(200)
                .body("language", is("sv"))
                .body("localized.headline", is("Nora Lind bjöd in dig till Invite Corp."));
    }

    @Test
    @TestSecurity(user = OTHER)
    @OidcSecurity(claims = {@Claim(key = "sub", value = OTHER)})
    void acceptingWithAnotherEmailIsRefused() {
        Fake.user(OTHER, "someone.else@example.com", "Someone Else");
        given().when().post("/v1/invitations/" + token + "/accept").then().statusCode(403).body("code", is("INVITATION_EMAIL_MISMATCH"));
        assertThat(data.scalar("select status from membership where id = ?", invited)).isEqualTo("INVITED");
    }

    @Test
    @TestSecurity(user = LINA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = LINA)})
    void acceptingBindsTheUserAcceptsInLogtoAndTellsTheEmployer() {
        // The token has no email claim and no webhook has synced this user yet: the API asks Logto for the profile.
        Fake.user(LINA, "Lina@Example.com", "Lina Ahmed");
        given().when().post("/v1/invitations/" + token + "/accept").then().statusCode(200)
                .body("workspaceId", is(ws.toString()))
                .body("membershipId", is(invited.toString()))
                .body("workspaceName", is("Invite Corp"))
                .body("role", is("EMPLOYEE"));
        assertThat(data.query("select status, logto_user_id from membership where id = ?", invited)).containsExactly(List.of("ACTIVE", LINA));
        assertThat(data.scalar("select joined_at from membership where id = ?", invited)).isNotNull();
        List<Map<String, Object>> updates = Fake.list("invitationStatusUpdates");
        assertThat(updates).hasSize(1);
        assertThat(updates.get(0).get("status")).isEqualTo("Accepted");
        assertThat(updates.get(0).get("acceptedUserId")).isEqualTo(LINA);
        assertThat(data.count("select count(*) from email_send where membership_id = ? and kind = 'VERIFICATION'", invited)).isEqualTo(1);
        assertThat(data.query("select kind from notification where logto_user_id = ? and workspace_id = ?", NORA, ws)).containsExactly(List.of("INVITE_ACCEPTED"));
        assertThat(data.scalar("select email from app_user where logto_user_id = ?", LINA)).isEqualTo("lina@example.com");

        // Repeat-safe, and the lookup now says accepted.
        given().when().post("/v1/invitations/" + token + "/accept").then().statusCode(200).body("membershipId", is(invited.toString()));
        assertThat(Fake.<Object>list("invitationStatusUpdates")).hasSize(1);
        given().when().get("/v1/invitations/" + token).then().statusCode(200).body("status", is("ACCEPTED"));
        given().when().get("/v1/me").then().statusCode(200)
                .body("workspaces.find { it.workspaceId == '" + ws + "' }.role", is("EMPLOYEE"))
                .body("workspaces.find { it.workspaceId == '" + ws + "' }.employerName", is("Nora Lind"));
    }

    @Test
    @TestSecurity(user = LINA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = LINA)})
    void acceptingKeepsTheInvitedNameAdoptsItAsTheProfileNameAndTakesTheDeviceLanguage() {
        // Mirrored by the webhook before the first sign-in: email known, name only derived from it, nothing chosen.
        // Staging: the employer's "Test Testsson" became "test" and the notification said "test accepted".
        data.user(LINA, "lina@example.com", "lina");
        data.run("delete from user_preference where logto_user_id = ?", LINA);
        given().header("Accept-Language", "en-GB,en;q=0.9").when().post("/v1/invitations/" + token + "/accept").then().statusCode(200);
        assertThat(data.scalar("select display_name from membership where id = ?", invited)).isEqualTo("Lina Ahmed");
        assertThat(data.scalar("select display_name from app_user where logto_user_id = ?", LINA)).isEqualTo("Lina Ahmed");
        assertThat(data.scalar("select language from user_preference where logto_user_id = ?", LINA)).isEqualTo("en");
        assertThat((String) data.scalar("select payload::text from notification where logto_user_id = ? and workspace_id = ?", NORA, ws))
                .contains("Lina Ahmed");
        List<Map<String, Object>> updated = Fake.list("updatedUsers");
        assertThat(updated).extracting(u -> u.get("id"), u -> u.get("name")).containsExactly(tuple(LINA, "Lina Ahmed"));
    }

    @Test
    @TestSecurity(user = LINA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = LINA)})
    void acceptingUsesTheNameThePersonChose() {
        data.user(LINA, "lina@example.com", "Lina A. Ahmed");
        given().when().post("/v1/invitations/" + token + "/accept").then().statusCode(200);
        assertThat(data.scalar("select display_name from membership where id = ?", invited)).isEqualTo("Lina A. Ahmed");
        assertThat(data.scalar("select display_name from app_user where logto_user_id = ?", LINA)).isEqualTo("Lina A. Ahmed");
        assertThat(Fake.<Object>list("updatedUsers")).isEmpty();
    }

    @Test
    @TestSecurity(user = LINA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = LINA)})
    void anExpiredInvitationIs410() {
        Fake.user(LINA, "lina@example.com", "Lina Ahmed");
        clock.set(clock.instant().plusSeconds(8 * 86400));
        try {
            given().when().post("/v1/invitations/" + token + "/accept").then().statusCode(410).body("code", is("INVITATION_EXPIRED"));
            given().when().get("/v1/invitations/" + token + "?lang=en").then().statusCode(200).body("status", is("EXPIRED"))
                    .body("localized.headline", is("This invitation has expired. Ask Nora Lind to send a new one."));
        } finally {
            clock.reset();
        }
        assertThat(Fake.<Object>list("invitationStatusUpdates")).isEmpty();
    }

    @Test
    void anUnknownTokenIs404WithoutAToken() {
        given().when().get("/v1/invitations/inv_000000000000000000000000deadbeef").then().statusCode(404);
        given().when().post("/v1/invitations/inv_000000000000000000000000deadbeef/accept").then().statusCode(401);
    }
}
