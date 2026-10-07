package com.prasannjeet.klokka.insight;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
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
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// The read models (CHQ-121/122 member month, CHQ-124/126 workspace insights, CHQ-125 member insights) against a
// fixed clock (Wednesday 2026-09-23) and a seeded September: exact figures, computed by the API alone (D9).
@QuarkusTest
class InsightResourceTest {

    private static final String NORA = "usr_in_nora";
    private static final String MARIA = "usr_in_maria";
    private static final String JONAS = "usr_in_jonas";

    @Inject
    AgroalDataSource dataSource;

    TestData data;
    UUID ws;
    UUID nora;
    UUID maria;
    UUID jonas;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        data.user(NORA, "nora@cafenord.example", "Nora Lind");
        data.user(MARIA, "maria@example.com", "Maria Lind");
        data.user(JONAS, "jonas@example.com", "Jonas Berg");
        ws = data.workspace("Insight Corp", "insight-" + UUID.randomUUID().toString().substring(0, 8), true, "NONE", "Europe/Stockholm");
        nora = data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@example.com", new BigDecimal("170.00"), "ACTIVE");
        jonas = data.member(ws, JONAS, "EMPLOYEE", "Jonas Berg", "jonas@example.com", new BigDecimal("150.00"), "ACTIVE");
        // September 2026 up to Wednesday the 23rd (asOf): Maria Mon-Fri 4 h in weeks 37 and 38, then 21, 22, 23; Jonas 8 h on the
        // Tuesdays 8, 15, 22 and Saturday the 12th. August: Maria 40 h in total (4 h on the first ten weekdays).
        for (int d = 7; d <= 11; d++) data.entry(ws, maria, LocalDate.of(2026, 9, d), new BigDecimal("4.00"), null, NORA);
        for (int d = 14; d <= 18; d++) data.entry(ws, maria, LocalDate.of(2026, 9, d), new BigDecimal("4.00"), d == 16 ? "Delivery" : null, NORA);
        for (int d = 21; d <= 23; d++) data.entry(ws, maria, LocalDate.of(2026, 9, d), new BigDecimal("4.00"), null, NORA);
        for (int d : new int[] {8, 15, 22}) data.entry(ws, jonas, LocalDate.of(2026, 9, d), new BigDecimal("8.00"), null, NORA);
        data.entry(ws, jonas, LocalDate.of(2026, 9, 12), new BigDecimal("8.00"), null, NORA);
        for (int d = 3; d <= 14; d++) {
            LocalDate date = LocalDate.of(2026, 8, d);
            if (date.getDayOfWeek().getValue() <= 5) data.entry(ws, maria, date, new BigDecimal("4.00"), null, NORA);
        }
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void theMemberMonthListsEveryDayWithTotalsAveragesAndWeeks() {
        given().when().get("/v1/workspaces/" + ws + "/members/" + maria + "/months/2026-09").then().statusCode(200)
                .body("name", is("Maria Lind")).body("month", is("2026-09")).body("locked", is(false)).body("showPay", is(true)).body("hourlyRate", is(170.0f))
                .body("days", hasSize(30))
                .body("days[0].date", is("2026-09-01")).body("days[0].weekday", is("TUESDAY")).body("days[0].workingDay", is(true)).body("days[0].hours", nullValue()).body("days[0].changeCount", is(0))
                .body("days[15].date", is("2026-09-16")).body("days[15].hours", is(4.0f)).body("days[15].note", is("Delivery")).body("days[15].earnings", is(680.0f)).body("days[15].changeCount", is(1)).body("days[15].updatedBy.name", is("Nora Lind"))
                .body("days[12].weekday", is("SUNDAY")).body("days[12].workingDay", is(false))
                .body("totalHours", is(52.0f)).body("daysWorked", is(13)).body("workingDays", is(22))
                .body("avgPerWorkingDay", is(3.06f))
                .body("lastMonthHours", is(40.0f)).body("vsLastMonthHours", is(12.0f))
                .body("bestWeek.isoWeek", is(37)).body("bestWeek.hours", is(20.0f))
                .body("weeks", hasSize(5)).body("weeks[0].isoWeek", is(36)).body("weeks[0].from", is("2026-09-01")).body("weeks[0].to", is("2026-09-06"))
                .body("weeks[3].hours", is(12.0f))
                .body("daysWithNote", is(1)).body("earnings", is(8840.0f)).body("openFlags", is(0));
        given().when().get("/v1/workspaces/" + ws + "/members/" + jonas + "/months/2026-09").then().statusCode(403);
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void theEmployerDashboardComputesEveryFigure() {
        given().when().get("/v1/workspaces/" + ws + "/insights").then().statusCode(200)
                .body("month", is("2026-09")).body("asOf", is("2026-09-23")).body("timezone", is("Europe/Stockholm")).body("showPay", is(true))
                .body("activeMembers", is(2))
                .body("totalHours", is(84.0f))
                .body("lastMonthHoursAtSamePoint", is(40.0f)).body("vsLastMonthAtSamePointHours", is(44.0f)).body("vsLastMonthAtSamePointPercent", is(110.0f))
                .body("lastMonthTotalHours", is(40.0f))
                .body("workingDays", is(22)).body("elapsedWorkingDays", is(17))
                // 84 h over 17 elapsed working days = 4.94 h a day, times 5 remaining working days, on top of the 84.
                .body("projectedMonthEndHours", is(108.7f)).body("projectedVsLastMonthPercent", is(171.8f))
                .body("avgHoursPerPersonPerWorkingDay", is(2.47f))
                .body("labourCost", is(13640.0f))
                .body("perMember", hasSize(2))
                .body("perMember[0].name", is("Maria Lind")).body("perMember[0].hours", is(52.0f)).body("perMember[0].sharePercent", is(61.9f)).body("perMember[0].earnings", is(8840.0f))
                .body("perMember[1].name", is("Jonas Berg")).body("perMember[1].hours", is(32.0f)).body("perMember[1].sharePercent", is(38.1f))
                .body("weekByWeek", hasSize(5)).body("weekByWeek[1].hours", is(36.0f)).body("weekByWeek[2].hours", is(28.0f)).body("weekByWeek[3].hours", is(20.0f))
                .body("weekdayDistribution", hasSize(7))
                .body("weekdayDistribution[0].weekday", is("MONDAY")).body("weekdayDistribution[0].totalHours", is(12.0f)).body("weekdayDistribution[0].avgHours", is(4.0f))
                .body("weekdayDistribution[1].weekday", is("TUESDAY")).body("weekdayDistribution[1].totalHours", is(36.0f)).body("weekdayDistribution[1].avgHours", is(9.0f))
                .body("weekdayDistribution[5].totalHours", is(8.0f)).body("weekdayDistribution[5].avgHours", is(2.67f))
                .body("busiestDay.weekday", is("TUESDAY")).body("busiestDay.avgHours", is(9.0f))
                // Weekdays ever used: Mon-Fri and Saturday. Elapsed days before the 23rd with nothing logged on those weekdays.
                .body("nothingLoggedDays.date", contains("2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-19"))
                .body("currentWeek.isoWeek", is(39)).body("currentWeek.from", is("2026-09-21")).body("currentWeek.to", is("2026-09-27"))
                .body("currentWeek.hours", is(20.0f)).body("currentWeek.days", hasSize(7)).body("currentWeek.days[1].hours", is(12.0f))
                .body("currentWeek.membersLoggedToday", is(1)).body("currentWeek.membersActive", is(2))
                .body("openFlags", is(0));
        given().when().get("/v1/workspaces/" + ws + "/insights?month=2026-08").then().statusCode(200)
                .body("asOf", is("2026-08-31")).body("totalHours", is(40.0f)).body("elapsedWorkingDays", is(21)).body("projectedMonthEndHours", is(40.0f))
                .body("nothingLoggedDays", hasSize(16));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void workingTodayCountsInvitedEmployeesAndOnlyTheTeam() {
        // An invited employee with hours today is working and part of the team; the employer's own hours and a
        // deactivated employee's are neither, so "working today" never reads more than the team ("1 of 0").
        UUID ayla = data.member(ws, null, "EMPLOYEE", "Ayla Demir", "ayla@example.com", null, "INVITED");
        data.user("usr_in_olle", "olle@example.com", "Olle Ek");
        UUID olle = data.member(ws, "usr_in_olle", "EMPLOYEE", "Olle Ek", "olle@example.com", null, "DEACTIVATED");
        LocalDate today = LocalDate.of(2026, 9, 23);
        data.entry(ws, ayla, today, new BigDecimal("2.00"), null, NORA);
        data.entry(ws, olle, today, new BigDecimal("2.00"), null, NORA);
        data.entry(ws, nora, today, new BigDecimal("2.00"), null, NORA);
        given().when().get("/v1/workspaces/" + ws + "/insights").then().statusCode(200)
                .body("currentWeek.membersLoggedToday", is(2)).body("currentWeek.membersActive", is(3));
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void theEmployeeFiguresIncludeTheStreak() {
        given().when().get("/v1/workspaces/" + ws + "/members/" + maria + "/insights").then().statusCode(200)
                .body("month", is("2026-09")).body("asOf", is("2026-09-23")).body("hourlyRate", is(170.0f))
                .body("totalHours", is(52.0f)).body("lastMonthHours", is(40.0f)).body("vsLastMonthHours", is(12.0f)).body("vsLastMonthPercent", is(30.0f))
                .body("avgPerWorkingDay", is(3.06f)).body("workingDays", is(22)).body("daysWorked", is(13))
                .body("bestWeek.isoWeek", is(37)).body("weekByWeek", hasSize(5))
                .body("streakDays", is(13)).body("earnings", is(8840.0f));
    }

    @Test
    @TestSecurity(user = JONAS)
    @OidcSecurity(claims = {@Claim(key = "sub", value = JONAS)})
    void moneyIsHiddenWhenPayIsOff() {
        data.run("update workspace set show_pay = false where id = ?", ws);
        given().when().get("/v1/workspaces/" + ws + "/members/" + jonas + "/insights").then().statusCode(200)
                .body("showPay", is(false)).body("hourlyRate", nullValue()).body("earnings", nullValue()).body("streakDays", is(1));
        given().when().get("/v1/workspaces/" + ws + "/members/" + jonas + "/months/2026-09").then().statusCode(200)
                .body("earnings", nullValue()).body("days[21].earnings", nullValue()).body("days[21].hours", is(8.0f));
        given().when().get("/v1/workspaces/" + ws + "/insights").then().statusCode(403);
    }
}
