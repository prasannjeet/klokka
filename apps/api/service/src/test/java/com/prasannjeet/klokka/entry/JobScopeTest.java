package com.prasannjeet.klokka.entry;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
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
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// Series edits by scope (CHQ-187): field changes and removals over THIS_AND_FUTURE and ALL reach past jobs, skip
// closed months and count them; a schedule change splits or rewrites the series from the later of the job's date
// and today. The clock starts on Wednesday 2026-09-23 (Stockholm); every assertion reads only this test's workspace.
@QuarkusTest
class JobScopeTest {
    private static final String OWNER = "usr_scope_owner";
    private static final String EMPLOYEE = "usr_scope_employee";
    // Wednesdays 2026-09-23 to 2026-11-11 (eight weeks): eight jobs.
    private static final String EIGHT_WEDNESDAYS = "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"WEDNESDAY\"],\"periodCount\":8}";
    private static final String OPEN_WEDNESDAYS = "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"WEDNESDAY\"]}";

    @Inject
    AgroalDataSource dataSource;
    @Inject
    MutableClock clock;
    @Inject
    RecurrenceExtender extender;
    TestData data;
    UUID ws;
    UUID member;

    @BeforeEach
    void setup() {
        Fake.reset();
        clock.reset();
        data = new TestData(dataSource);
        data.user(OWNER, "owner@scope.example", "Owner");
        data.user(EMPLOYEE, "employee@scope.example", "Employee");
        ws = data.workspace("Scopes", "scopes-" + UUID.randomUUID(), false, "NONE", "Europe/Stockholm");
        data.member(ws, OWNER, "EMPLOYER", "Owner", "owner@scope.example", null, "ACTIVE");
        member = data.member(ws, EMPLOYEE, "EMPLOYEE", "Employee", "employee@scope.example", null, "ACTIVE");
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    String base() { return "/v1/workspaces/" + ws; }

    // A series of 3-hour jobs from `first`; returns its id.
    UUID series(String first, String rule) {
        String body = "{\"hours\":3,\"startTime\":\"09:00\",\"requestId\":\"" + UUID.randomUUID() + "\",\"recurrence\":" + rule + "}";
        String jobId = given().contentType("application/json").body(body)
                .post(base() + "/members/" + member + "/entries/" + first + "/jobs").then().statusCode(201)
                .extract().path("jobs[0].id");
        return (UUID) data.scalar("select recurrence_id from job where workspace_id = ? and id = ?", ws, UUID.fromString(jobId));
    }

    String jobOn(String date) {
        return given().get(base() + "/entries?from=" + date + "&to=" + date + "&membershipId=" + member)
                .then().statusCode(200).extract().path("[0].jobs[0].id");
    }

    String schedule(UUID requestId, String rule) {
        return "{\"hours\":3,\"startTime\":\"09:00\",\"requestId\":\"" + requestId + "\",\"recurrence\":" + rule + "}";
    }

    // The work dates of the series' jobs with these hours, in order.
    List<String> dates(UUID series, int hours) {
        return data.query("select e.work_date::text from job j join hour_entry e on e.workspace_id = j.workspace_id and e.id = j.entry_id "
                + "where j.workspace_id = ? and j.recurrence_id = ? and j.hours = ? and e.deleted_at is null order by e.work_date",
                ws, series, hours).stream().map(r -> (String) r.getFirst()).toList();
    }

    List<String> dates(UUID series) {
        return data.query("select e.work_date::text from job j join hour_entry e on e.workspace_id = j.workspace_id and e.id = j.entry_id "
                + "where j.workspace_id = ? and j.recurrence_id = ? and e.deleted_at is null order by e.work_date",
                ws, series).stream().map(r -> (String) r.getFirst()).toList();
    }

    List<Object> seriesRow(UUID series) {
        return data.query("select first_date::text, end_date::text, stopped, occurrence_count, last_date::text, previous_id "
                + "from job_recurrence where workspace_id = ? and id = ?", ws, series).getFirst();
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void thisAndFutureFromAPastJobChangesItAndEverythingAfterButNothingBefore() {
        UUID series = series("2026-09-23", EIGHT_WEDNESDAYS);
        clock.set(Instant.parse("2026-10-15T10:00:00Z"));
        given().contentType("application/json").body("{\"hours\":5,\"note\":\"Longer\"}")
                .put(base() + "/jobs/" + jobOn("2026-09-30") + "?scope=THIS_AND_FUTURE").then().statusCode(200)
                .body("workDate", is("2026-09-30")).body("hours", is(5.0f)).body("jobs[0].note", is("Longer"));
        assertThat(dates(series, 3)).containsExactly("2026-09-23");
        assertThat(dates(series, 5)).containsExactly("2026-09-30", "2026-10-07", "2026-10-14", "2026-10-21", "2026-10-28",
                "2026-11-04", "2026-11-11");
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ? and hours = 5 and note = 'Longer' "
                + "and start_time is null", ws)).isEqualTo(1);
    }

    // CHQ-191: a series carries its title to every job and to the template; a this-and-following title change
    // reaches only those jobs and becomes the template's title.
    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aSeriesTitleReachesEveryJobAndAThisAndFollowingChangeOnlyThose() {
        String body = "{\"hours\":3,\"startTime\":\"09:00\",\"title\":\"Window cleaning\",\"requestId\":\"" + UUID.randomUUID()
                + "\",\"recurrence\":" + EIGHT_WEDNESDAYS + "}";
        String first = given().contentType("application/json").body(body)
                .post(base() + "/members/" + member + "/entries/2026-09-23/jobs").then().statusCode(201)
                .body("jobs[0].title", is("Window cleaning")).extract().path("jobs[0].id");
        UUID series = (UUID) data.scalar("select recurrence_id from job where workspace_id = ? and id = ?", ws, UUID.fromString(first));
        assertThat(titles(series)).containsOnly("Window cleaning").hasSize(8);
        assertThat(data.scalar("select title from job_recurrence where workspace_id = ? and id = ?", ws, series)).isEqualTo("Window cleaning");

        given().contentType("application/json").body("{\"hours\":3,\"startTime\":\"09:00\",\"title\":\"Deep clean\"}")
                .put(base() + "/jobs/" + jobOn("2026-10-14") + "?scope=THIS_AND_FUTURE").then().statusCode(200)
                .body("jobs[0].title", is("Deep clean"));
        assertThat(titles(series)).containsExactly("Window cleaning", "Window cleaning", "Window cleaning", "Deep clean", "Deep clean",
                "Deep clean", "Deep clean", "Deep clean");
        assertThat(data.scalar("select title from job_recurrence where workspace_id = ? and id = ?", ws, series)).isEqualTo("Deep clean");
    }

    List<String> titles(UUID series) {
        return data.query("select j.title from job j join hour_entry e on e.workspace_id = j.workspace_id and e.id = j.entry_id "
                + "where j.workspace_id = ? and j.recurrence_id = ? and e.deleted_at is null order by e.work_date",
                ws, series).stream().map(r -> (String) r.getFirst()).toList();
    }

    Object templateTitle(UUID series) {
        return data.scalar("select title from job_recurrence where workspace_id = ? and id = ?", ws, series);
    }

    // CHQ-191: a client from before 1.8.0 sends JobWrite without the title. Left out, every job keeps its own title
    // and the template keeps its; a title change on one job leaves the template alone; one over ALL reaches every
    // job and the template, and an explicit null clears them all.
    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aJobWriteWithoutTheTitleKeepsTheSeriesTitles() {
        String body = "{\"hours\":3,\"startTime\":\"09:00\",\"title\":\"Window cleaning\",\"requestId\":\"" + UUID.randomUUID()
                + "\",\"recurrence\":" + EIGHT_WEDNESDAYS + "}";
        String first = given().contentType("application/json").body(body)
                .post(base() + "/members/" + member + "/entries/2026-09-23/jobs").then().statusCode(201).extract().path("jobs[0].id");
        UUID series = (UUID) data.scalar("select recurrence_id from job where workspace_id = ? and id = ?", ws, UUID.fromString(first));

        given().contentType("application/json").body("{\"hours\":3,\"startTime\":\"09:00\",\"title\":\"Inside only\"}")
                .put(base() + "/jobs/" + jobOn("2026-09-30") + "?scope=ONLY_THIS").then().statusCode(200)
                .body("jobs[0].title", is("Inside only"));
        assertThat(titles(series)).containsExactly("Window cleaning", "Inside only", "Window cleaning", "Window cleaning",
                "Window cleaning", "Window cleaning", "Window cleaning", "Window cleaning");
        assertThat(templateTitle(series)).isEqualTo("Window cleaning");

        given().contentType("application/json").body("{\"hours\":4,\"startTime\":\"09:00\"}")
                .put(base() + "/jobs/" + jobOn("2026-10-07") + "?scope=ALL").then().statusCode(200)
                .body("hours", is(4.0f)).body("jobs[0].title", is("Window cleaning"));
        assertThat(dates(series, 4)).hasSize(8);
        assertThat(titles(series)).containsExactly("Window cleaning", "Inside only", "Window cleaning", "Window cleaning",
                "Window cleaning", "Window cleaning", "Window cleaning", "Window cleaning");
        assertThat(data.query("select hours, title from job_recurrence where workspace_id = ? and id = ?", ws, series).getFirst())
                .containsExactly(new BigDecimal("4.00"), "Window cleaning");

        given().contentType("application/json").body("{\"hours\":4,\"startTime\":\"09:00\",\"title\":\"Deep clean\"}")
                .put(base() + "/jobs/" + jobOn("2026-10-07") + "?scope=ALL").then().statusCode(200);
        assertThat(titles(series)).containsOnly("Deep clean").hasSize(8);
        assertThat(templateTitle(series)).isEqualTo("Deep clean");

        given().contentType("application/json").body("{\"hours\":4,\"startTime\":\"09:00\",\"title\":null}")
                .put(base() + "/jobs/" + jobOn("2026-10-07") + "?scope=ALL").then().statusCode(200);
        assertThat(titles(series)).containsOnlyNulls().hasSize(8);
        assertThat(templateTitle(series)).isNull();
    }

    // A schedule change without the title plans its jobs with the series' title; the same key with title null is a
    // different request (it would clear the title), so it is refused.
    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aScheduleChangeWithoutTheTitleKeepsTheSeriesTitle() {
        String body = "{\"hours\":3,\"startTime\":\"09:00\",\"title\":\"Window cleaning\",\"requestId\":\"" + UUID.randomUUID()
                + "\",\"recurrence\":" + EIGHT_WEDNESDAYS + "}";
        String first = given().contentType("application/json").body(body)
                .post(base() + "/members/" + member + "/entries/2026-09-23/jobs").then().statusCode(201).extract().path("jobs[0].id");
        UUID old = (UUID) data.scalar("select recurrence_id from job where workspace_id = ? and id = ?", ws, UUID.fromString(first));
        String thursdays = "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"THURSDAY\"],\"periodCount\":3}";
        String selected = jobOn("2026-10-14");
        UUID key = UUID.randomUUID();
        given().contentType("application/json").body(schedule(key, thursdays))
                .put(base() + "/jobs/" + selected + "?scope=THIS_AND_FUTURE").then().statusCode(200);
        UUID next = (UUID) data.scalar("select id from job_recurrence where workspace_id = ? and previous_id = ?", ws, old);
        assertThat(titles(next)).containsOnly("Window cleaning").isNotEmpty();
        assertThat(templateTitle(next)).isEqualTo("Window cleaning");

        given().contentType("application/json").body(schedule(key, thursdays).replace("\"hours\":3", "\"hours\":3,\"title\":null"))
                .put(base() + "/jobs/" + selected + "?scope=THIS_AND_FUTURE").then().statusCode(400)
                .body("errors[0].field", is("requestId"));
        assertThat(titles(next)).containsOnly("Window cleaning");
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void allChangesPastAndFutureAndSkipsAndCountsJobsInClosedMonths() {
        UUID series = series("2026-09-23", EIGHT_WEDNESDAYS);
        clock.set(Instant.parse("2026-10-15T10:00:00Z"));
        given().put(base() + "/months/2026-10/lock").then().statusCode(200);
        String sep30 = jobOn("2026-09-30");
        given().get(base() + "/jobs/" + sep30 + "/scope-counts").then().statusCode(200)
                .body("onlyThis.jobs", is(1)).body("onlyThis.skippedClosed", is(0))
                .body("thisAndFuture.jobs", is(3)).body("thisAndFuture.skippedClosed", is(4))
                .body("all.jobs", is(4)).body("all.skippedClosed", is(4));

        given().contentType("application/json").body("{\"hours\":5}")
                .put(base() + "/jobs/" + jobOn("2026-11-04") + "?scope=ALL").then().statusCode(200);
        assertThat(dates(series, 5)).containsExactly("2026-09-23", "2026-09-30", "2026-11-04", "2026-11-11");
        assertThat(dates(series, 3)).containsExactly("2026-10-07", "2026-10-14", "2026-10-21", "2026-10-28");

        // Positive control: once October is open again the same change reaches its jobs too.
        given().delete(base() + "/months/2026-10/lock").then().statusCode(200);
        given().get(base() + "/jobs/" + sep30 + "/scope-counts").then().statusCode(200)
                .body("all.jobs", is(8)).body("all.skippedClosed", is(0));
        given().contentType("application/json").body("{\"hours\":5}")
                .put(base() + "/jobs/" + jobOn("2026-11-04") + "?scope=ALL").then().statusCode(200);
        assertThat(dates(series, 5)).hasSize(8);
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aRangeEntirelyInClosedMonthsIsRefusedWithMonthLocked() {
        UUID series = series("2026-09-23", EIGHT_WEDNESDAYS);
        given().put(base() + "/months/2026-11/lock").then().statusCode(200);
        String nov4 = jobOn("2026-11-04");
        given().get(base() + "/jobs/" + nov4 + "/scope-counts").then().statusCode(200)
                .body("onlyThis.jobs", is(0)).body("onlyThis.skippedClosed", is(1))
                .body("thisAndFuture.jobs", is(0)).body("thisAndFuture.skippedClosed", is(2))
                .body("all.jobs", is(6)).body("all.skippedClosed", is(2));
        given().contentType("application/json").body("{\"hours\":5}")
                .put(base() + "/jobs/" + nov4 + "?scope=THIS_AND_FUTURE").then().statusCode(409).body("code", is("MONTH_LOCKED"));
        given().delete(base() + "/jobs/" + nov4 + "?scope=THIS_AND_FUTURE").then().statusCode(409).body("code", is("MONTH_LOCKED"));
        assertThat(dates(series, 3)).hasSize(8);
        assertThat(seriesRow(series).get(2)).isEqualTo(false);

        // Positive control: from the last October job the range has one open job, which changes.
        given().contentType("application/json").body("{\"hours\":5}")
                .put(base() + "/jobs/" + jobOn("2026-10-28") + "?scope=THIS_AND_FUTURE").then().statusCode(200);
        assertThat(dates(series, 5)).containsExactly("2026-10-28");
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aSingleJobCountsOneForEveryScopeAndRefusesARangeScope() {
        String single = given().contentType("application/json").body("{\"hours\":2}")
                .post(base() + "/members/" + member + "/entries/2026-09-25/jobs").then().statusCode(201).extract().path("jobs[0].id");
        given().get(base() + "/jobs/" + single + "/scope-counts").then().statusCode(200)
                .body("onlyThis.jobs", is(1)).body("thisAndFuture.jobs", is(1)).body("all.jobs", is(1))
                .body("all.skippedClosed", is(0));
        given().contentType("application/json").body("{\"hours\":4}")
                .put(base() + "/jobs/" + single + "?scope=ALL").then().statusCode(400).body("errors[0].field", is("scope"));
        given().contentType("application/json").body("{\"hours\":4}")
                .put(base() + "/jobs/" + single).then().statusCode(200).body("hours", is(4.0f));
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aScheduleChangeFromAFutureJobSplitsTheSeriesAndKeepsEarlierJobs() {
        UUID old = series("2026-09-23", "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"WEDNESDAY\"],\"endDate\":\"2026-12-31\"}");
        assertThat(dates(old)).hasSize(15);
        String third = "{\"frequency\":\"MONTHLY\",\"interval\":1,\"monthlyBy\":\"WEEKDAY_OF_MONTH\",\"weekOfMonth\":\"THIRD\","
                + "\"weekday\":\"WEDNESDAY\",\"endDate\":\"2026-12-31\"}";
        String selected = jobOn("2026-10-21");
        UUID key = UUID.randomUUID();
        given().contentType("application/json").body(schedule(key, third))
                .put(base() + "/jobs/" + selected + "?scope=THIS_AND_FUTURE").then().statusCode(200)
                .body("workDate", is("2026-10-21")).body("jobs[0].recurrence.recurrence.weekOfMonth", is("THIRD"));

        assertThat(dates(old)).containsExactly("2026-09-23", "2026-09-30", "2026-10-07", "2026-10-14");
        assertThat(seriesRow(old)).containsExactly("2026-09-23", "2026-10-20", true, 4, "2026-10-14", null);
        UUID next = (UUID) data.scalar("select id from job_recurrence where workspace_id = ? and previous_id = ?", ws, old);
        assertThat(dates(next)).containsExactly("2026-10-21", "2026-11-18", "2026-12-16");
        assertThat(seriesRow(next)).containsExactly("2026-10-21", "2026-12-31", false, 3, "2026-12-16", old);
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isEqualTo(7);

        // A retry answers the same day and writes nothing; the same key with another body is refused.
        given().contentType("application/json").body(schedule(key, third))
                .put(base() + "/jobs/" + selected + "?scope=THIS_AND_FUTURE").then().statusCode(200)
                .body("workDate", is("2026-10-21"));
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ?", ws)).isEqualTo(2);
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isEqualTo(7);
        given().contentType("application/json").body(schedule(key, third).replace("\"hours\":3", "\"hours\":4"))
                .put(base() + "/jobs/" + selected + "?scope=THIS_AND_FUTURE").then().statusCode(400)
                .body("errors[0].field", is("requestId"));
        given().contentType("application/json").body(schedule(key, third).replace("\"hours\":3", "\"hours\":4"))
                .put(base() + "/jobs/" + jobOn("2026-09-30") + "?scope=THIS_AND_FUTURE").then().statusCode(400)
                .body("errors[0].field", is("requestId"));
        assertThat(data.count("select count(*) from job where workspace_id = ? and hours = 4", ws)).isZero();
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aScheduleChangeFromTheFirstJobRewritesTheSeriesInPlace() {
        UUID series = series("2026-09-30", "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"WEDNESDAY\"],\"endDate\":\"2026-11-30\"}");
        String mondays = "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"MONDAY\"],\"endDate\":\"2026-11-30\"}";
        given().contentType("application/json").body(schedule(UUID.randomUUID(), mondays))
                .put(base() + "/jobs/" + jobOn("2026-09-30") + "?scope=THIS_AND_FUTURE").then().statusCode(200)
                .body("workDate", is("2026-10-05"));
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ?", ws)).isEqualTo(1);
        assertThat(dates(series)).containsExactly("2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02",
                "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30");
        // The rewritten series starts with its first job (the rule stays anchored on the same rhythm).
        assertThat(seriesRow(series)).containsExactly("2026-10-05", "2026-11-30", false, 9, "2026-11-30", null);
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ? and weekdays = 'MONDAY'", ws)).isEqualTo(1);
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aScheduleChangeFromAPastJobWritesFromTodayAndNeedsThisAndFutureAndARequestId() {
        UUID old = series("2026-09-23", "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"WEDNESDAY\"],\"endDate\":\"2026-12-31\"}");
        clock.set(Instant.parse("2026-10-15T10:00:00Z")); // Thursday
        String sep30 = jobOn("2026-09-30");
        String fridays = "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"FRIDAY\"],\"endDate\":\"2026-11-30\"}";
        given().contentType("application/json").body(schedule(UUID.randomUUID(), fridays))
                .put(base() + "/jobs/" + sep30).then().statusCode(400).body("errors[0].field", is("scope"));
        given().contentType("application/json").body(schedule(UUID.randomUUID(), fridays))
                .put(base() + "/jobs/" + sep30 + "?scope=ALL").then().statusCode(400).body("errors[0].field", is("scope"));
        given().contentType("application/json").body("{\"hours\":3,\"recurrence\":" + fridays + "}")
                .put(base() + "/jobs/" + sep30 + "?scope=THIS_AND_FUTURE").then().statusCode(400).body("errors[0].field", is("requestId"));
        given().contentType("application/json").body("{\"hours\":3,\"requestId\":\"" + UUID.randomUUID() + "\"}")
                .put(base() + "/jobs/" + sep30 + "?scope=THIS_AND_FUTURE").then().statusCode(400).body("errors[0].field", is("requestId"));
        assertThat(dates(old)).hasSize(15);

        given().contentType("application/json").body(schedule(UUID.randomUUID(), fridays))
                .put(base() + "/jobs/" + sep30 + "?scope=THIS_AND_FUTURE").then().statusCode(200)
                .body("workDate", is("2026-09-30"));
        assertThat(dates(old)).containsExactly("2026-09-23", "2026-09-30", "2026-10-07", "2026-10-14");
        assertThat(seriesRow(old).subList(1, 3)).containsExactly("2026-10-14", true);
        UUID next = (UUID) data.scalar("select id from job_recurrence where workspace_id = ? and previous_id = ?", ws, old);
        assertThat(seriesRow(next).getFirst()).isEqualTo("2026-10-16");
        assertThat(dates(next)).containsExactly("2026-10-16", "2026-10-23", "2026-10-30", "2026-11-06", "2026-11-13",
                "2026-11-20", "2026-11-27");
    }

    // Review fix: a schedule change from a past job counts "every 2 weeks" from that job's week, not from today's, so
    // changing only the end keeps every later date where it was.
    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aScheduleChangeFromAPastJobKeepsAFortnightlyRhythm() {
        String fortnightly = "{\"frequency\":\"WEEKLY\",\"interval\":2,\"weekdays\":[\"WEDNESDAY\"],\"endDate\":\"2026-12-31\"}";
        UUID old = series("2026-09-23", fortnightly);
        assertThat(dates(old)).containsExactly("2026-09-23", "2026-10-07", "2026-10-21", "2026-11-04", "2026-11-18",
                "2026-12-02", "2026-12-16", "2026-12-30");
        clock.set(Instant.parse("2026-10-15T10:00:00Z")); // Thursday
        String shorter = fortnightly.replace("2026-12-31", "2026-11-30");
        given().contentType("application/json").body("{\"firstDate\":\"2026-10-07\",\"fromDate\":\"2026-10-15\",\"recurrence\":"
                + shorter + "}").post(base() + "/jobs/recurrence-preview").then().statusCode(200)
                .body("dates.date", org.hamcrest.Matchers.contains("2026-10-21", "2026-11-04", "2026-11-18"))
                .body("occurrenceCount", is(3)).body("lastDate", is("2026-11-18"));
        given().contentType("application/json").body(schedule(UUID.randomUUID(), shorter))
                .put(base() + "/jobs/" + jobOn("2026-10-07") + "?scope=THIS_AND_FUTURE").then().statusCode(200);
        assertThat(dates(old)).containsExactly("2026-09-23", "2026-10-07");
        UUID next = (UUID) data.scalar("select id from job_recurrence where workspace_id = ? and previous_id = ?", ws, old);
        assertThat(dates(next)).containsExactly("2026-10-21", "2026-11-04", "2026-11-18");
        // The nightly extender reads the stored row back and must find the same rhythm.
        assertThat(seriesRow(next).getFirst()).isEqualTo("2026-10-21");
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aScheduleChangeFromAPastJobKeepsAnEveryOtherMonthRhythm() {
        String everyOther = "{\"frequency\":\"MONTHLY\",\"interval\":2,\"monthlyBy\":\"DAY_OF_MONTH\",\"dayOfMonth\":23,"
                + "\"endDate\":\"2027-06-30\"}";
        UUID old = series("2026-09-23", everyOther);
        assertThat(dates(old)).containsExactly("2026-09-23", "2026-11-23", "2027-01-23", "2027-03-23", "2027-05-23");
        clock.set(Instant.parse("2026-10-15T10:00:00Z"));
        given().contentType("application/json").body(schedule(UUID.randomUUID(), everyOther.replace("2027-06-30", "2027-03-31")))
                .put(base() + "/jobs/" + jobOn("2026-09-23") + "?scope=THIS_AND_FUTURE").then().statusCode(200);
        assertThat(dates(old)).containsExactly("2026-09-23");
        UUID next = (UUID) data.scalar("select id from job_recurrence where workspace_id = ? and previous_id = ?", ws, old);
        assertThat(dates(next)).containsExactly("2026-11-23", "2027-01-23", "2027-03-23");
    }

    // Review fix: a series ended by a schedule change is history; a second change aimed at one of its jobs (another
    // request) is refused instead of writing a third series over the second one's dates.
    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aScheduleChangeOnASeriesEndedByAnEarlierChangeIsRefused() {
        UUID old = series("2026-09-23", EIGHT_WEDNESDAYS);
        String mondays = "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"MONDAY\"],\"endDate\":\"2026-11-30\"}";
        String oct7 = jobOn("2026-10-07");
        given().contentType("application/json").body(schedule(UUID.randomUUID(), mondays))
                .put(base() + "/jobs/" + jobOn("2026-10-14") + "?scope=THIS_AND_FUTURE").then().statusCode(200);
        long jobsAfterFirst = data.count("select count(*) from job where workspace_id = ?", ws);
        assertThat(seriesRow(old).get(2)).isEqualTo(true);

        String fridays = mondays.replace("MONDAY", "FRIDAY");
        given().contentType("application/json").body(schedule(UUID.randomUUID(), fridays))
                .put(base() + "/jobs/" + oct7 + "?scope=THIS_AND_FUTURE").then().statusCode(409).body("code", is("CONFLICT"));
        assertThat(data.count("select count(*) from job where workspace_id = ?", ws)).isEqualTo(jobsAfterFirst);
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ?", ws)).isEqualTo(2);
        assertThat(seriesRow(old).get(2)).isEqualTo(true);
        // Positive control: the same change aimed at the current series goes through.
        given().contentType("application/json").body(schedule(UUID.randomUUID(), fridays))
                .put(base() + "/jobs/" + jobOn("2026-10-19") + "?scope=THIS_AND_FUTURE").then().statusCode(200);
    }

    // Review fix: "All jobs in the series" reaches back across schedule changes (previous_id), and from an earlier
    // part forward too; removing all stops every part.
    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void allReachesEveryPartOfASeriesSplitByAScheduleChange() {
        UUID old = series("2026-09-23", EIGHT_WEDNESDAYS);
        String mondays = "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"MONDAY\"],\"endDate\":\"2026-11-02\"}";
        given().contentType("application/json").body(schedule(UUID.randomUUID(), mondays))
                .put(base() + "/jobs/" + jobOn("2026-10-14") + "?scope=THIS_AND_FUTURE").then().statusCode(200);
        UUID next = (UUID) data.scalar("select id from job_recurrence where workspace_id = ? and previous_id = ?", ws, old);
        assertThat(dates(old)).containsExactly("2026-09-23", "2026-09-30", "2026-10-07");
        assertThat(dates(next)).containsExactly("2026-10-19", "2026-10-26", "2026-11-02");

        given().get(base() + "/jobs/" + jobOn("2026-10-26") + "/scope-counts").then().statusCode(200)
                .body("thisAndFuture.jobs", is(2)).body("all.jobs", is(6));
        given().get(base() + "/jobs/" + jobOn("2026-09-30") + "/scope-counts").then().statusCode(200)
                .body("all.jobs", is(6));
        given().contentType("application/json").body("{\"hours\":5}")
                .put(base() + "/jobs/" + jobOn("2026-10-26") + "?scope=ALL").then().statusCode(200);
        assertThat(dates(old, 5)).hasSize(3);
        assertThat(dates(next, 5)).hasSize(3);
        // The template is the current part's: the old part is history.
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ? and id = ? and hours = 5", ws, next)).isEqualTo(1);
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ? and id = ? and hours = 5", ws, old)).isZero();

        given().delete(base() + "/jobs/" + jobOn("2026-09-30") + "?scope=ALL").then().statusCode(204);
        assertThat(dates(old)).isEmpty();
        assertThat(dates(next)).isEmpty();
        assertThat(data.count("select count(*) from job_recurrence where workspace_id = ? and stopped", ws)).isEqualTo(2);
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void removingAllTakesPastAndFutureJobsKeepsClosedMonthsAndStopsTheSeries() {
        UUID removed = series("2026-09-23", OPEN_WEDNESDAYS);
        UUID control = series("2026-09-24", "{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"THURSDAY\"]}");
        clock.set(Instant.parse("2026-10-15T10:00:00Z"));
        given().put(base() + "/months/2026-11/lock").then().statusCode(200);
        given().delete(base() + "/jobs/" + jobOn("2026-10-21") + "?scope=ALL").then().statusCode(204);
        assertThat(dates(removed)).containsExactly("2026-11-04", "2026-11-11", "2026-11-18", "2026-11-25");
        assertThat(seriesRow(removed).subList(2, 5)).containsExactly(true, 4, "2026-11-25");

        long controlJobs = dates(control).size();
        clock.set(Instant.parse("2026-12-15T10:00:00Z"));
        extender.run();
        assertThat(dates(removed)).hasSize(4);
        // Positive control: the other open series of the same member is topped up.
        assertThat(dates(control).size()).isGreaterThan((int) controlJobs);
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aRangeChangeOnAnOpenSeriesBecomesTheValuesTheExtenderPlansWith() {
        UUID series = series("2026-09-23", OPEN_WEDNESDAYS);
        given().contentType("application/json").body("{\"hours\":5,\"startTime\":\"10:00\"}")
                .put(base() + "/jobs/" + jobOn("2026-10-07") + "?scope=THIS_AND_FUTURE").then().statusCode(200);
        clock.set(Instant.parse("2026-11-23T12:00:00Z"));
        extender.run();
        // New horizon 2027-11-23: eight more Wednesdays from 2027-09-29, all with the new values.
        assertThat(data.count("select count(*) from job j join hour_entry e on e.workspace_id = j.workspace_id and e.id = j.entry_id "
                + "where j.workspace_id = ? and j.recurrence_id = ? and e.work_date > date '2027-09-22' and j.hours = 5 "
                + "and j.start_time = time '10:00'", ws, series)).isEqualTo(8);
        assertThat(dates(series, 3)).containsExactly("2026-09-23", "2026-09-30");
    }
}
