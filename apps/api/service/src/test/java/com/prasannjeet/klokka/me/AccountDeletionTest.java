package com.prasannjeet.klokka.me;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.FakeServers;
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
import org.junit.jupiter.api.Test;

// DELETE /me (CHQ-157) against the real schema. Rows are scoped to this class's own user ids (usr_del_*) and to
// workspaces with a fresh slug per run, so the shared Dev Services database never sees a collision.
@QuarkusTest
class AccountDeletionTest {

    private static final BigDecimal EIGHT = new BigDecimal("8.00");

    @Inject
    AgroalDataSource dataSource;

    private TestData data() {
        return new TestData(dataSource);
    }

    private static String slug(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    @TestSecurity(user = "usr_del_emp")
    @OidcSecurity(claims = {@Claim(key = "sub", value = "usr_del_emp")})
    void anEmployeeLeavesTheirHoursWithTheEmployerAndEverythingElseGoes() {
        Fake.reset();
        TestData d = data();
        d.user("usr_del_emp", "emp@del.example", "Emil");
        d.user("usr_del_boss", "boss@del.example", "Bodil");
        d.pushToken("usr_del_emp", "ExponentPushToken[del-emp]");
        UUID worked = d.workspace("Worked", slug("del-worked"), true, "NONE", "Europe/Stockholm");
        UUID boss = d.member(worked, "usr_del_boss", "EMPLOYER", "Bodil", "boss@del.example", null, "ACTIVE");
        UUID withHours = d.member(worked, "usr_del_emp", "EMPLOYEE", "Emil", "emp@del.example", new BigDecimal("150.00"), "ACTIVE");
        d.entry(worked, withHours, LocalDate.of(2026, 9, 1), EIGHT, null, "usr_del_boss");
        UUID idle = d.workspace("Idle", slug("del-idle"), false, "NONE", "Europe/Stockholm");
        d.member(idle, "usr_del_boss", "EMPLOYER", "Bodil", "boss@del.example", null, "ACTIVE");
        UUID noHours = d.member(idle, "usr_del_emp", "EMPLOYEE", "Emil", "emp@del.example", null, "ACTIVE");
        d.run("insert into notification (id, logto_user_id, workspace_id, kind, payload) values (?, 'usr_del_emp', ?, 'HOURS_CHANGED', '{}'::jsonb)",
                UUID.randomUUID(), worked);
        d.run("insert into email_send (id, kind, recipient, status, logto_user_id) values (?, 'OTHER', 'emp@del.example', 'SENT', 'usr_del_emp')",
                UUID.randomUUID());

        given().when().delete("/v1/me").then().statusCode(204);

        assertThat(d.count("select count(*) from membership where id = ? and status = 'DEACTIVATED' and logto_user_id is null "
                + "and email = ? and avatar_emoji is null and display_name = 'Emil' and hourly_rate = 150", withHours, withHours + "@deleted.invalid"))
                .isEqualTo(1);
        assertThat(d.count("select count(*) from hour_entry where membership_id = ?", withHours)).isEqualTo(1);
        assertThat(d.count("select count(*) from membership where id = ?", noHours)).isZero();
        assertThat(d.count("select count(*) from app_user where logto_user_id = 'usr_del_emp'")).isZero();
        assertThat(d.count("select count(*) from user_preference where logto_user_id = 'usr_del_emp'")).isZero();
        assertThat(d.count("select count(*) from push_token where logto_user_id = 'usr_del_emp'")).isZero();
        assertThat(d.count("select count(*) from notification where logto_user_id = 'usr_del_emp'")).isZero();
        assertThat(d.count("select count(*) from email_send where logto_user_id = 'usr_del_emp' and recipient = 'deleted@deleted.invalid'"))
                .isEqualTo(1);
        assertThat(Fake.<String>list("deletedUsers")).containsExactly("usr_del_emp");
        assertThat(Fake.<String>list("deletedOrganizations")).isEmpty();
        // Positive control: the employer and both workspaces are untouched.
        assertThat(d.count("select count(*) from membership where id = ? and status = 'ACTIVE'", boss)).isEqualTo(1);
        assertThat(d.count("select count(*) from workspace where id in (?, ?)", worked, idle)).isEqualTo(2);
        assertThat(d.count("select count(*) from app_user where logto_user_id = 'usr_del_boss'")).isEqualTo(1);

        // Safe to repeat: nothing left to change, still 204.
        given().when().delete("/v1/me").then().statusCode(204);
        assertThat(d.count("select count(*) from membership where id = ? and status = 'DEACTIVATED'", withHours)).isEqualTo(1);
    }

    @Test
    @TestSecurity(user = "usr_del_owner")
    @OidcSecurity(claims = {@Claim(key = "sub", value = "usr_del_owner")})
    void anEmployerTakesTheirWorkspaceWithEveryChildRow() {
        Fake.reset();
        TestData d = data();
        d.user("usr_del_owner", "owner@del.example", "Olle");
        d.user("usr_del_staff", "staff@del.example", "Sara");
        String slug = slug("del-owned");
        UUID ws = d.workspace("Owned", slug, true, "NONE", "Europe/Stockholm");
        d.member(ws, "usr_del_owner", "EMPLOYER", "Olle", "owner@del.example", null, "ACTIVE");
        UUID staff = d.member(ws, "usr_del_staff", "EMPLOYEE", "Sara", "staff@del.example", EIGHT, "ACTIVE");
        UUID entry = d.entry(ws, staff, LocalDate.of(2026, 9, 2), EIGHT, "close", "usr_del_owner");
        UUID job = (UUID) d.scalar("select id from job where entry_id = ?", entry);
        d.run("insert into job_reminder (workspace_id, job_id, starts_at) values (?, ?, now())", ws, job);
        d.run("insert into entry_flag (id, workspace_id, entry_id, membership_id, raised_by, reason, message, logged_hours) "
                + "values (?, ?, ?, ?, 'usr_del_staff', 'MORE', 'one more hour', 8)", UUID.randomUUID(), ws, entry, staff);
        d.run("insert into month_lock (id, workspace_id, year_month, locked_by) values (?, ?, date '2026-08-01', 'usr_del_owner')",
                UUID.randomUUID(), ws);
        d.run("insert into notification (id, logto_user_id, workspace_id, kind, payload) values (?, 'usr_del_staff', ?, 'HOURS_CHANGED', '{}'::jsonb)",
                UUID.randomUUID(), ws);
        UUID mail = UUID.randomUUID();
        d.run("insert into email_send (id, kind, recipient, workspace_id, status) values (?, 'INVITATION', 'staff@del.example', ?, 'SENT')",
                mail, ws);

        given().when().delete("/v1/me").then().statusCode(204);

        for (String table : List.of("job_reminder", "job", "entry_flag", "hour_entry_change", "hour_entry", "month_lock",
                "notification", "membership")) {
            assertThat(d.count("select count(*) from " + table + " where workspace_id = ?", ws)).as(table).isZero();
        }
        assertThat(d.count("select count(*) from workspace where id = ?", ws)).isZero();
        assertThat(d.count("select count(*) from email_send where id = ? and workspace_id is null", mail)).isEqualTo(1);
        assertThat(d.count("select count(*) from app_user where logto_user_id = 'usr_del_owner'")).isZero();
        assertThat(Fake.<String>list("deletedOrganizations")).containsExactly("org_" + slug);
        assertThat(Fake.<String>list("deletedUsers")).containsExactly("usr_del_owner");
        // The employee keeps their own account.
        assertThat(d.count("select count(*) from app_user where logto_user_id = 'usr_del_staff'")).isEqualTo(1);
    }

    @Test
    @TestSecurity(user = "usr_del_stuck")
    @OidcSecurity(claims = {@Claim(key = "sub", value = "usr_del_stuck")})
    void aLogtoFailureOnTheOrganizationLeavesTheDatabaseAsItWas() {
        Fake.reset();
        TestData d = data();
        d.user("usr_del_stuck", "stuck@del.example", "Stina");
        UUID ws = d.workspace("Stuck", slug(FakeServers.FAIL_ORG_DELETE_MARKER), false, "NONE", "Europe/Stockholm");
        d.member(ws, "usr_del_stuck", "EMPLOYER", "Stina", "stuck@del.example", null, "ACTIVE");

        given().when().delete("/v1/me").then().statusCode(500);

        assertThat(d.count("select count(*) from workspace where id = ?", ws)).isEqualTo(1);
        assertThat(d.count("select count(*) from app_user where logto_user_id = 'usr_del_stuck'")).isEqualTo(1);
        assertThat(Fake.<String>list("deletedUsers")).isEmpty();
        d.run("delete from membership where workspace_id = ?", ws);
        d.run("delete from workspace where id = ?", ws);
    }

    @Test
    @TestSecurity(user = "usr_del_gone")
    @OidcSecurity(claims = {@Claim(key = "sub", value = "usr_del_gone")})
    void aLogtoUserThatIsAlreadyGoneCountsAsDeleted() {
        Fake.reset();
        data().user("usr_del_gone", "gone@del.example", "Gun");

        given().when().delete("/v1/me").then().statusCode(204);

        assertThat(data().count("select count(*) from app_user where logto_user_id = 'usr_del_gone'")).isZero();
    }
}
