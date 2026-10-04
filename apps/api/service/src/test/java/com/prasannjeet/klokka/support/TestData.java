package com.prasannjeet.klokka.support;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;

// Seeds rows straight into the Dev Services database. Every test scopes its assertions to ids it made here.
public final class TestData {

    private final DataSource dataSource;

    public TestData(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public void user(String id, String email, String name) {
        run("insert into app_user (logto_user_id, email, display_name) values (?, ?, ?) on conflict (logto_user_id) do update set email = excluded.email, display_name = excluded.display_name",
                id, email, name);
        run("insert into user_preference (logto_user_id) values (?) on conflict do nothing", id);
    }

    public void preferences(String id, String language, boolean push, boolean digest) {
        run("update user_preference set language = ?, push_enabled = ?, digest_enabled = ? where logto_user_id = ?", language, push, digest, id);
    }

    public UUID workspace(String name, String slug, boolean showPay, String rounding, String timezone) {
        UUID id = UUID.randomUUID();
        run("insert into workspace (id, name, slug, logto_org_id, currency, timezone, week_start, show_pay, rounding, default_day_hours, colour, emoji) "
                + "values (?, ?, ?, ?, 'SEK', ?, 'MONDAY', ?, ?, 8, 'PRIMARY', '☕')", id, name, slug, "org_" + slug, timezone, showPay, rounding);
        return id;
    }

    public UUID member(UUID workspace, String userId, String role, String name, String email, BigDecimal rate, String status) {
        UUID id = UUID.randomUUID();
        run("insert into membership (id, workspace_id, logto_user_id, role, display_name, email, hourly_rate, status, joined_at) "
                + "values (?, ?, ?, ?, ?, ?, ?, ?, case when ? = 'INVITED' then null else now() end)",
                id, workspace, userId, role, name, email, rate, status, status);
        return id;
    }

    public UUID invited(UUID workspace, String name, String email, String token, Instant sentAt, Instant expiresAt, String logtoInvitationId) {
        UUID id = UUID.randomUUID();
        run("insert into membership (id, workspace_id, role, display_name, email, status, invitation_token, invitation_sent_at, "
                + "invitation_expires_at, logto_invitation_id, invited_at) values (?, ?, 'EMPLOYEE', ?, ?, 'INVITED', ?, ?, ?, ?, ?)",
                id, workspace, name, email, token, sentAt, expiresAt, logtoInvitationId, sentAt);
        return id;
    }

    public UUID entry(UUID workspace, UUID membership, LocalDate date, BigDecimal hours, String note, String by) {
        UUID id = UUID.randomUUID();
        run("insert into hour_entry (id, workspace_id, membership_id, work_date, hours, note, created_by, updated_by) values (?, ?, ?, ?, ?, ?, ?, ?)",
                id, workspace, membership, date, hours, note, by, by);
        run("insert into hour_entry_change (id, workspace_id, entry_id, kind, hours_after, note_after, changed_by) values (?, ?, ?, 'CREATED', ?, ?, ?)",
                UUID.randomUUID(), workspace, id, hours, note, by);
        // Every live day has its jobs since CHQ-156; a seeded day is one job, as the V3 migration made them.
        run("insert into job (id, workspace_id, entry_id, position, hours, note, created_by, updated_by) values (?, ?, ?, 0, ?, ?, ?, ?)",
                UUID.randomUUID(), workspace, id, hours, note, by, by);
        return id;
    }

    public void pushToken(String userId, String token) {
        run("insert into push_token (provider, token, logto_user_id, platform) values ('EXPO', ?, ?, 'ANDROID') on conflict (provider, token) "
                + "do update set logto_user_id = excluded.logto_user_id, disabled_at = null", token, userId);
    }

    public List<List<Object>> query(String sql, Object... params) {
        List<List<Object>> rows = new ArrayList<>();
        try (Connection c = dataSource.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            bind(ps, params);
            try (ResultSet rs = ps.executeQuery()) {
                int n = rs.getMetaData().getColumnCount();
                while (rs.next()) {
                    List<Object> row = new ArrayList<>();
                    for (int i = 1; i <= n; i++) row.add(normalize(rs.getObject(i)));
                    rows.add(row);
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException(e);
        }
        return rows;
    }

    public Object scalar(String sql, Object... params) {
        List<List<Object>> rows = query(sql, params);
        return rows.isEmpty() ? null : rows.get(0).get(0);
    }

    public long count(String sql, Object... params) {
        return ((Number) scalar(sql, params)).longValue();
    }

    public void run(String sql, Object... params) {
        try (Connection c = dataSource.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            bind(ps, params);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException(e);
        }
    }

    // Timestamps come back as Instant so tests compare against the Clock directly.
    private static Object normalize(Object value) {
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant();
        if (value instanceof java.sql.Date d) return d.toLocalDate();
        return value;
    }

    private static void bind(PreparedStatement ps, Object... params) throws SQLException {
        for (int i = 0; i < params.length; i++) {
            Object p = params[i];
            if (p instanceof Instant instant) ps.setObject(i + 1, instant.atOffset(java.time.ZoneOffset.UTC));
            else ps.setObject(i + 1, p);
        }
    }
}
