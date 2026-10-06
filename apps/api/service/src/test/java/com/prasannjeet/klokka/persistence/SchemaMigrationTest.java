package com.prasannjeet.klokka.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
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
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("5");
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
        assertThat(seriesColumns).contains("request_hash", "request_payload");
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
