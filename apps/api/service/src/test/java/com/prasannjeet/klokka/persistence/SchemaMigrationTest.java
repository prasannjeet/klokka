package com.prasannjeet.klokka.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

// Flyway's baseline against a real Postgres 18 (Dev Services): the tables of the corrected data model exist,
// the isolation and idempotency constraints are there, and Hibernate's validate strategy accepted the mapping
// (the application would not have started otherwise).
@QuarkusTest
class SchemaMigrationTest {

    @Inject
    Flyway flyway;

    @Inject
    AgroalDataSource dataSource;

    @Test
    void theBaselineIsAppliedAndNothingIsPending() {
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("7");
        assertThat(flyway.info().pending()).isEmpty();
    }

    @Test
    void everyTableOfTheModelExists() throws SQLException {
        List<String> tables = query("select table_name from information_schema.tables "
                + "where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name");
        assertThat(tables).contains("app_user", "user_preference", "workspace", "membership", "hour_entry",
                "hour_entry_change", "job", "job_recurrence", "job_reminder", "entry_flag", "month_lock", "notification", "push_token", "push_delivery",
                "digest_run", "email_send", "webhook_event");
    }

    @Test
    void childTablesCarryCompositeWorkspaceForeignKeys() throws SQLException {
        List<String> entryConstraints = query("select pg_get_constraintdef(oid) from pg_constraint "
                + "where contype = 'f' and conrelid = 'hour_entry'::regclass");
        assertThat(entryConstraints)
                .contains("FOREIGN KEY (workspace_id, membership_id) REFERENCES membership(workspace_id, id)");
        List<String> seriesConstraints = query("select pg_get_constraintdef(oid) from pg_constraint "
                + "where contype = 'f' and conrelid = 'job'::regclass");
        assertThat(seriesConstraints).contains("FOREIGN KEY (workspace_id, recurrence_id) REFERENCES job_recurrence(workspace_id, id)");
        List<String> seriesColumns = query("select column_name from information_schema.columns "
                + "where table_name = 'job_recurrence' order by ordinal_position");
        assertThat(seriesColumns).contains("request_hash", "request_payload", "monthly_by", "day_of_month", "week_of_month",
                "month_weekday", "open_ended", "previous_id", "hours", "start_time", "note", "place_id", "place_name",
                "place_address", "latitude", "longitude");
        List<String> recurrenceConstraints = query("select pg_get_constraintdef(oid) from pg_constraint "
                + "where contype = 'f' and conrelid = 'job_recurrence'::regclass");
        assertThat(recurrenceConstraints)
                .contains("FOREIGN KEY (workspace_id, previous_id) REFERENCES job_recurrence(workspace_id, id)");
        List<String> flagConstraints = query("select pg_get_constraintdef(oid) from pg_constraint "
                + "where contype = 'f' and conrelid = 'entry_flag'::regclass");
        assertThat(flagConstraints)
                .contains("FOREIGN KEY (workspace_id, entry_id) REFERENCES hour_entry(workspace_id, id)")
                .contains("FOREIGN KEY (workspace_id, membership_id) REFERENCES membership(workspace_id, id)");
    }

    @Test
    void softDeletedEntriesLeaveTheDayFreeAgain() throws SQLException {
        List<String> index = query("select indexdef from pg_indexes where indexname = 'hour_entry_live_uk'");
        assertThat(index).hasSize(1);
        assertThat(index.get(0)).contains("UNIQUE").contains("(membership_id, work_date)").contains("deleted_at IS NULL");
    }

    @Test
    void monthLocksKeepHistoryWithOneActiveLock() throws SQLException {
        List<String> index = query("select indexdef from pg_indexes where indexname = 'month_lock_active_uk'");
        assertThat(index).hasSize(1);
        assertThat(index.get(0)).contains("UNIQUE").contains("unlocked_at IS NULL");
        List<String> columns = query("select column_name from information_schema.columns "
                + "where table_name = 'month_lock' order by ordinal_position");
        assertThat(columns).contains("locked_by", "locked_at", "unlocked_by", "unlocked_at");
    }

    @Test
    void pushTokensAreKeyedByProviderAndToken() throws SQLException {
        List<String> key = query("select pg_get_constraintdef(oid) from pg_constraint "
                + "where contype = 'p' and conrelid = 'push_token'::regclass");
        assertThat(key).containsExactly("PRIMARY KEY (provider, token)");
    }

    @Test
    void digestRunsAreUniquePerUserAndWeek() throws SQLException {
        List<String> key = query("select pg_get_constraintdef(oid) from pg_constraint "
                + "where contype = 'p' and conrelid = 'digest_run'::regclass");
        assertThat(key).containsExactly("PRIMARY KEY (logto_user_id, iso_week)");
    }

    @Test
    void jobUpdatesArePreferredAndJobChangedIsANotificationKind() throws SQLException {
        assertThat(query("select column_default from information_schema.columns "
                + "where table_name = 'user_preference' and column_name = 'job_updates'")).containsExactly("true");
        assertThat(query("select pg_get_constraintdef(oid) from pg_constraint "
                + "where conname = 'notification_kind_check' and conrelid = 'notification'::regclass"))
                .singleElement().asString().contains("'JOB_CHANGED'").contains("'JOB_REMINDER'");
    }

    // V6 on a database at V5: monthly series get their day of the month (31 for "last day", else the first date's day)
    // and take their template from the earliest live job; existing people get job updates on. Runs in a schema of its
    // own so the shared database stays at the current version.
    @Test
    void v6BackfillsMonthlyDaysTemplatesAndJobUpdatesOnAV5Database() throws SQLException {
        String schema = "v5_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        try {
            Flyway.configure().dataSource(dataSource).schemas(schema).createSchemas(true).locations("classpath:db/migration")
                    .target("5").load().migrate();
            UUID ws = UUID.randomUUID();
            UUID member = UUID.randomUUID();
            UUID lastDay = UUID.randomUUID();
            UUID plain = UUID.randomUUID();
            try (Connection c = dataSource.getConnection()) {
                run(c, "set search_path to " + schema);
                run(c, "insert into app_user (logto_user_id, display_name) values ('usr_v5', 'V5')");
                run(c, "insert into user_preference (logto_user_id) values ('usr_v5')");
                run(c, "insert into workspace (id, name, slug, logto_org_id, currency, timezone, emoji) values (?, 'V5', 'v5', 'org_v5', 'SEK', "
                        + "'Europe/Stockholm', 'x')", ws);
                run(c, "insert into membership (id, workspace_id, role, display_name, email, status) values (?, ?, 'EMPLOYEE', 'Maria', "
                        + "'maria@v5.example', 'ACTIVE')", member, ws);
                for (Object[] series : new Object[][] {{lastDay, "2026-01-31", true}, {plain, "2026-01-15", false}}) {
                    run(c, "insert into job_recurrence (id, workspace_id, request_id, membership_id, first_date, end_date, frequency, "
                            + "repeat_interval, last_day_of_month, occurrence_count, last_date, created_by) values (?, ?, ?, ?, ?::date, "
                            + "'2026-03-31', 'MONTHLY', 1, ?, 3, '2026-03-31', 'usr_v5')",
                            series[0], ws, UUID.randomUUID(), member, series[1], series[2]);
                }
                job(c, ws, member, lastDay, "2026-02-28", "5", "08:00", null, false);
                job(c, ws, member, lastDay, "2026-01-31", "4", "07:30", "First", false);
                // A removed day is not the template; the earliest live one is.
                job(c, ws, member, plain, "2026-01-15", "9", null, null, true);
                job(c, ws, member, plain, "2026-02-15", "6", null, "Live", false);
                run(c, "reset search_path");
            }
            Flyway.configure().dataSource(dataSource).schemas(schema).locations("classpath:db/migration").load().migrate();
            assertThat(query("select day_of_month || ' ' || monthly_by || ' ' || hours || ' ' || coalesce(start_time::text, '-') || ' ' "
                    + "|| coalesce(note, '-') || ' ' || open_ended from " + schema + ".job_recurrence where id = '" + lastDay + "'"))
                    .containsExactly("31 DAY_OF_MONTH 4.00 07:30:00 First false");
            assertThat(query("select day_of_month || ' ' || hours || ' ' || coalesce(start_time::text, '-') || ' ' || coalesce(note, '-') "
                    + "from " + schema + ".job_recurrence where id = '" + plain + "'"))
                    .containsExactly("15 6.00 - Live");
            assertThat(query("select job_updates::text from " + schema + ".user_preference where logto_user_id = 'usr_v5'"))
                    .containsExactly("true");
        } finally {
            try (Connection c = dataSource.getConnection()) {
                run(c, "drop schema if exists " + schema + " cascade");
            }
        }
    }

    // V7 on a database at V6 (CHQ-189): the digest is on for everyone, existing rows included, and new rows default to on.
    @Test
    void v7TurnsTheDigestOnForEveryoneOnAV6Database() throws SQLException {
        String schema = "v6_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        try {
            Flyway.configure().dataSource(dataSource).schemas(schema).createSchemas(true).locations("classpath:db/migration")
                    .target("6").load().migrate();
            try (Connection c = dataSource.getConnection()) {
                run(c, "set search_path to " + schema);
                run(c, "insert into app_user (logto_user_id, display_name) values ('usr_v6_off', 'Off'), ('usr_v6_on', 'On')");
                run(c, "insert into user_preference (logto_user_id, digest_enabled) values ('usr_v6_off', false), ('usr_v6_on', true)");
                run(c, "reset search_path");
            }
            Flyway.configure().dataSource(dataSource).schemas(schema).locations("classpath:db/migration").load().migrate();
            assertThat(query("select logto_user_id || ' ' || digest_enabled from " + schema + ".user_preference order by logto_user_id"))
                    .containsExactly("usr_v6_off true", "usr_v6_on true");
            assertThat(query("select column_default from information_schema.columns where table_schema = '" + schema
                    + "' and table_name = 'user_preference' and column_name = 'digest_enabled'")).containsExactly("true");
        } finally {
            try (Connection c = dataSource.getConnection()) {
                run(c, "drop schema if exists " + schema + " cascade");
            }
        }
    }

    private static void job(Connection c, UUID ws, UUID member, UUID series, String date, String hours, String start, String note,
            boolean deleted) throws SQLException {
        UUID entry = UUID.randomUUID();
        run(c, "insert into hour_entry (id, workspace_id, membership_id, work_date, hours, note, created_by, updated_by, deleted_at) "
                + "values (?, ?, ?, ?::date, ?::numeric, ?, 'usr_v5', 'usr_v5', " + (deleted ? "now()" : "null") + ")",
                entry, ws, member, date, hours, note);
        run(c, "insert into job (id, workspace_id, entry_id, position, hours, start_time, note, recurrence_id, created_by, updated_by) "
                + "values (?, ?, ?, 0, ?::numeric, ?::time, ?, ?, 'usr_v5', 'usr_v5')", UUID.randomUUID(), ws, entry, hours, start, note, series);
    }

    private static void run(Connection c, String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) ps.setObject(i + 1, params[i]);
            ps.execute();
        }
    }

    private List<String> query(String sql) throws SQLException {
        List<String> out = new ArrayList<>();
        try (Connection c = dataSource.getConnection();
                Statement s = c.createStatement();
                ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) out.add(rs.getString(1));
        }
        return out;
    }
}
