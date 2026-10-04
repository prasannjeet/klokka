package com.prasannjeet.klokka.notification;

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
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// CHQ-156: job reminders (lead time per person, once per job and start, never late), a flag decline told only when
// the workspace says so, and analysis hidden from employees when the employer turns it off.
@QuarkusTest
class JobReminderAndSettingsTest {

    private static final String NORA = "usr_rem_nora";
    private static final String MARIA = "usr_rem_maria";

    @Inject
    AgroalDataSource dataSource;

    @Inject
    MutableClock clock;

    @Inject
    JobReminderJob job;

    TestData data;
    UUID ws;
    UUID maria;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        clock.reset();
        data.user(NORA, "nora@rem.example", "Nora Lind");
        data.user(MARIA, "maria@rem.example", "Maria Lind");
        data.preferences(MARIA, "en", true, false);
        // The preference row outlives a test on the shared database; every test starts from the defaults.
        data.run("update user_preference set job_reminders = true, job_reminder_lead = 'HOUR_1' where logto_user_id = ?", MARIA);
        ws = data.workspace("Reminders AB", "rem-" + UUID.randomUUID().toString().substring(0, 8), false, "NONE", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@rem.example", null, "ACTIVE");
        maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@rem.example", null, "ACTIVE");
    }

    @AfterEach
    void tearDown() {
        clock.reset();
    }

    // A job on 2026-09-24 at 09:00 Stockholm (07:00Z), 4.5 h at Café Nord.
    private UUID seedJob() {
        UUID entry = data.entry(ws, maria, LocalDate.parse("2026-09-24"), new BigDecimal("4.5"), null, NORA);
        data.run("update job set start_time = '09:00', place_name = 'Café Nord', place_address = 'Kungsgatan 12', latitude = 59.3, "
                + "longitude = 18.0 where entry_id = ?", entry);
        return entry;
    }

    private long reminders() {
        return data.count("select count(*) from notification where logto_user_id = ? and kind = 'JOB_REMINDER'", MARIA);
    }

    @Test
    void theReminderGoesOutOnceAtTheLeadTimeAndNeverLate() {
        seedJob();
        clock.set(Instant.parse("2026-09-24T05:58:00Z"));
        job.sweep();
        assertThat(reminders()).as("before the hour-before mark").isZero();

        clock.set(Instant.parse("2026-09-24T06:01:00Z"));
        assertThat(job.sweep()).isEqualTo(1);
        job.sweep();
        assertThat(reminders()).as("a second sweep sends nothing").isEqualTo(1);
        List<List<Object>> payload = data.query("select payload->>'placeName', payload->>'startTime', payload->>'lead' from notification "
                + "where logto_user_id = ? and kind = 'JOB_REMINDER'", MARIA);
        assertThat(payload.get(0)).containsExactly("Café Nord", "09:00", "HOUR_1");
    }

    @Test
    void aReminderPastItsGraceOrSwitchedOffIsNotSent() {
        seedJob();
        // 30 minutes after the 06:00Z mark: more than the 10 minute grace.
        clock.set(Instant.parse("2026-09-24T06:30:00Z"));
        assertThat(job.sweep()).isZero();

        data.run("update user_preference set job_reminder_lead = 'MINUTES_15' where logto_user_id = ?", MARIA);
        data.run("update user_preference set job_reminders = false where logto_user_id = ?", MARIA);
        clock.set(Instant.parse("2026-09-24T06:46:00Z"));
        assertThat(job.sweep()).as("switched off").isZero();
        // Positive control: the same moment with reminders on sends the 15 minute reminder.
        data.run("update user_preference set job_reminders = true where logto_user_id = ?", MARIA);
        assertThat(job.sweep()).isEqualTo(1);
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void theReminderReadsWellAndThePreferenceIsTheEmployees() {
        seedJob();
        clock.set(Instant.parse("2026-09-24T06:01:00Z"));
        assertThat(job.sweep()).isEqualTo(1);
        given().when().get("/v1/notifications?workspaceId=" + ws).then().statusCode(200)
                .body("items[0].kind", is("JOB_REMINDER")).body("items[0].title", is("Job at Café Nord in 1 hour"))
                .body("items[0].body", is("Reminders AB: starts 09:00, 4.5 h. Kungsgatan 12"))
                .body("items[0].link.date", is("2026-09-24"));
        given().contentType("application/json").body("{\"jobReminderLead\":\"DAY_BEFORE\",\"jobReminders\":false}")
                .when().patch("/v1/me/preferences").then().statusCode(200)
                .body("jobReminders", is(false)).body("jobReminderLead", is("DAY_BEFORE"));
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void aDeclineIsToldOnlyWhenTheWorkspaceSaysSo() {
        UUID entry = data.entry(ws, maria, LocalDate.parse("2026-09-22"), new BigDecimal("6"), null, NORA);
        given().contentType("application/json").body("{\"notifyFlagDeclined\":false,\"employeesSeeInsights\":false}")
                .when().patch("/v1/workspaces/" + ws).then().statusCode(200)
                .body("notifyFlagDeclined", is(false)).body("employeesSeeInsights", is(false));
        UUID first = flag(entry);
        given().contentType("application/json").body("{\"action\":\"DISMISS\"}").when().post("/v1/workspaces/" + ws + "/flags/" + first + "/resolve")
                .then().statusCode(200);
        assertThat(resolvedNotifications()).as("a quiet decline").isZero();
        // Positive control: an approval is always told.
        UUID second = flag(entry);
        given().contentType("application/json").body("{\"action\":\"FIX\",\"hours\":7}").when().post("/v1/workspaces/" + ws + "/flags/" + second + "/resolve")
                .then().statusCode(200);
        assertThat(resolvedNotifications()).isEqualTo(1);
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void anEmployeeLosesInsightsWhenTheEmployerTurnsThemOff() {
        given().when().get("/v1/workspaces/" + ws + "/members/" + maria + "/insights").then().statusCode(200);
        data.run("update workspace set employees_see_insights = false where id = ?", ws);
        given().when().get("/v1/workspaces/" + ws + "/members/" + maria + "/insights").then().statusCode(403);
        given().when().get("/v1/me").then().statusCode(200)
                .body("workspaces.find { it.workspaceId == '" + ws + "' }.employeesSeeInsights", is(false));
    }

    private UUID flag(UUID entry) {
        UUID id = UUID.randomUUID();
        data.run("insert into entry_flag (id, workspace_id, entry_id, membership_id, raised_by, reason, message, logged_hours) "
                + "values (?, ?, ?, ?, ?, 'MORE', 'I stayed', 6)", id, ws, entry, maria, MARIA);
        return id;
    }

    private long resolvedNotifications() {
        return data.count("select count(*) from notification where logto_user_id = ? and kind = 'FLAG_RESOLVED'", MARIA);
    }
}
