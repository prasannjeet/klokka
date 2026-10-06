package com.prasannjeet.klokka.entry;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.MutableClock;
import com.prasannjeet.klokka.support.TestData;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import java.util.UUID;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
class JobRecurrenceTest {
    private static final String OWNER = "usr_recurrence_owner";
    private static final String EMPLOYEE = "usr_recurrence_employee";
    private static final String WEEKLY = "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"MONDAY\",\"WEDNESDAY\"],\"periodCount\":8}";
    @Inject
    AgroalDataSource dataSource;
    @Inject
    MutableClock clock;
    @Inject
    KlokkaConfig config;
    TestData data;
    UUID ws;
    UUID member;

    @BeforeEach
    void setup() {
        Fake.reset();
        clock.reset();
        data = new TestData(dataSource);
        data.user(OWNER, "owner@recurrence.example", "Owner");
        data.user(EMPLOYEE, "employee@recurrence.example", "Employee");
        ws = data.workspace("Recurring", "recurring-" + UUID.randomUUID(), false, "NONE", "Europe/Stockholm");
        data.member(ws, OWNER, "EMPLOYER", "Owner", "owner@recurrence.example", null, "ACTIVE");
        member = data.member(ws, EMPLOYEE, "EMPLOYEE", "Employee", "employee@recurrence.example", null, "ACTIVE");
    }

    String base() { return "/v1/workspaces/" + ws; }
    String create(String date) { return base() + "/members/" + member + "/entries/" + date + "/jobs"; }
    String body(UUID requestId, String rule) {
        return "{\"hours\":3,\"startTime\":\"09:00\",\"note\":\"Recurring clean\",\"requestId\":\"" + requestId + "\",\"recurrence\":" + rule + "}";
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void weeklyPreviewAndRetrySafeMaterialization() {
        given().contentType("application/json").body("{\"firstDate\":\"2026-10-05\",\"recurrence\":" + WEEKLY + "}")
                .post(base() + "/jobs/recurrence-preview").then().statusCode(200)
                .body("occurrenceCount", is(16)).body("lastDate", is("2026-11-25"))
                .body("endDate", is("2026-11-29")).body("dates", hasSize(4))
                .body("dates[1].date", is("2026-10-07"));
        UUID key = UUID.randomUUID();
        String request = body(key, WEEKLY);
        String first = given().contentType("application/json").body(request).post(create("2026-10-05"))
                .then().statusCode(201).body("jobs[0].recurrence.occurrenceCount", is(16)).extract().path("id");
        given().contentType("application/json").body(request).post(create("2026-10-05"))
                .then().statusCode(201).body("id", is(first));
        given().contentType("application/json").body(request.replace("[\"MONDAY\",\"WEDNESDAY\"]", "[\"WEDNESDAY\",\"MONDAY\"]")).post(create("2026-10-05"))
                .then().statusCode(201).body("id", is(first));
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isEqualTo(16);
        assertThat(data.count("select count(*) from hour_entry_change where workspace_id = ?", ws)).isEqualTo(16);
        given().contentType("application/json").body(request.replace("\"hours\":3", "\"hours\":4"))
                .post(create("2026-10-05")).then().statusCode(400).body("errors[0].field", is("requestId"));
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void monthlyClampsWithoutDriftingAndCustomCountsCalendarPeriods() {
        given().contentType("application/json").body("{\"firstDate\":\"2026-10-31\",\"recurrence\":{\"frequency\":\"MONTHLY\",\"interval\":1,\"periodCount\":5}}")
                .post(base() + "/jobs/recurrence-preview").then().statusCode(200)
                .body("occurrenceCount", is(5)).body("lastDate", is("2027-02-28"))
                .body("dates[1].date", is("2026-11-30")).body("dates[2].date", is("2026-12-31"));
        given().contentType("application/json").body("{\"firstDate\":\"2026-10-05\",\"recurrence\":" + WEEKLY.replace("\"interval\":1", "\"interval\":2") + "}")
                .post(base() + "/jobs/recurrence-preview").then().statusCode(200)
                .body("occurrenceCount", is(8)).body("lastDate", is("2026-11-18"));
        given().contentType("application/json").body("{\"firstDate\":\"2026-10-05\",\"recurrence\":{\"frequency\":\"MONTHLY\",\"interval\":1,\"lastDayOfMonth\":true,\"endDate\":\"2026-12-31\"}}")
                .post(base() + "/jobs/recurrence-preview").then().statusCode(200)
                .body("occurrenceCount", is(3)).body("dates[0].date", is("2026-10-31"));
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void missingAmbiguousAndOversizedEndsAreRejectedWithoutWrites() {
        for (String rule : new String[]{WEEKLY.replace(",\"periodCount\":8", ""),
                WEEKLY.replace("\"periodCount\":8", "\"periodCount\":8,\"endDate\":\"2026-12-31\""),
                WEEKLY.replace("\"periodCount\":8", "\"endDate\":\"2040-01-01\""),
                WEEKLY.replace("\"periodCount\":8", "\"endDate\":\"2026-10-01\""),
                WEEKLY.replace("\"periodCount\":8", "\"periodCount\":0"),
                WEEKLY.replace("\"periodCount\":8", "\"endDate\":\"2036-10-05\""),
                WEEKLY.replace("[\"MONDAY\",\"WEDNESDAY\"]", "[]")}) {
            given().contentType("application/json").body(body(UUID.randomUUID(), rule))
                    .post(create("2026-10-05")).then().statusCode(400).body("code", is("VALIDATION"));
        }
        given().contentType("application/json").body("{\"hours\":3,\"recurrence\":" + WEEKLY + "}")
                .post(create("2026-10-05")).then().statusCode(400).body("errors[0].field", is("requestId"));
        given().contentType("application/json").body(body(UUID.randomUUID(), WEEKLY))
                .post(create("2026-09-01")).then().statusCode(400).body("errors[0].field", is("date"));
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ?", ws)).isZero();
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isZero();
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void laterLockedMonthRollsBackEntireSeries() {
        given().put(base() + "/months/2026-11/lock").then().statusCode(200);
        given().contentType("application/json").body(body(UUID.randomUUID(), WEEKLY))
                .post(create("2026-10-05")).then().statusCode(409).body("code", is("MONTH_LOCKED"));
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isZero();
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ?", ws)).isZero();
        given().delete(base() + "/months/2026-11/lock").then().statusCode(200);
        given().contentType("application/json").body(body(UUID.randomUUID(), WEEKLY)).post(create("2026-10-05"))
                .then().statusCode(201);
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void editOneEditFutureAndStopKeepUnrelatedJobsAndEarlierHistory() {
        given().contentType("application/json").body(body(UUID.randomUUID(), WEEKLY)).post(create("2026-10-05"))
                .then().statusCode(201);
        String selected = given().get(base() + "/entries?from=2026-10-07&to=2026-10-07&membershipId=" + member)
                .then().statusCode(200).extract().path("[0].jobs[0].id");
        given().contentType("application/json").body("{\"hours\":2}").put(base() + "/jobs/" + selected)
                .then().statusCode(200).body("hours", is(2.0f));
        assertThat(data.count("select count(*) from job where workspace_id = ? and hours = 3", ws)).isEqualTo(15);
        given().contentType("application/json").body("{\"hours\":4,\"note\":\"Changed series\"}")
                .put(base() + "/jobs/" + selected + "?scope=THIS_AND_FUTURE").then().statusCode(200);
        assertThat(data.count("select count(*) from job where workspace_id = ? and hours = 4", ws)).isEqualTo(15);
        given().contentType("application/json").body("{\"hours\":1}").post(create("2026-10-07")).then().statusCode(201);
        given().delete(base() + "/jobs/" + selected + "?scope=THIS_AND_FUTURE").then().statusCode(204);
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isEqualTo(2);
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ? and stopped", ws)).isEqualTo(1);
        given().get(base() + "/entries?from=2026-10-07&to=2026-10-07&membershipId=" + member)
                .then().statusCode(200).body("[0].hours", is(1.0f));
    }

    @Test
    @TestSecurity(user = EMPLOYEE)
    @OidcSecurity(claims = @Claim(key = "sub", value = EMPLOYEE))
    void employeeMayReadOwnOccurrencesButCannotCreateOrPreview() {
        UUID entry = data.entry(ws, member, LocalDate.of(2026, 10, 5), new BigDecimal("3.00"), "Recurring clean", OWNER);
        UUID series = UUID.randomUUID();
        data.run("insert into job_recurrence (id,workspace_id,request_id,membership_id,first_date,end_date,frequency,repeat_interval,weekdays,period_count,occurrence_count,last_date,first_entry_id,created_by) values (?,?,?,?,date '2026-10-05',date '2026-11-29','WEEKLY',1,'WEDNESDAY,MONDAY',8,16,date '2026-11-25',?,?)", series, ws, UUID.randomUUID(), member, entry, OWNER);
        data.run("update job set recurrence_id = ? where workspace_id = ? and entry_id = ?", series, ws, entry);
        given().get(base() + "/entries?from=2026-10-05&to=2026-10-05&membershipId=" + member).then().statusCode(200)
                .body("[0].jobs[0].recurrence.id", is(series.toString())).body("[0].hours", is(3.0f))
                .body("[0].jobs[0].recurrence.recurrence.weekdays", contains("MONDAY", "WEDNESDAY"));
        UUID boss = (UUID) data.scalar("select id from membership where workspace_id = ? and logto_user_id = ?", ws, OWNER);
        data.entry(ws, boss, LocalDate.of(2026, 10, 5), new BigDecimal("9.00"), "Private employer work", OWNER);
        given().get(base() + "/entries?from=2026-10-05&to=2026-10-05&membershipId=" + boss).then().statusCode(200)
                .body("", hasSize(1)).body("[0].membershipId", is(member.toString())).body("[0].hours", is(3.0f));
        given().contentType("application/json").body(body(UUID.randomUUID(), WEEKLY)).post(create("2026-10-05"))
                .then().statusCode(403);
        given().contentType("application/json").body("{\"firstDate\":\"2026-10-05\",\"recurrence\":" + WEEKLY + "}")
                .post(base() + "/jobs/recurrence-preview").then().statusCode(403);
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void seriesChangesRollbackWhenLaterMonthsAreLockedAndPastScopeIsRefused() {
        String selected = given().contentType("application/json").body(body(UUID.randomUUID(), WEEKLY))
                .post(create("2026-10-05")).then().statusCode(201).extract().path("jobs[0].id");
        given().put(base() + "/months/2026-11/lock").then().statusCode(200);
        given().contentType("application/json").body("{\"hours\":4}")
                .put(base() + "/jobs/" + selected + "?scope=THIS_AND_FUTURE").then().statusCode(409);
        assertThat(data.count("select count(*) from job where workspace_id = ? and hours = 3", ws)).isEqualTo(16);
        given().delete(base() + "/jobs/" + selected + "?scope=THIS_AND_FUTURE").then().statusCode(409);
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isEqualTo(16);
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ? and stopped", ws)).isZero();
        given().delete(base() + "/months/2026-11/lock").then().statusCode(200);
        clock.set(Instant.parse("2026-10-05T22:30:00Z")); // Already October 6 in Stockholm.
        given().delete(base() + "/jobs/" + selected + "?scope=THIS_AND_FUTURE").then().statusCode(400);
        given().delete(base() + "/jobs/" + selected).then().statusCode(204);
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isEqualTo(15);
        given().contentType("application/json").body(body(UUID.randomUUID(), WEEKLY)).post(create("2026-10-05"))
                .then().statusCode(400).body("errors[0].field", is("date"));
        clock.reset();
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aLaterDailyLimitRejectsEveryOccurrenceAndAccountDeletionRemovesSeries() {
        given().contentType("application/json").body("{\"hours\":23}").post(create("2026-10-07")).then().statusCode(201);
        given().contentType("application/json").body(body(UUID.randomUUID(), WEEKLY)).post(create("2026-10-05"))
                .then().statusCode(400);
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isEqualTo(1);
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ?", ws)).isZero();
        given().contentType("application/json").body(body(UUID.randomUUID(), WEEKLY).replace("\"hours\":3", "\"hours\":1"))
                .post(create("2026-10-05")).then().statusCode(201);
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ?", ws)).isEqualTo(1);
        given().delete("/v1/me").then().statusCode(204);
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ?", ws)).isZero();
        assertThat(data.count("select count(*) from workspace where id = ?", ws)).isZero();
    }

    String preview(String firstDate, String rule) {
        return "{\"firstDate\":\"" + firstDate + "\",\"recurrence\":" + rule + "}";
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void weeklyFromMidWeekWithIntervalAnchorsOnTheFirstWeeksMonday() {
        // Wednesday start, every second week: weeks of Oct 5, Oct 19 and Nov 2 (anchor Monday Oct 5); Oct 5 is before
        // the first date and Nov 5 after the end (four weeks from Oct 7, so Nov 3).
        String rule = "{\"frequency\":\"WEEKLY\",\"interval\":2,\"weekdays\":[\"THURSDAY\",\"MONDAY\"],\"periodCount\":4}";
        given().contentType("application/json").body(preview("2026-10-07", rule))
                .post(base() + "/jobs/recurrence-preview").then().statusCode(200)
                .body("occurrenceCount", is(4)).body("endDate", is("2026-11-03")).body("lastDate", is("2026-11-02"))
                .body("dates.date", contains("2026-10-08", "2026-10-19", "2026-10-22", "2026-11-02"));
        given().contentType("application/json").body(body(UUID.randomUUID(), rule)).post(create("2026-10-07"))
                .then().statusCode(201).body("workDate", is("2026-10-08"))
                .body("jobs[0].recurrence.recurrence.weekdays", contains("MONDAY", "THURSDAY"));
        assertThat(data.count("select count(*) from job j join hour_entry e on e.id = j.entry_id where j.workspace_id = ? "
                + "and e.work_date in (date '2026-10-08', date '2026-10-19', date '2026-10-22', date '2026-11-02')", ws)).isEqualTo(4);
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isEqualTo(4);
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void monthlyWithIntervalSkipsMonthsAndClampsEachOccurrence() {
        given().contentType("application/json")
                .body(preview("2026-10-31", "{\"frequency\":\"MONTHLY\",\"interval\":3,\"endDate\":\"2027-12-31\"}"))
                .post(base() + "/jobs/recurrence-preview").then().statusCode(200)
                .body("occurrenceCount", is(5)).body("lastDate", is("2027-10-31")).body("endDate", is("2027-12-31"))
                .body("dates.date", contains("2026-10-31", "2027-01-31", "2027-04-30", "2027-07-31"));
        // Six calendar months from Nov 15 end on May 14, so May 15 is out: periods are counted, not occurrences.
        given().contentType("application/json")
                .body(preview("2026-11-15", "{\"frequency\":\"MONTHLY\",\"interval\":2,\"periodCount\":6}"))
                .post(base() + "/jobs/recurrence-preview").then().statusCode(200)
                .body("occurrenceCount", is(3)).body("lastDate", is("2027-03-15")).body("endDate", is("2027-05-14"))
                .body("dates.date", contains("2026-11-15", "2027-01-15", "2027-03-15"));
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void lastDayOfMonthAndClampingFollowTheLeapYearFebruary() {
        given().contentType("application/json")
                .body(preview("2028-01-10", "{\"frequency\":\"MONTHLY\",\"interval\":1,\"lastDayOfMonth\":true,\"endDate\":\"2028-04-30\"}"))
                .post(base() + "/jobs/recurrence-preview").then().statusCode(200)
                .body("occurrenceCount", is(4)).body("lastDate", is("2028-04-30"))
                .body("dates.date", contains("2028-01-31", "2028-02-29", "2028-03-31", "2028-04-30"));
        given().contentType("application/json")
                .body(preview("2028-01-30", "{\"frequency\":\"MONTHLY\",\"interval\":1,\"periodCount\":3}"))
                .post(base() + "/jobs/recurrence-preview").then().statusCode(200)
                .body("occurrenceCount", is(3)).body("endDate", is("2028-04-29"))
                .body("dates.date", contains("2028-01-30", "2028-02-29", "2028-03-30"));
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void theJobCapAllowsExactlyMaxJobsAndRefusesOneMore() {
        int max = config.recurrence().maxJobs();
        LocalDate first = LocalDate.of(2026, 10, 5);
        LocalDate atCap = first.plusDays(max - 1);
        String everyDay = "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"MONDAY\",\"TUESDAY\",\"WEDNESDAY\",\"THURSDAY\","
                + "\"FRIDAY\",\"SATURDAY\",\"SUNDAY\"],\"endDate\":\"%s\"}";
        given().contentType("application/json").body(preview(first.toString(), everyDay.formatted(atCap)))
                .post(base() + "/jobs/recurrence-preview").then().statusCode(200)
                .body("occurrenceCount", is(max)).body("lastDate", is(atCap.toString()));
        given().contentType("application/json").body(preview(first.toString(), everyDay.formatted(atCap.plusDays(1))))
                .post(base() + "/jobs/recurrence-preview").then().statusCode(400)
                .body("errors[0].field", is("recurrence.endDate"));
        given().contentType("application/json").body(body(UUID.randomUUID(), everyDay.formatted(atCap.plusDays(1))))
                .post(create(first.toString())).then().statusCode(400).body("errors[0].field", is("recurrence.endDate"));
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ?", ws)).isZero();
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isZero();
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aSingleOccurrenceOfAStoppedSeriesCanStillBeChanged() {
        given().contentType("application/json").body(body(UUID.randomUUID(), WEEKLY)).post(create("2026-10-05"))
                .then().statusCode(201);
        String stopFrom = given().get(base() + "/entries?from=2026-10-21&to=2026-10-21&membershipId=" + member)
                .then().statusCode(200).extract().path("[0].jobs[0].id");
        given().delete(base() + "/jobs/" + stopFrom + "?scope=THIS_AND_FUTURE").then().statusCode(204);
        // Oct 5, 7, 12, 14 and 19 remain.
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isEqualTo(5);
        String kept = given().get(base() + "/entries?from=2026-10-12&to=2026-10-12&membershipId=" + member)
                .then().statusCode(200).body("[0].jobs[0].recurrence.stopped", is(true)).extract().path("[0].jobs[0].id");
        given().contentType("application/json").body("{\"hours\":2,\"note\":\"Moved\"}").put(base() + "/jobs/" + kept)
                .then().statusCode(200).body("hours", is(2.0f)).body("jobs[0].note", is("Moved"))
                .body("jobs[0].recurrence.stopped", is(true)).body("jobs[0].recurrence.occurrenceCount", is(16));
        assertThat(data.count("select count(*) from job where workspace_id = ? and hours = 3", ws)).isEqualTo(4);
        given().delete(base() + "/jobs/" + kept).then().statusCode(204);
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isEqualTo(4);
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ? and stopped", ws)).isEqualTo(1);
    }
}
