package com.prasannjeet.klokka.me;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.notNullValue;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.MutableClock;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

// GET /me against the real schema on the Dev Services Postgres 18 container, plus the auth gates every other
// route shares. Rows are scoped to this class's own user ids (usr_me_*) on the shared test database.
@QuarkusTest
class MeResourceTest {

    private static final String MARIA = "usr_me_maria";
    private static final String NORA = "usr_me_nora";
    private static final String FRESH = "usr_me_fresh";
    private static final String OPS = "usr_me_ops";
    private static final String PLAIN = "usr_me_plain";
    private static final String PROBLEM_JSON = "application/problem+json";

    @Inject
    AgroalDataSource dataSource;

    @Inject
    MutableClock clock;

    @Test
    void withoutABearerTokenMeIs401() {
        given().when().get("/v1/me").then().statusCode(401);
    }

    @Test
    @TestSecurity(user = "usr_me_fresh_logto")
    @OidcSecurity(claims = {@Claim(key = "sub", value = "usr_me_fresh_logto")})
    void firstCallFillsEmailAndNameFromLogtoWhenTheWebhookHasNotRun() {
        Fake.reset();
        Fake.user("usr_me_fresh_logto", "Owner@Example.com", "Owner Person");
        given().when().get("/v1/me").then().statusCode(200)
                .body("user.email", is("owner@example.com"))
                .body("user.name", is("Owner Person"));
    }

    @Test
    @TestSecurity(user = "usr_me_old_row")
    @OidcSecurity(claims = {@Claim(key = "sub", value = "usr_me_old_row")})
    void anExistingRowWithoutAnEmailIsFilledFromLogtoToo() throws SQLException {
        // The owner's row on staging: created before the hook existed, so the mirror never wrote it.
        Fake.reset();
        try (Connection c = dataSource.getConnection()) {
            upsertUser(c, "usr_me_old_row", null, "");
        }
        Fake.user("usr_me_old_row", "old@example.com", "Old Owner");
        given().when().get("/v1/me").then().statusCode(200)
                .body("user.email", is("old@example.com"))
                .body("user.name", is("Old Owner"));
    }

    @Test
    @TestSecurity(user = FRESH)
    @OidcSecurity(claims = {@Claim(key = "sub", value = FRESH)})
    void firstCallCreatesTheUserFromTheTokenAlone() {
        Fake.reset();
        given().header("Accept-Language", "en-GB,en;q=0.9")
                .when().get("/v1/me")
                .then().statusCode(200)
                .body("user.id", is(FRESH))
                .body("user.email", nullValue())
                .body("user.name", is(""))
                .body("preferences.language", is("en"))
                .body("preferences.pushEnabled", is(true))
                .body("preferences.digestEnabled", is(false))
                .body("preferences.theme", is("SYSTEM"))
                .body("workspaces", empty())
                .body("platformAdmin", is(false))
                .body("pushTokenRegistered", is(false));
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = MARIA),
            @Claim(key = "email", value = "Maria.Lind@example.com"),
            @Claim(key = "name", value = "Maria Lind")})
    void memberSeesHerWorkspacesWithTheSwitcherFigures() throws SQLException {
        UUID workspace = UUID.randomUUID();
        UUID employee = UUID.randomUUID();
        seedWorkspace(workspace, "cafe-nord-" + workspace.toString().substring(0, 8), employee);

        given().header("Accept-Language", "sv-SE")
                .when().get("/v1/me")
                .then().statusCode(200)
                .body("user.id", is(MARIA))
                .body("user.email", is("maria.lind@example.com"))
                .body("user.name", is("Maria Lind"))
                .body("preferences.language", is("sv"))
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.name", is("Café Nord"))
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.membershipId", is(employee.toString()))
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.role", is("EMPLOYEE"))
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.employerName", is("Nora Lind"))
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.memberCount", nullValue())
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.hoursThisMonth", is(4.5f))
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.showPay", is(true))
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.rounding", notNullValue())
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.defaultDayHours", notNullValue())
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.currency", is("SEK"))
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.unreadNotifications", is(0));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA), @Claim(key = "name", value = "Nora Lind")})
    void employerSeesTheMemberCountAndTheWorkspaceTotal() throws SQLException {
        UUID workspace = UUID.randomUUID();
        seedWorkspace(workspace, "cafe-nord-" + workspace.toString().substring(0, 8), UUID.randomUUID());

        given().when().get("/v1/me")
                .then().statusCode(200)
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.role", is("EMPLOYER"))
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.memberCount", is(2))
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.employerName", nullValue())
                .body("workspaces.find { it.workspaceId == '" + workspace + "' }.hoursThisMonth", is(4.5f));
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void renamingYourselfMirrorsTheNameToLogtoAndToEveryMembership() throws SQLException {
        Fake.reset();
        UUID workspace = UUID.randomUUID();
        UUID employee = UUID.randomUUID();
        seedWorkspace(workspace, "rename-" + workspace.toString().substring(0, 8), employee);
        given().contentType("application/json").body("{\"name\":\"Maria Lindqvist\",\"avatarEmoji\":\"🐝\"}").when().patch("/v1/me").then().statusCode(200)
                .body("user.name", is("Maria Lindqvist"));
        try (Connection c = dataSource.getConnection(); PreparedStatement ps = c.prepareStatement("select display_name, avatar_emoji from membership where id = ?")) {
            ps.setObject(1, employee);
            var rs = ps.executeQuery();
            assertThat(rs.next()).isTrue();
            assertThat(rs.getString(1)).isEqualTo("Maria Lindqvist");
            assertThat(rs.getString(2)).isEqualTo("🐝");
        }
        assertThat(Fake.<Map<String, Object>>list("updatedUsers")).extracting(u -> u.get("id"), u -> u.get("name"))
                .containsExactly(tuple(MARIA, "Maria Lindqvist"));
        // The same name again changes nothing, so Logto is not asked again.
        given().contentType("application/json").body("{\"name\":\"Maria Lindqvist\"}").when().patch("/v1/me").then().statusCode(200);
        assertThat(Fake.<Object>list("updatedUsers")).hasSize(1);
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void preferencesAndPushTokensRoundTrip() {
        given().contentType("application/json").body("{\"language\":\"en\",\"digestEnabled\":true}")
                .when().patch("/v1/me/preferences")
                .then().statusCode(200)
                .body("language", is("en"))
                .body("digestEnabled", is(true))
                .body("pushEnabled", is(true));

        String token = "ExponentPushToken[me-test-" + UUID.randomUUID() + "]";
        given().contentType("application/json")
                .body("{\"token\":\"" + token + "\",\"platform\":\"ANDROID\",\"deviceName\":\"Pixel 8\"}")
                .when().post("/v1/me/push-tokens")
                .then().statusCode(204);
        given().when().get("/v1/me").then().statusCode(200)
                .body("preferences.language", is("en"))
                .body("pushTokenRegistered", is(true));

        given().pathParam("token", token).when().delete("/v1/me/push-tokens/{token}").then().statusCode(204);
        given().when().get("/v1/me").then().statusCode(200).body("pushTokenRegistered", is(false));

        given().contentType("application/json").body("{\"language\":\"sv\",\"digestEnabled\":false}")
                .when().patch("/v1/me/preferences").then().statusCode(200).body("language", is("sv"));
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void aBodyThatFailsValidationIsAProblemWithFieldErrors() {
        given().contentType("application/json").body("{}")
                .when().post("/v1/me/push-tokens")
                .then().statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("code", is("VALIDATION"))
                .body("status", is(400))
                .body("errors.field", not(empty()));
    }

    @Test
    @TestSecurity(user = OPS, roles = "platform-admin")
    @OidcSecurity(claims = {@Claim(key = "sub", value = OPS)})
    void operatorRouteAnswersForAPlatformAdmin() {
        given().when().get("/v1/operator/health")
                .then().statusCode(200)
                .body("dependencies.find { it.name == 'postgres' }.status", is("UP"));
    }

    @Test
    @TestSecurity(user = OPS, roles = "operator")
    @OidcSecurity(claims = {@Claim(key = "sub", value = OPS)})
    void theOperatorScopeOpensTheOperatorRoutesToo() {
        given().when().get("/v1/operator/health").then().statusCode(200);
        given().when().get("/v1/me").then().statusCode(200).body("platformAdmin", is(true));
    }

    @Test
    @TestSecurity(user = PLAIN)
    @OidcSecurity(claims = {@Claim(key = "sub", value = PLAIN)})
    void operatorRouteIsForbiddenWithoutThePlatformAdminRole() {
        given().when().get("/v1/operator/health")
                .then().statusCode(403)
                .contentType(PROBLEM_JSON)
                .body("code", is("FORBIDDEN"));
    }

    @Test
    @TestSecurity(user = PLAIN)
    @OidcSecurity(claims = {@Claim(key = "sub", value = PLAIN)})
    void aWorkspaceTheCallerIsNotInIs404() {
        given().when().get("/v1/workspaces/" + UUID.randomUUID())
                .then().statusCode(404)
                .contentType(PROBLEM_JSON)
                .body("code", is("NOT_FOUND"));
    }

    @Test
    void publicInvitationLookupNeedsNoTokenAndAnUnknownTokenIs404() {
        given().when().get("/v1/invitations/inv_0123456789abcdef0123456789abcdef?lang=en")
                .then().statusCode(404)
                .body("code", is("NOT_FOUND"));
    }

    @Test
    void logtoWebhookNeedsNoTokenButAValidSignature() {
        given().contentType("application/json")
                .header("logto-signature-sha-256", "00")
                .body("{\"hookId\":\"hook_test\",\"event\":\"User.Deleted\",\"createdAt\":\"2026-09-27T14:07:00Z\"}")
                .when().post("/v1/webhooks/logto")
                .then().statusCode(401)
                .body("code", is("INVALID_SIGNATURE"));
    }

    @Test
    void unknownRouteIsAProblemToo() {
        given().when().get("/v1/no-such-route")
                .then().statusCode(404)
                .contentType(PROBLEM_JSON)
                .body("code", equalTo("NOT_FOUND"));
    }

    @Test
    @TestSecurity(user = PLAIN)
    @OidcSecurity(claims = {@Claim(key = "sub", value = PLAIN)})
    void everyWorkspaceGroupIsMountedUnderV1AndHiddenFromNonMembers() {
        UUID id = UUID.randomUUID();
        for (String path : new String[] {
                "/v1/workspaces/" + id + "/members",
                "/v1/workspaces/" + id + "/entries?from=2026-09-21&to=2026-09-27",
                "/v1/workspaces/" + id + "/months/2026-09",
                "/v1/workspaces/" + id + "/insights",
                "/v1/workspaces/" + id + "/flags"}) {
            given().when().get(path).then().statusCode(404).body("code", is("NOT_FOUND"));
        }
        given().header("Accept", "text/csv").when().get("/v1/workspaces/" + id + "/months/2026-09/export.csv")
                .then().statusCode(404);
        given().contentType("application/json").body("{\"items\":[{\"membershipId\":\"" + id
                        + "\",\"workDate\":\"2026-09-22\",\"hours\":4}]}")
                .when().post("/v1/workspaces/" + id + "/entries/batch")
                .then().statusCode(404).body("code", is("NOT_FOUND"));
        given().when().get("/v1/notifications").then().statusCode(200).body("items", empty()).body("unreadCount", is(0));
    }

    // A workspace with Nora as employer (usr_me_nora) and one employee membership for usr_me_maria, plus one
    // 4.5 h entry for the employee dated today, so both role views have a figure to show.
    private void seedWorkspace(UUID workspaceId, String slug, UUID employeeMembership) throws SQLException {
        try (Connection c = dataSource.getConnection()) {
            upsertUser(c, NORA, "nora@cafenord.example", "Nora Lind");
            upsertUser(c, MARIA, "maria.lind@example.com", "Maria Lind");
            try (PreparedStatement ps = c.prepareStatement(
                    "insert into workspace (id, name, slug, logto_org_id, currency, timezone, week_start, show_pay, "
                            + "rounding, default_day_hours, colour, emoji) values (?, 'Café Nord', ?, ?, 'SEK', "
                            + "'Europe/Stockholm', 'MONDAY', true, 'HALF', 7.5, 'PRIMARY', '☕')")) {
                ps.setObject(1, workspaceId);
                ps.setString(2, slug);
                ps.setString(3, "org_" + slug);
                ps.executeUpdate();
            }
            UUID employer = UUID.randomUUID();
            insertMembership(c, employer, workspaceId, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example");
            insertMembership(c, employeeMembership, workspaceId, MARIA, "EMPLOYEE", "Maria Lind", "maria.lind@example.com");
            try (PreparedStatement ps = c.prepareStatement(
                    "insert into hour_entry (id, workspace_id, membership_id, work_date, hours, created_by, updated_by) "
                            + "values (?, ?, ?, ?, 4.5, ?, ?)")) {
                ps.setObject(1, UUID.randomUUID());
                ps.setObject(2, workspaceId);
                ps.setObject(3, employeeMembership);
                ps.setObject(4, LocalDate.now(clock));
                ps.setString(5, NORA);
                ps.setString(6, NORA);
                ps.executeUpdate();
            }
        }
    }

    private static void upsertUser(Connection c, String id, String email, String name) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "insert into app_user (logto_user_id, email, display_name) values (?, ?, ?) "
                        + "on conflict (logto_user_id) do nothing")) {
            ps.setString(1, id);
            ps.setString(2, email);
            ps.setString(3, name);
            ps.executeUpdate();
        }
    }

    private static void insertMembership(Connection c, UUID id, UUID workspaceId, String userId, String role,
            String name, String email) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "insert into membership (id, workspace_id, logto_user_id, role, display_name, email, hourly_rate, "
                        + "status, joined_at) values (?, ?, ?, ?, ?, ?, 170, 'ACTIVE', now())")) {
            ps.setObject(1, id);
            ps.setObject(2, workspaceId);
            ps.setString(3, userId);
            ps.setString(4, role);
            ps.setString(5, name);
            ps.setString(6, email);
            ps.executeUpdate();
        }
    }
}
