package com.prasannjeet.klokka.operator;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

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
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// The operator console (CHQ-141): platform-admin only, aggregates only, the console's one mutating action, and
// live health probes.
@QuarkusTest
class OperatorResourceTest {

    private static final String OPS = "usr_op_ops";
    private static final String NORA = "usr_op_nora";
    private static final String MARIA = "usr_op_maria";

    @Inject
    AgroalDataSource dataSource;

    @Inject
    MutableClock clock;

    TestData data;
    UUID ws;
    String slug;
    UUID invited;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        data.user(OPS, "ops@klokka.test", "Ops");
        data.user(NORA, "nora@cafenord.example", "Nora Lind");
        data.user(MARIA, "maria@example.com", "Maria Lind");
        slug = "ops-" + UUID.randomUUID().toString().substring(0, 8);
        ws = data.workspace("Ops Corp " + slug, slug, true, "NONE", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        UUID maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@example.com", new BigDecimal("170.00"), "ACTIVE");
        data.entry(ws, maria, LocalDate.of(2026, 9, 21), new BigDecimal("4.00"), null, NORA);
        invited = data.invited(ws, "Sam Ali", "sam-" + slug + "@example.com", "inv_" + UUID.randomUUID().toString().replace("-", ""),
                clock.instant().minusSeconds(86400), clock.instant().plusSeconds(6 * 86400), "logto_inv_ops");
    }

    @Test
    @TestSecurity(user = OPS, roles = "platform-admin")
    @OidcSecurity(claims = {@Claim(key = "sub", value = OPS)})
    void workspacesUsersAndInvitationsArePagedAggregates() {
        given().when().get("/v1/operator/workspaces?q=" + slug + "&month=2026-09").then().statusCode(200)
                .body("items", hasSize(1)).body("total", is(1)).body("page", is(1)).body("pageSize", is(12))
                .body("items[0].slug", is(slug)).body("items[0].colour", notNullValue()).body("items[0].memberCount", is(3)).body("items[0].activeCount", is(2)).body("items[0].invitedCount", is(1))
                .body("items[0].monthHours", is(4.0f)).body("items[0].showPay", is(true)).body("items[0].lastActivityAt", notNullValue())
                .body("summary.month", is("2026-09")).body("summary.workspaces", greaterThanOrEqualTo(1)).body("summary.membersInvited", greaterThanOrEqualTo(1));
        given().when().get("/v1/operator/workspaces?pay=false&q=" + slug).then().statusCode(200).body("items", hasSize(0));
        given().when().get("/v1/operator/users?q=maria@example.com").then().statusCode(200)
                .body("items.find { it.id == '" + MARIA + "' }.employeeOf", greaterThanOrEqualTo(1))
                .body("items.find { it.id == '" + MARIA + "' }.pushRegistered", is(false))
                .body("users", greaterThanOrEqualTo(3));
        given().when().get("/v1/operator/invitations?status=PENDING&pageSize=100").then().statusCode(200)
                .body("items.find { it.id == '" + invited + "' }.inviteeEmail", is("sam-" + slug + "@example.com"))
                .body("items.find { it.id == '" + invited + "' }.invitedBy", is("Nora Lind"))
                .body("items.find { it.id == '" + invited + "' }.workspaceName", is("Ops Corp " + slug))
                .body("summary.pending", greaterThanOrEqualTo(1));
    }

    @Test
    @TestSecurity(user = OPS, roles = "platform-admin")
    @OidcSecurity(claims = {@Claim(key = "sub", value = OPS)})
    void resendIsTheOnlyMutationAndVolumeCountsTheLedger() {
        given().when().post("/v1/operator/invitations/" + invited + "/resend").then().statusCode(204);
        assertThat(Fake.<Object>list("invitations")).hasSize(1);
        assertThat(data.scalar("select invitation_resend_count from membership where id = ?", invited)).isEqualTo(1);
        given().when().post("/v1/operator/invitations/" + UUID.randomUUID() + "/resend").then().statusCode(404);
        given().when().get("/v1/operator/volume?month=2026-09").then().statusCode(200)
                .body("month", is("2026-09")).body("email.quota", is(100)).body("email.sent", greaterThanOrEqualTo(1))
                .body("email.invitations", greaterThanOrEqualTo(1)).body("email.resetsOn", is("2026-10-01")).body("email.digestMondays", is(4))
                .body("push.sent", greaterThanOrEqualTo(0)).body("perDay", hasSize(30)).body("perDay[0].date", is("2026-09-01"))
                .body("coalescing.entryChanges", greaterThanOrEqualTo(1));
    }

    @Test
    @TestSecurity(user = OPS, roles = "platform-admin")
    @OidcSecurity(claims = {@Claim(key = "sub", value = OPS)})
    void healthProbesEveryDependency() {
        given().when().get("/v1/operator/health").then().statusCode(200)
                .body("version", is("dev")).body("checkedAt", is("2026-09-23T12:00:00Z")).body("uptimeSeconds", greaterThanOrEqualTo(0))
                .body("dependencies.find { it.name == 'postgres' }.status", is("UP"))
                .body("dependencies.find { it.name == 'postgres' }.detail", org.hamcrest.Matchers.startsWith("PostgreSQL 18"))
                .body("dependencies.find { it.name == 'logto' }.status", is("UP"))
                .body("dependencies.find { it.name == 'smtp' }.status", notNullValue())
                .body("dependencies.find { it.name == 'web' }.status", is("DOWN"))
                .body("recentDeploys", hasSize(1)).body("recentDeploys[0].app", is("klokka-api"));
        assertThat((Integer) Fake.state().get("listOrganizationsCalls")).isGreaterThanOrEqualTo(1);
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void anEmployerIsNotAnOperator() {
        given().when().get("/v1/operator/workspaces").then().statusCode(403).body("code", is("FORBIDDEN"));
        given().when().post("/v1/operator/invitations/" + invited + "/resend").then().statusCode(403);
    }
}
