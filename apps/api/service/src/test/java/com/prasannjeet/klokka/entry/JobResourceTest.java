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
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// Jobs (CHQ-156): a day is the sum of its jobs, any day can be written unless its month is closed, a day with several
// jobs refuses day-level writes, and the month view shows jobs and keeps planned days out of the averages.
@QuarkusTest
class JobResourceTest {

    private static final String NORA = "usr_job_nora";
    private static final String MARIA = "usr_job_maria";
    private static final String CAFE = "{\"placeId\":\"place-kungsgatan-12\",\"name\":\"Café Nord\",\"address\":\"Kungsgatan 12, Stockholm\","
            + "\"latitude\":59.33459,\"longitude\":18.06324}";

    @Inject
    AgroalDataSource dataSource;

    @Inject
    MutableClock clock;

    TestData data;
    UUID ws;
    UUID maria;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        clock.reset();
        data.user(NORA, "nora@jobs.example", "Nora Lind");
        data.user(MARIA, "maria@jobs.example", "Maria Lind");
        ws = data.workspace("Jobs AB", "jobs-" + UUID.randomUUID().toString().substring(0, 8), false, "QUARTER", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@jobs.example", null, "ACTIVE");
        maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@jobs.example", null, "ACTIVE");
    }

    private String jobs(String date) {
        return "/v1/workspaces/" + ws + "/members/" + maria + "/entries/" + date + "/jobs";
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void jobsAddUpToTheDayInStartTimeOrderAndTheLastOneRemovesTheDay() {
        // A future day (the clock says 2026-09-23): planned work is allowed.
        String first = given().contentType("application/json")
                .body("{\"hours\":4.4,\"startTime\":\"13:30\",\"note\":\"Counter\",\"location\":" + CAFE + "}")
                .when().post(jobs("2026-09-28")).then().statusCode(201)
                .body("hours", is(4.5f)).body("jobs", hasSize(1)).body("note", is("Counter"))
                .body("jobs[0].startTime", is("13:30")).body("jobs[0].location.name", is("Café Nord"))
                .body("jobs[0].location.latitude", is(59.33459f))
                .extract().path("jobs[0].id");
        String entryId = given().contentType("application/json").body("{\"hours\":3,\"startTime\":\"08:00\",\"note\":\"Inventory\"}")
                .when().post(jobs("2026-09-28")).then().statusCode(201)
                .body("hours", is(7.5f)).body("jobs", hasSize(2))
                // By start time: the 08:00 job first.
                .body("jobs[0].startTime", is("08:00")).body("jobs[1].id", is(first))
                .body("note", is("Inventory; Counter")).body("changeCount", is(2))
                .extract().path("id");
        String second = given().when().get("/v1/workspaces/" + ws + "/entries?from=2026-09-28&to=2026-09-28").then().statusCode(200)
                .body("[0].jobs", hasSize(2)).extract().path("[0].jobs[0].id");

        // A new start time and no location: the total stays, the job changes.
        given().contentType("application/json").body("{\"hours\":4.5,\"startTime\":\"07:00\"}")
                .when().put("/v1/workspaces/" + ws + "/jobs/" + first).then().statusCode(200)
                .body("hours", is(7.5f)).body("jobs[0].id", is(first)).body("jobs[0].location", nullValue()).body("note", is("Inventory"));

        given().when().delete("/v1/workspaces/" + ws + "/jobs/" + first).then().statusCode(204);
        given().when().get("/v1/workspaces/" + ws + "/entries?from=2026-09-28&to=2026-09-28").then()
                .body("[0].hours", is(3.0f)).body("[0].jobs", hasSize(1));
        given().when().delete("/v1/workspaces/" + ws + "/jobs/" + second).then().statusCode(204);
        given().when().get("/v1/workspaces/" + ws + "/entries?from=2026-09-28&to=2026-09-28").then().body("size()", is(0));
        given().when().get("/v1/workspaces/" + ws + "/entries/" + entryId + "/history").then()
                .body("[0].kind", is("DELETED")).body("[0].hoursBefore", is(3.0f));
        assertThat(data.count("select count(*) from job where entry_id = ?", UUID.fromString(entryId))).isZero();
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aDayWithSeveralJobsRefusesDayLevelWritesAndOneJobKeepsItsPlace() {
        given().contentType("application/json").body("{\"hours\":4,\"startTime\":\"09:00\",\"location\":" + CAFE + "}")
                .when().post(jobs("2026-09-22")).then().statusCode(201);
        // One job: the day-level PUT goes through it and keeps its start time and place.
        given().contentType("application/json").body("{\"hours\":5,\"note\":\"Longer\"}")
                .when().put("/v1/workspaces/" + ws + "/members/" + maria + "/entries/2026-09-22").then().statusCode(200)
                .body("hours", is(5.0f)).body("jobs", hasSize(1)).body("jobs[0].hours", is(5.0f))
                .body("jobs[0].startTime", is("09:00")).body("jobs[0].location.name", is("Café Nord")).body("jobs[0].note", is("Longer"));

        given().contentType("application/json").body("{\"hours\":2}").when().post(jobs("2026-09-22")).then().statusCode(201).body("hours", is(7.0f));
        given().contentType("application/json").body("{\"hours\":6}")
                .when().put("/v1/workspaces/" + ws + "/members/" + maria + "/entries/2026-09-22").then().statusCode(409)
                .body("code", is("ENTRY_HAS_JOBS"));
        given().contentType("application/json")
                .body("{\"items\":[{\"membershipId\":\"" + maria + "\",\"workDate\":\"2026-09-22\",\"hours\":6}]}")
                .when().post("/v1/workspaces/" + ws + "/entries/batch").then().statusCode(409)
                .body("code", is("ENTRY_HAS_JOBS")).body("errors[0].field", is("items[0].hours"));
        // Removing the whole day is still one call.
        given().contentType("application/json")
                .body("{\"items\":[{\"membershipId\":\"" + maria + "\",\"workDate\":\"2026-09-22\",\"hours\":null}]}")
                .when().post("/v1/workspaces/" + ws + "/entries/batch").then().statusCode(200).body("removed", hasSize(1));
        assertThat(data.count("select count(*) from job j join hour_entry e on e.id = j.entry_id where e.membership_id = ?", maria)).isZero();
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aDayPastTwentyFourHoursAClosedMonthAndAZeroJobAreRefused() {
        given().contentType("application/json").body("{\"hours\":20}").when().post(jobs("2026-09-21")).then().statusCode(201);
        given().contentType("application/json").body("{\"hours\":5}").when().post(jobs("2026-09-21")).then().statusCode(400)
                .body("code", is("VALIDATION")).body("errors[0].field", is("hours"));
        given().contentType("application/json").body("{\"hours\":0.1}").when().post(jobs("2026-09-24")).then().statusCode(400);
        given().contentType("application/json").body("{\"hours\":2,\"startTime\":\"25:00\"}").when().post(jobs("2026-09-24")).then().statusCode(400);
        given().when().put("/v1/workspaces/" + ws + "/months/2026-08/lock").then().statusCode(200);
        given().contentType("application/json").body("{\"hours\":2}").when().post(jobs("2026-08-10")).then().statusCode(409)
                .body("code", is("MONTH_LOCKED"));
        // Positive control: the same job in an open month goes through.
        given().contentType("application/json").body("{\"hours\":2}").when().post(jobs("2026-10-10")).then().statusCode(201);
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void theMonthShowsJobsPerDayAndPlannedDaysStayOutOfTheAverage() {
        data.entry(ws, maria, LocalDate.parse("2026-09-21"), new BigDecimal("8"), null, NORA);
        given().contentType("application/json").body("{\"hours\":6,\"startTime\":\"10:00\",\"location\":" + CAFE + "}")
                .when().post(jobs("2026-09-29")).then().statusCode(201);
        given().when().get("/v1/workspaces/" + ws + "/members/" + maria + "/months/2026-09").then().statusCode(200)
                .body("totalHours", is(14.0f)).body("plannedHours", is(6.0f))
                .body("days[20].jobs", hasSize(1)).body("days[28].jobs[0].location.name", is("Café Nord"))
                .body("days[0].jobs", hasSize(0))
                // 8 h over the 17 working days elapsed up to Wednesday 23 September; the planned 6 h are left out.
                .body("avgPerWorkingDay", is(0.47f));
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void anEmployeeCannotWriteJobs() {
        given().contentType("application/json").body("{\"hours\":2}").when().post(jobs("2026-09-24")).then().statusCode(403);
    }
}
