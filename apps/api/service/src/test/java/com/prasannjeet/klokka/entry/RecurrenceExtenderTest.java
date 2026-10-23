package com.prasannjeet.klokka.entry;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.MutableClock;
import com.prasannjeet.klokka.support.TestData;
import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.persistence.JobRecurrenceRepository;
import com.prasannjeet.klokka.persistence.JobRecurrenceRepository.OpenSeries;
import io.agroal.api.AgroalDataSource;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// The nightly top-up of open-ended series (CHQ-186). The clock starts on Wednesday 2026-09-23, so a weekly series
// from that day is planned through 2027-09-23 (twelve months, the default horizon). Every assertion reads only this
// test's workspace; run() also tops up other tests' open series in the shared database, which is harmless.
@QuarkusTest
class RecurrenceExtenderTest {
    private static final String OWNER = "usr_extender_owner";
    private static final String EMPLOYEE = "usr_extender_employee";
    private static final String OTHER = "usr_extender_other";
    private static final String BOSS = "usr_extender_boss";

    @Inject
    AgroalDataSource dataSource;
    @Inject
    MutableClock clock;
    @Inject
    KlokkaConfig config;
    @Inject
    RecurrenceExtender extender;
    @Inject
    JobRecurrenceRepository recurrences;
    TestData data;
    UUID ws;
    UUID member;
    UUID other;

    @BeforeEach
    void setup() {
        Fake.reset();
        clock.reset();
        data = new TestData(dataSource);
        data.user(OWNER, "owner@extender.example", "Owner");
        data.user(EMPLOYEE, "employee@extender.example", "Employee");
        data.user(OTHER, "other@extender.example", "Other");
        ws = data.workspace("Extender", "extender-" + UUID.randomUUID(), false, "NONE", "Europe/Stockholm");
        data.member(ws, OWNER, "EMPLOYER", "Owner", "owner@extender.example", null, "ACTIVE");
        member = data.member(ws, EMPLOYEE, "EMPLOYEE", "Employee", "employee@extender.example", null, "ACTIVE");
        other = data.member(ws, OTHER, "EMPLOYEE", "Other", "other@extender.example", null, "ACTIVE");
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    // An open weekly series from today on one weekday; returns its id.
    UUID openSeries(UUID membershipId, String weekday) {
        String body = "{\"hours\":3,\"startTime\":\"09:00\",\"note\":\"Weekly clean\",\"requestId\":\"" + UUID.randomUUID()
                + "\",\"location\":{\"name\":\"Office\",\"latitude\":59.33,\"longitude\":18.06},"
                + "\"recurrence\":{\"frequency\":\"WEEKLY\",\"interval\":1,\"weekdays\":[\"" + weekday + "\"]}}";
        given().contentType("application/json").body(body)
                .post("/v1/workspaces/" + ws + "/members/" + membershipId + "/entries/2026-09-23/jobs")
                .then().statusCode(201);
        return (UUID) data.scalar("select id from job_recurrence where workspace_id = ? and membership_id = ? and open_ended",
                ws, membershipId);
    }

    long jobs(UUID series) {
        return data.count("select count(*) from job where workspace_id = ? and recurrence_id = ?", ws, series);
    }

    List<Object> seriesRow(UUID series) {
        return data.query("select end_date::text, occurrence_count, last_date::text from job_recurrence where workspace_id = ? and id = ?",
                ws, series).getFirst();
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void topsUpToTheNewHorizonOnceWithTheTemplateSkippingClosedMonthsAndNotifyingNobody() {
        UUID series = openSeries(member, "WEDNESDAY");
        // Wednesdays 2026-09-23 to 2027-09-22.
        assertThat(jobs(series)).isEqualTo(53);
        assertThat(seriesRow(series)).containsExactly("2027-09-23", 53, "2027-09-22");
        given().put("/v1/workspaces/" + ws + "/months/2027-10/lock").then().statusCode(200);
        data.run("delete from notification where workspace_id = ?", ws);

        clock.set(Instant.parse("2026-11-23T12:00:00Z"));
        extender.run();

        // New horizon 2027-11-23: Sep 29 and Nov 3, 10, 17 written; the four October Wednesdays are in a closed month.
        assertThat(jobs(series)).isEqualTo(57);
        assertThat(seriesRow(series)).containsExactly("2027-11-23", 57, "2027-11-17");
        assertThat(data.count("select count(*) from job j join hour_entry e on e.workspace_id = j.workspace_id and e.id = j.entry_id "
                + "where j.workspace_id = ? and j.recurrence_id = ? and e.work_date in (date '2027-09-29', date '2027-11-03', "
                + "date '2027-11-10', date '2027-11-17')", ws, series)).isEqualTo(4);
        assertThat(data.count("select count(*) from hour_entry where workspace_id = ? and work_date between date '2027-10-01' "
                + "and date '2027-10-31'", ws)).isZero();
        assertThat(data.count("select count(*) from job j join hour_entry e on e.workspace_id = j.workspace_id and e.id = j.entry_id "
                + "where j.workspace_id = ? and e.work_date = date '2027-11-17' and j.hours = 3 and j.start_time = time '09:00' "
                + "and j.note = 'Weekly clean' and j.place_name = 'Office' and j.latitude = 59.33 and j.created_by = ? "
                + "and e.hours = 3", ws, OWNER)).isEqualTo(1);
        assertThat(data.count("select count(*) from notification where workspace_id = ?", ws)).isZero();

        // A second run the same day has nothing left to add.
        extender.run();
        assertThat(jobs(series)).isEqualTo(57);
        assertThat(seriesRow(series)).containsExactly("2027-11-23", 57, "2027-11-17");
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void stoppedSeriesAndDeactivatedMembersAreLeftAlone() {
        UUID stopped = openSeries(member, "THURSDAY");
        UUID paused = openSeries(other, "FRIDAY");
        data.run("update job_recurrence set stopped = true where workspace_id = ? and id = ?", ws, stopped);
        data.run("update membership set status = 'DEACTIVATED' where workspace_id = ? and id = ?", ws, other);
        long stoppedJobs = jobs(stopped);
        long pausedJobs = jobs(paused);

        clock.set(Instant.parse("2026-10-23T12:00:00Z"));
        extender.run();
        assertThat(jobs(stopped)).isEqualTo(stoppedJobs);
        assertThat(seriesRow(stopped).getFirst()).isEqualTo("2027-09-23");
        assertThat(jobs(paused)).isEqualTo(pausedJobs);
        assertThat(seriesRow(paused).getFirst()).isEqualTo("2027-09-23");

        // Positive control: once reactivated, the same series is topped up (Fridays 2027-09-24 to 2027-10-22).
        data.run("update membership set status = 'ACTIVE' where workspace_id = ? and id = ?", ws, other);
        extender.run();
        assertThat(jobs(paused)).isEqualTo(pausedJobs + 5);
        assertThat(seriesRow(paused).getFirst()).isEqualTo("2027-10-23");
        assertThat(jobs(stopped)).isEqualTo(stoppedJobs);
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aFullDayIsSkippedAndTheRestOfTheRangeIsStillPlanned() {
        UUID series = openSeries(member, "WEDNESDAY");
        // Wednesday 2027-09-29 already holds 24 hours; Wednesday 2027-10-06 holds the per-day job cap of 1-hour jobs.
        String day = "/v1/workspaces/" + ws + "/members/" + member + "/entries/";
        given().contentType("application/json").body("{\"hours\":24}").post(day + "2027-09-29/jobs").then().statusCode(201);
        for (int i = 0; i < config.entries().jobsPerDayMax(); i++) {
            given().contentType("application/json").body("{\"hours\":1}").post(day + "2027-10-06/jobs").then().statusCode(201);
        }

        clock.set(Instant.parse("2026-10-23T12:00:00Z"));
        extender.run();

        // New horizon 2027-10-23: Oct 13 and 20 written, Sep 29 and Oct 6 skipped, and the series still moves on.
        assertThat(jobs(series)).isEqualTo(55);
        assertThat(seriesRow(series)).containsExactly("2027-10-23", 55, "2027-10-20");
        assertThat(data.count("select count(*) from job j join hour_entry e on e.workspace_id = j.workspace_id and e.id = j.entry_id "
                + "where j.workspace_id = ? and j.recurrence_id = ? and e.work_date in (date '2027-10-13', date '2027-10-20')",
                ws, series)).isEqualTo(2);
        assertThat(data.count("select count(*) from hour_entry where workspace_id = ? and work_date = date '2027-09-29' "
                + "and hours = 24 and deleted_at is null", ws)).isEqualTo(1);
        assertThat(data.count("select count(*) from job j join hour_entry e on e.workspace_id = j.workspace_id and e.id = j.entry_id "
                + "where j.workspace_id = ? and e.work_date = date '2027-10-06'", ws)).isEqualTo(config.entries().jobsPerDayMax());
    }

    @Test
    @TestSecurity(user = OWNER)
    @OidcSecurity(claims = @Claim(key = "sub", value = OWNER))
    void aWorkspaceWithoutAnActiveEmployerIsNotSelected() {
        UUID series = openSeries(member, "WEDNESDAY");
        data.run("update membership set status = 'DEACTIVATED' where workspace_id = ? and logto_user_id = ?", ws, OWNER);
        clock.set(Instant.parse("2026-10-23T12:00:00Z"));
        assertThat(selected(series)).isFalse();
        extender.run();
        assertThat(seriesRow(series).getFirst()).isEqualTo("2027-09-23");

        // Positive control: another active employer makes the series eligible, and the jobs are written as them.
        data.user(BOSS, "boss@extender.example", "Boss");
        data.member(ws, BOSS, "EMPLOYER", "Boss", "boss@extender.example", null, "ACTIVE");
        assertThat(selected(series)).isTrue();
        extender.run();
        assertThat(seriesRow(series)).containsExactly("2027-10-23", 57, "2027-10-20");
        assertThat(data.count("select count(*) from job where workspace_id = ? and recurrence_id = ? and created_by = ?",
                ws, series, BOSS)).isEqualTo(4);
    }

    boolean selected(UUID series) {
        LocalDate bound = LocalDate.of(2027, 10, 24);
        return QuarkusTransaction.requiringNew().call(() -> recurrences.openSeriesBefore(bound, 10_000))
                .stream().map(OpenSeries::id).anyMatch(series::equals);
    }
}
