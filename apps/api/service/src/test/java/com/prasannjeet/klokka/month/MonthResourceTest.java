package com.prasannjeet.klokka.month;

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

// Months (CHQ-120 lock/unlock with history and notifications, CHQ-122 summary, CHQ-129 CSV export).
@QuarkusTest
class MonthResourceTest {

    private static final String NORA = "usr_mo_nora";
    private static final String MARIA = "usr_mo_maria";
    private static final String JONAS = "usr_mo_jonas";

    @Inject
    AgroalDataSource dataSource;

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
        data.preferences(MARIA, "sv", true, false);
        ws = data.workspace("Month Corp", "month-" + UUID.randomUUID().toString().substring(0, 8), true, "NONE", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@example.com", new BigDecimal("170.00"), "ACTIVE");
        jonas = data.member(ws, JONAS, "EMPLOYEE", "Jonas Berg", "jonas@example.com", null, "ACTIVE");
        data.entry(ws, maria, LocalDate.of(2026, 8, 3), new BigDecimal("4.00"), "Semi;colon \"quoted\"", NORA);
        data.entry(ws, maria, LocalDate.of(2026, 8, 4), new BigDecimal("6.50"), null, NORA);
        data.entry(ws, jonas, LocalDate.of(2026, 8, 4), new BigDecimal("8.00"), null, NORA);
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void lockAndUnlockAreRepeatSafeKeepHistoryAndNotifyMembers() {
        given().when().get("/v1/workspaces/" + ws + "/months/2026-08").then().statusCode(200)
                .body("locked", is(false)).body("workingDays", is(21)).body("daysInMonth", is(31)).body("entryCount", is(3)).body("lockedBy", nullValue());
        given().when().put("/v1/workspaces/" + ws + "/months/2026-08/lock").then().statusCode(200)
                .body("locked", is(true)).body("lockedBy.name", is("Nora Lind")).body("lockedAt", is("2026-09-23T12:00:00Z"));
        given().when().put("/v1/workspaces/" + ws + "/months/2026-08/lock").then().statusCode(200).body("locked", is(true));
        assertThat(data.count("select count(*) from month_lock where workspace_id = ? and year_month = '2026-08-01'", ws)).isEqualTo(1);
        // Maria (pay on, rate set) and Jonas (no rate) are told once each; the employer is not.
        assertThat(data.query("select logto_user_id, kind from notification where workspace_id = ? order by logto_user_id", ws))
                .containsExactly(List.of(JONAS, "MONTH_CLOSED"), List.of(MARIA, "MONTH_CLOSED"));
        assertThat(data.query("select payload->>'hours', payload->>'money', payload->>'month' from notification where workspace_id = ? and logto_user_id = ?", ws, MARIA))
                .containsExactly(List.of("10.50", "1785.00", "2026-08"));
        assertThat(data.query("select payload->>'money' from notification where workspace_id = ? and logto_user_id = ?", ws, JONAS))
                .containsExactly(java.util.Arrays.asList((Object) null));
        given().when().get("/v1/notifications?workspaceId=" + ws).then().statusCode(200);

        given().when().delete("/v1/workspaces/" + ws + "/months/2026-08/lock").then().statusCode(200).body("locked", is(false));
        given().when().delete("/v1/workspaces/" + ws + "/months/2026-08/lock").then().statusCode(200).body("locked", is(false));
        assertThat(data.count("select count(*) from month_lock where workspace_id = ? and unlocked_by = ?", ws, NORA)).isEqualTo(1);
        assertThat(data.count("select count(*) from notification where workspace_id = ? and kind = 'MONTH_REOPENED'", ws)).isEqualTo(2);
        given().when().put("/v1/workspaces/" + ws + "/months/2026-08/lock").then().statusCode(200).body("locked", is(true));
        assertThat(data.count("select count(*) from month_lock where workspace_id = ?", ws)).isEqualTo(2);
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void employeesReadTheLockButCannotLockOrSummarize() {
        given().when().get("/v1/workspaces/" + ws + "/months/2026-08").then().statusCode(200).body("locked", is(false));
        given().when().put("/v1/workspaces/" + ws + "/months/2026-08/lock").then().statusCode(403);
        given().when().get("/v1/workspaces/" + ws + "/months/2026-08/summary").then().statusCode(403);
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void theSummaryTotalsPerMemberPerWeekAndInMoney() {
        given().when().get("/v1/workspaces/" + ws + "/months/2026-08/summary").then().statusCode(200)
                .body("month", is("2026-08")).body("locked", is(false)).body("currency", is("SEK")).body("showPay", is(true))
                .body("totalHours", is(18.5f)).body("workingDays", is(21)).body("labourCost", is(1785.0f))
                .body("members", hasSize(2))
                .body("members.find { it.membershipId == '" + maria + "' }.hours", is(10.5f))
                .body("members.find { it.membershipId == '" + maria + "' }.daysWorked", is(2))
                .body("members.find { it.membershipId == '" + maria + "' }.earnings", is(1785.0f))
                .body("members.find { it.membershipId == '" + jonas + "' }.earnings", nullValue())
                .body("weeks", hasSize(6))
                .body("weeks[0].isoWeek", is(31)).body("weeks[0].from", is("2026-08-01")).body("weeks[0].to", is("2026-08-02")).body("weeks[0].hours", is(0))
                .body("weeks[1].isoWeek", is(32)).body("weeks[1].hours", is(18.5f))
                .body("weeks[5].to", is("2026-08-31"));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void theCsvOpensInSwedishExcel() {
        data.preferences(NORA, "sv", true, false);
        io.restassured.response.Response response = given().header("Accept", "text/csv")
                .when().get("/v1/workspaces/" + ws + "/months/2026-08/export.csv");
        response.then().statusCode(200).contentType(org.hamcrest.Matchers.startsWith("text/csv"))
                .header("Content-Disposition", is("attachment; filename=\"klokka-" + data.scalar("select slug from workspace where id = ?", ws) + "-2026-08.csv\""));
        String body = response.asString();
        assertThat(body).startsWith(CsvExport.BOM + "Datum;Veckodag;Person;Timmar;Anteckning;Timlön;Belopp\r\n");
        List<String> lines = List.of(body.substring(1).split("\r\n"));
        assertThat(lines).hasSize(4);
        assertThat(lines.get(1)).isEqualTo("2026-08-03;måndag;Maria Lind;4;\"Semi;colon \"\"quoted\"\"\";170;680");
        assertThat(lines.get(2)).isEqualTo("2026-08-04;tisdag;Jonas Berg;8;;;");
        assertThat(lines.get(3)).isEqualTo("2026-08-04;tisdag;Maria Lind;6,5;;170;1105");

        String mine = given().header("Accept", "text/csv").when().get("/v1/workspaces/" + ws + "/months/2026-08/export.csv?membershipId=" + jonas)
                .then().statusCode(200).extract().asString();
        assertThat(mine.substring(1).split("\r\n")).hasSize(2);
    }

    @Test
    @TestSecurity(user = JONAS)
    @OidcSecurity(claims = {@Claim(key = "sub", value = JONAS)})
    void anEmployeeExportsOnlyThemselvesInTheirLanguage() {
        data.preferences(JONAS, "en", true, false);
        String body = given().header("Accept", "text/csv").when().get("/v1/workspaces/" + ws + "/months/2026-08/export.csv")
                .then().statusCode(200).extract().asString();
        assertThat(body).startsWith(CsvExport.BOM + "Date;Weekday;Person;Hours;Note;Hourly rate;Amount\r\n2026-08-04;Tuesday;Jonas Berg;8;;;\r\n");
        given().header("Accept", "text/csv").when().get("/v1/workspaces/" + ws + "/months/2026-08/export.csv?membershipId=" + maria)
                .then().statusCode(403);
    }

    // A cell that starts with =, +, - or @ is evaluated as a formula when the CSV is opened in Excel, LibreOffice
    // or Numbers. Names are typed by the person themselves (PATCH /me reaches every membership) and notes by
    // the employer, so both are text and never a formula.
    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void theCsvNeutralisesSpreadsheetFormulasInNamesAndNotes() {
        data.preferences(NORA, "en", true, false);
        data.user("usr_mo_eve", "eve@example.com", "Eve");
        UUID eve = data.member(ws, "usr_mo_eve", "EMPLOYEE", "=HYPERLINK(\"https://evil.example\";\"Eve\")", "eve@example.com", null, "ACTIVE");
        data.entry(ws, eve, LocalDate.of(2026, 8, 5), new BigDecimal("2.00"), "+cmd|' /C calc'!A0", NORA);
        data.entry(ws, jonas, LocalDate.of(2026, 8, 6), new BigDecimal("3.00"), "-2 h lunch", NORA);
        data.entry(ws, maria, LocalDate.of(2026, 8, 7), new BigDecimal("1.00"), "@SUM(A1)", NORA);
        String body = given().header("Accept", "text/csv").when().get("/v1/workspaces/" + ws + "/months/2026-08/export.csv")
                .then().statusCode(200).extract().asString();
        List<String> lines = List.of(body.substring(1).split("\r\n"));
        assertThat(lines).contains(
                "2026-08-05;Wednesday;\"'=HYPERLINK(\"\"https://evil.example\"\";\"\"Eve\"\")\";2;'+cmd|' /C calc'!A0;;",
                "2026-08-06;Thursday;Jonas Berg;3;'-2 h lunch;;",
                "2026-08-07;Friday;Maria Lind;1;'@SUM(A1);170;170");
        // Ordinary names and notes stay exactly as typed.
        assertThat(lines).contains("2026-08-04;Tuesday;Jonas Berg;8;;;");
    }
}
