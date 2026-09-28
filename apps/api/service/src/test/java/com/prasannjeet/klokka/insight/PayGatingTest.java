package com.prasannjeet.klokka.insight;

import static io.restassured.RestAssured.given;
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
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// CHQ-145: with "show pay" on, money shows only for members who have an hourly rate. Sam has none: he sees
// hours only everywhere (/me, his month, his insights, his entries) until the employer sets one; the employer
// sees money for Maria and hours only for Sam, and no labour cost at all while nobody has a rate.
@QuarkusTest
class PayGatingTest {

    private static final String NORA = "usr_pg_nora";
    private static final String MARIA = "usr_pg_maria";
    private static final String SAM = "usr_pg_sam";
    private static final String NOBODY_EMPLOYER = "usr_pg_owner";

    @Inject
    AgroalDataSource dataSource;

    TestData data;
    UUID ws;
    UUID maria;
    UUID sam;
    UUID noRates;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        data.user(NORA, "nora@pay.example", "Nora Lind");
        data.user(MARIA, "maria@pay.example", "Maria Lind");
        data.user(SAM, "sam@pay.example", "Sam Ali");
        data.user(NOBODY_EMPLOYER, "owner@pay.example", "Olle Owner");
        ws = data.workspace("Pay Corp", "pay-" + UUID.randomUUID().toString().substring(0, 8), true, "NONE", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@pay.example", null, "ACTIVE");
        maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@pay.example", new BigDecimal("170.00"), "ACTIVE");
        sam = data.member(ws, SAM, "EMPLOYEE", "Sam Ali", "sam@pay.example", null, "ACTIVE");
        data.entry(ws, maria, LocalDate.of(2026, 9, 22), new BigDecimal("4.00"), null, NORA);
        data.entry(ws, sam, LocalDate.of(2026, 9, 22), new BigDecimal("8.00"), null, NORA);

        noRates = data.workspace("Hours Only", "hours-" + UUID.randomUUID().toString().substring(0, 8), true, "NONE", "Europe/Stockholm");
        data.member(noRates, NOBODY_EMPLOYER, "EMPLOYER", "Olle Owner", "owner@pay.example", null, "ACTIVE");
        UUID lone = data.member(noRates, SAM, "EMPLOYEE", "Sam Ali", "sam@pay.example", null, "ACTIVE");
        data.entry(noRates, lone, LocalDate.of(2026, 9, 21), new BigDecimal("6.00"), null, NOBODY_EMPLOYER);
    }

    private String mine(UUID workspace) {
        return "workspaces.find { it.workspaceId == '" + workspace + "' }";
    }

    @Test
    @TestSecurity(user = SAM)
    @OidcSecurity(claims = {@Claim(key = "sub", value = SAM)})
    void anEmployeeWithoutARateSeesHoursOnlyEverywhere() {
        given().when().get("/v1/me").then().statusCode(200).body(mine(ws) + ".showPay", is(false));
        given().when().get("/v1/workspaces/" + ws + "/members/" + sam + "/months/2026-09").then().statusCode(200)
                .body("showPay", is(false)).body("hourlyRate", nullValue()).body("earnings", nullValue())
                .body("days[21].hours", is(8.0f)).body("days[21].earnings", nullValue()).body("totalHours", is(8.0f));
        given().when().get("/v1/workspaces/" + ws + "/members/" + sam + "/insights?month=2026-09").then().statusCode(200)
                .body("showPay", is(false)).body("hourlyRate", nullValue()).body("earnings", nullValue()).body("totalHours", is(8.0f));
        given().when().get("/v1/workspaces/" + ws + "/entries?from=2026-09-22&to=2026-09-22").then().statusCode(200)
                .body("size()", is(1)).body("[0].hours", is(8.0f)).body("[0].earnings", nullValue()).body("[0].hourlyRate", nullValue());
    }

    @Test
    @TestSecurity(user = SAM)
    @OidcSecurity(claims = {@Claim(key = "sub", value = SAM)})
    void moneyAppearsOnceTheEmployerSetsARate() {
        data.run("update membership set hourly_rate = 160.00 where id = ?", sam);
        given().when().get("/v1/me").then().statusCode(200).body(mine(ws) + ".showPay", is(true));
        given().when().get("/v1/workspaces/" + ws + "/members/" + sam + "/months/2026-09").then().statusCode(200)
                .body("showPay", is(true)).body("hourlyRate", is(160.0f)).body("earnings", is(1280.0f)).body("days[21].earnings", is(1280.0f));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void theEmployerSeesMoneyOnlyForMembersWithARate() {
        given().when().get("/v1/me").then().statusCode(200).body(mine(ws) + ".showPay", is(true));
        given().when().get("/v1/workspaces/" + ws + "/members/" + maria + "/months/2026-09").then().statusCode(200)
                .body("showPay", is(true)).body("earnings", is(680.0f));
        given().when().get("/v1/workspaces/" + ws + "/members/" + sam + "/months/2026-09").then().statusCode(200)
                .body("showPay", is(false)).body("hourlyRate", nullValue()).body("earnings", nullValue()).body("days[21].earnings", nullValue());
        given().when().get("/v1/workspaces/" + ws + "/months/2026-09/summary").then().statusCode(200)
                .body("labourCost", is(680.0f))
                .body("members.find { it.name == 'Sam Ali' }.earnings", nullValue())
                .body("members.find { it.name == 'Maria Lind' }.earnings", is(680.0f));
        given().when().get("/v1/workspaces/" + ws + "/insights?month=2026-09").then().statusCode(200)
                .body("labourCost", is(680.0f)).body("perMember.find { it.name == 'Sam Ali' }.earnings", nullValue());
        given().when().get("/v1/workspaces/" + ws + "/entries?from=2026-09-22&to=2026-09-22").then().statusCode(200)
                .body("find { it.memberName == 'Sam Ali' }.earnings", nullValue())
                .body("find { it.memberName == 'Maria Lind' }.earnings", is(680.0f));
    }

    @Test
    @TestSecurity(user = NOBODY_EMPLOYER)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NOBODY_EMPLOYER)})
    void noLabourCostWhileNobodyHasARate() {
        given().when().get("/v1/workspaces/" + noRates + "/months/2026-09/summary").then().statusCode(200)
                .body("showPay", is(true)).body("totalHours", is(6.0f)).body("labourCost", nullValue());
        given().when().get("/v1/workspaces/" + noRates + "/insights?month=2026-09").then().statusCode(200)
                .body("showPay", is(true)).body("labourCost", nullValue());
    }
}
