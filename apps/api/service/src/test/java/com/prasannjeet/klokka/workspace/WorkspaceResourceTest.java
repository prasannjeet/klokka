package com.prasannjeet.klokka.workspace;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.FakeServers;
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

// POST/GET/PATCH /workspaces (CHQ-112, CHQ-127): the Logto organization is created and the caller made its
// EMPLOYER before the rows are written, and the organization is deleted again when the write fails.
@QuarkusTest
@SuppressWarnings("unchecked")
class WorkspaceResourceTest {

    private static final String NORA = "usr_ws_nora";
    private static final String MARIA = "usr_ws_maria";

    @Inject
    AgroalDataSource dataSource;

    TestData data;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA), @Claim(key = "email", value = "nora@cafenord.example"), @Claim(key = "name", value = "Nora Lind")})
    void creatingAWorkspaceMakesTheOrganizationAndTheEmployerMembership() {
        String id = given().contentType("application/json")
                .body("{\"name\":\"Café Nord\",\"timezone\":\"Europe/Stockholm\",\"currency\":\"SEK\",\"country\":\"SE\",\"emoji\":\"☕\",\"rounding\":\"HALF\",\"defaultDayHours\":7.5}")
                .when().post("/v1/workspaces")
                .then().statusCode(201)
                .body("name", is("Café Nord"))
                .body("slug", notNullValue())
                .body("currency", is("SEK"))
                .body("rounding", is("HALF"))
                .body("defaultDayHours", is(7.5f))
                .body("showPay", is(false))
                .body("memberCount", is(1))
                .body("activeMemberCount", is(1))
                .body("myRole", is("EMPLOYER"))
                .extract().path("id");
        assertThat((String) given().when().get("/v1/workspaces/" + id).then().statusCode(200).extract().path("slug")).startsWith("cafe-nord");
        String orgId = (String) data.scalar("select logto_org_id from workspace where id = ?::uuid", id);
        List<Map<String, Object>> created = Fake.list("createdOrganizations");
        assertThat(created).extracting(m -> m.get("id")).contains(orgId);
        List<Map<String, Object>> added = Fake.list("addedUsers");
        assertThat(added).anySatisfy(m -> {
            assertThat(m.get("organizationId")).isEqualTo(orgId);
            assertThat((List<Object>) m.get("userIds")).containsExactly(NORA);
        });
        List<Map<String, Object>> roles = Fake.list("assignedRoles");
        assertThat(roles).anySatisfy(m -> {
            assertThat(m.get("userId")).isEqualTo(NORA);
            assertThat((List<Object>) m.get("organizationRoleIds")).containsExactly("da4ro7bg7wzjcjeycjwbj");
        });
        assertThat(data.query("select role, status, email from membership where workspace_id = ?::uuid", id))
                .containsExactly(List.of("EMPLOYER", "ACTIVE", "nora@cafenord.example"));
        given().when().get("/v1/me").then().statusCode(200)
                .body("workspaces.find { it.workspaceId == '" + id + "' }.role", is("EMPLOYER"))
                .body("workspaces.find { it.workspaceId == '" + id + "' }.memberCount", is(1));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aFailedWriteDeletesTheOrganizationAgain() {
        // The fake returns the same organization id for every name carrying the marker: the second create hits the
        // unique logto_org_id constraint after the organization exists, so the compensation must delete it.
        String body = "{\"name\":\"" + FakeServers.DUPLICATE_ORG_MARKER + " Cafe\",\"timezone\":\"Europe/Stockholm\",\"currency\":\"SEK\"}";
        given().contentType("application/json").body(body).when().post("/v1/workspaces").then().statusCode(201);
        given().contentType("application/json").body(body).when().post("/v1/workspaces")
                .then().statusCode(500).body("code", is("INTERNAL"));
        List<String> deleted = Fake.list("deletedOrganizations");
        assertThat(deleted).containsExactly("org_duplicate");
        assertThat(data.count("select count(*) from workspace where logto_org_id = 'org_duplicate'")).isEqualTo(1);
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aLogtoFailureLeavesNoWorkspaceBehind() {
        long before = data.count("select count(*) from workspace where name like '%" + FakeServers.FAIL_ORG_MARKER + "%'");
        given().contentType("application/json")
                .body("{\"name\":\"" + FakeServers.FAIL_ORG_MARKER + "\",\"timezone\":\"Europe/Stockholm\",\"currency\":\"SEK\"}")
                .when().post("/v1/workspaces")
                .then().statusCode(500).body("code", is("INTERNAL"));
        assertThat(data.count("select count(*) from workspace where name like '%" + FakeServers.FAIL_ORG_MARKER + "%'")).isEqualTo(before);
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void badTimezoneAndCurrencyAreValidationProblems() {
        given().contentType("application/json").body("{\"name\":\"X\",\"timezone\":\"Mars/Olympus\",\"currency\":\"SEK\"}")
                .when().post("/v1/workspaces").then().statusCode(400).body("code", is("VALIDATION")).body("errors[0].field", is("timezone"));
        given().contentType("application/json").body("{\"name\":\"X\",\"timezone\":\"Europe/Oslo\",\"currency\":\"ZZZ\"}")
                .when().post("/v1/workspaces").then().statusCode(400).body("errors[0].field", is("currency"));
        // CHQ-145: ZoneId.of accepts offsets ("UTC+1" became "UTC+01:00", which Intl rejects); only IANA ids pass.
        for (String offset : new String[] {"UTC+1", "+01:00", "GMT+2", "UTC+01:00"}) {
            given().contentType("application/json").body("{\"name\":\"X\",\"timezone\":\"" + offset + "\",\"currency\":\"SEK\"}")
                    .when().post("/v1/workspaces").then().statusCode(400).contentType("application/problem+json")
                    .body("code", is("VALIDATION")).body("errors[0].field", is("timezone"));
        }
        assertThat(Fake.<Object>list("createdOrganizations")).isEmpty();
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void settingsAreEmployerOnlyAndPatchOneFieldAtATime() {
        data.user(NORA, "nora@cafenord.example", "Nora Lind");
        data.user(MARIA, "maria@example.com", "Maria Lind");
        UUID ws = data.workspace("Patch Corp", "patch-" + UUID.randomUUID().toString().substring(0, 8), false, "NONE", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@example.com", null, "ACTIVE");

        given().when().get("/v1/workspaces/" + ws).then().statusCode(200).body("myRole", is("EMPLOYEE")).body("activeMemberCount", is(2));
        given().contentType("application/json").body("{\"showPay\":true}")
                .when().patch("/v1/workspaces/" + ws).then().statusCode(403).body("code", is("FORBIDDEN"));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void theEmployerPatchesShowPayAndRoundingWithoutTouchingTheRest() {
        data.user(NORA, "nora@cafenord.example", "Nora Lind");
        UUID ws = data.workspace("Patch Corp 2", "patch2-" + UUID.randomUUID().toString().substring(0, 8), false, "NONE", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        given().contentType("application/json").body("{\"showPay\":true,\"rounding\":\"QUARTER\"}")
                .when().patch("/v1/workspaces/" + ws).then().statusCode(200)
                .body("showPay", is(true)).body("rounding", is("QUARTER")).body("name", is("Patch Corp 2")).body("timezone", is("Europe/Stockholm"));
        given().contentType("application/json").body("{\"timezone\":\"Nowhere/Land\"}")
                .when().patch("/v1/workspaces/" + ws).then().statusCode(400).body("code", is("VALIDATION"));
        given().contentType("application/json").body("{\"timezone\":\"UTC+1\"}")
                .when().patch("/v1/workspaces/" + ws).then().statusCode(400).body("code", is("VALIDATION")).body("errors[0].field", is("timezone"));
        given().contentType("application/json").body("{\"timezone\":\"America/New_York\"}")
                .when().patch("/v1/workspaces/" + ws).then().statusCode(200).body("timezone", is("America/New_York"));
    }
}
