package com.prasannjeet.klokka.operator;

import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

// Aggregates across every workspace for the operator console (CHQ-141). Cross-workspace by definition, so this
// package is exempt from the WorkspaceId rule; it returns counts, dates and names, never hours per person.
@ApplicationScoped
public class OperatorRepository implements PanacheRepositoryBase<WorkspaceEntity, UUID> {

    public record WorkspaceRow(UUID id, String name, String slug, String emoji, boolean showPay, Instant createdAt,
            long active, long invited, long deactivated, double monthHours, Instant lastActivity) {}

    public record UserRow(String id, String name, String email, String language, boolean pushRegistered, long employerOf,
            long employeeOf, Instant lastSeenAt, Instant createdAt) {}

    public record InvitationRow(UUID id, UUID workspaceId, String workspaceName, String email, String invitedBy,
            Instant sentAt, Instant expiresAt, String status, int resendCount, Instant joinedAt) {}

    private static final String WORKSPACE_SELECT = """
            select w.id, w.name, w.slug, w.emoji, w.show_pay, w.created_at,
                   (select count(*) from membership m where m.workspace_id = w.id and m.status = 'ACTIVE') as active,
                   (select count(*) from membership m where m.workspace_id = w.id and m.status = 'INVITED') as invited,
                   (select count(*) from membership m where m.workspace_id = w.id and m.status = 'DEACTIVATED') as deactivated,
                   (select coalesce(sum(e.hours), 0) from hour_entry e where e.workspace_id = w.id and e.deleted_at is null
                        and e.work_date between :from and :to) as month_hours,
                   (select max(e.updated_at) from hour_entry e where e.workspace_id = w.id) as last_activity
            from workspace w
            where (cast(:q as varchar) is null or lower(w.name) like cast(:q as varchar) or w.slug like cast(:q as varchar))
              and (cast(:pay as boolean) is null or w.show_pay = cast(:pay as boolean))
            """;

    @SuppressWarnings("unchecked")
    public List<WorkspaceRow> workspaces(String q, Boolean pay, LocalDate from, LocalDate to, String sort, int offset, int limit) {
        String order = switch (sort == null ? "-activity" : sort) {
            case "name" -> "w.name asc";
            case "-name" -> "w.name desc";
            case "members" -> "active + invited asc, w.name";
            case "-members" -> "active + invited desc, w.name";
            case "hours" -> "month_hours asc, w.name";
            case "-hours" -> "month_hours desc, w.name";
            case "created" -> "w.created_at asc";
            case "-created" -> "w.created_at desc";
            case "activity" -> "last_activity asc nulls first, w.name";
            default -> "last_activity desc nulls last, w.name";
        };
        Query query = em().createNativeQuery(WORKSPACE_SELECT + " order by " + order + " offset :o limit :l")
                .setParameter("q", like(q)).setParameter("pay", pay).setParameter("from", from).setParameter("to", to)
                .setParameter("o", offset).setParameter("l", limit);
        List<Object[]> rows = query.getResultList();
        return rows.stream().map(r -> new WorkspaceRow((UUID) r[0], (String) r[1], (String) r[2], (String) r[3], (Boolean) r[4],
                instant(r[5]), n(r[6]), n(r[7]), n(r[8]), ((Number) r[9]).doubleValue(), instant(r[10]))).toList();
    }

    public long countWorkspaces(String q, Boolean pay) {
        Object n = em().createNativeQuery("select count(*) from workspace w where (cast(:q as varchar) is null or lower(w.name) like cast(:q as varchar) or w.slug like cast(:q as varchar)) "
                        + "and (cast(:pay as boolean) is null or w.show_pay = cast(:pay as boolean))")
                .setParameter("q", like(q)).setParameter("pay", pay).getSingleResult();
        return n(n);
    }

    public long scalar(String sql, Object... namedPairs) {
        Query query = em().createNativeQuery(sql);
        for (int i = 0; i < namedPairs.length; i += 2) query.setParameter((String) namedPairs[i], namedPairs[i + 1]);
        Object result = query.getSingleResult();
        return result == null ? 0 : ((Number) result).longValue();
    }

    public double scalarDouble(String sql, Object... namedPairs) {
        Query query = em().createNativeQuery(sql);
        for (int i = 0; i < namedPairs.length; i += 2) query.setParameter((String) namedPairs[i], namedPairs[i + 1]);
        Object result = query.getSingleResult();
        return result == null ? 0 : ((Number) result).doubleValue();
    }

    // Rows as arrays even for a single selected column (Hibernate hands those back as bare scalars).
    @SuppressWarnings("unchecked")
    public List<Object[]> rows(String sql, Object... namedPairs) {
        Query query = em().createNativeQuery(sql);
        for (int i = 0; i < namedPairs.length; i += 2) query.setParameter((String) namedPairs[i], namedPairs[i + 1]);
        List<Object> raw = query.getResultList();
        return raw.stream().map(r -> r instanceof Object[] a ? a : new Object[] {r}).toList();
    }

    private static final String USER_SELECT = """
            select u.logto_user_id, u.display_name, u.email, coalesce(p.language, 'sv'),
                   exists (select 1 from push_token t where t.logto_user_id = u.logto_user_id and t.disabled_at is null),
                   (select count(*) from membership m where m.logto_user_id = u.logto_user_id and m.role = 'EMPLOYER'),
                   (select count(*) from membership m where m.logto_user_id = u.logto_user_id and m.role = 'EMPLOYEE'),
                   u.last_seen_at, u.created_at
            from app_user u left join user_preference p on p.logto_user_id = u.logto_user_id
            where (cast(:q as varchar) is null or lower(u.display_name) like cast(:q as varchar) or lower(coalesce(u.email, '')) like cast(:q as varchar))
              and (cast(:role as varchar) is null or exists (select 1 from membership m where m.logto_user_id = u.logto_user_id and m.role = cast(:role as varchar)))
            """;

    @SuppressWarnings("unchecked")
    public List<UserRow> users(String q, String role, int offset, int limit) {
        List<Object[]> rows = em().createNativeQuery(USER_SELECT + " order by u.created_at desc offset :o limit :l")
                .setParameter("q", like(q)).setParameter("role", role).setParameter("o", offset).setParameter("l", limit)
                .getResultList();
        return rows.stream().map(r -> new UserRow((String) r[0], (String) r[1], (String) r[2], (String) r[3], (Boolean) r[4],
                n(r[5]), n(r[6]), instant(r[7]), instant(r[8]))).toList();
    }

    public long countUsers(String q, String role) {
        return n(em().createNativeQuery("select count(*) from app_user u where (cast(:q as varchar) is null or lower(u.display_name) like cast(:q as varchar) "
                        + "or lower(coalesce(u.email, '')) like cast(:q as varchar)) and (cast(:role as varchar) is null or exists (select 1 from membership m "
                        + "where m.logto_user_id = u.logto_user_id and m.role = cast(:role as varchar)))")
                .setParameter("q", like(q)).setParameter("role", role).getSingleResult());
    }

    private static final String INVITATION_SELECT = """
            select m.id, m.workspace_id, w.name, m.email,
                   (select e.display_name from membership e where e.workspace_id = m.workspace_id and e.role = 'EMPLOYER' limit 1),
                   coalesce(m.invitation_sent_at, m.invited_at) as sent_at, m.invitation_expires_at,
                   case when m.status in ('ACTIVE', 'DEACTIVATED') then 'ACCEPTED'
                        when m.invitation_expires_at is not null and m.invitation_expires_at <= cast(:now as timestamptz) then 'EXPIRED'
                        else 'PENDING' end as status,
                   m.invitation_resend_count, m.joined_at
            from membership m join workspace w on w.id = m.workspace_id
            where m.role = 'EMPLOYEE' and m.invitation_sent_at is not null
            """;

    @SuppressWarnings("unchecked")
    public List<InvitationRow> invitations(String status, Instant from, Instant to, Instant now, int offset, int limit) {
        List<Object[]> rows = em().createNativeQuery("select * from (" + INVITATION_SELECT + ") i where (cast(:status as varchar) is null or i.status = cast(:status as varchar)) "
                        + "and (cast(:from as timestamptz) is null or (i.status = 'ACCEPTED' and i.joined_at >= cast(:from as timestamptz) and i.joined_at < cast(:to as timestamptz)) "
                        + "or (i.status <> 'ACCEPTED' and i.sent_at >= cast(:from as timestamptz))) "
                        + "order by i.sent_at desc offset :o limit :l")
                .setParameter("now", now).setParameter("status", status).setParameter("from", from).setParameter("to", to)
                .setParameter("o", offset).setParameter("l", limit)
                .getResultList();
        return rows.stream().map(r -> new InvitationRow((UUID) r[0], (UUID) r[1], (String) r[2], (String) r[3], (String) r[4],
                instant(r[5]), instant(r[6]), (String) r[7], ((Number) r[8]).intValue(), instant(r[9]))).toList();
    }

    public long countInvitations(String status, Instant from, Instant to, Instant now) {
        return n(em().createNativeQuery("select count(*) from (" + INVITATION_SELECT + ") i where (cast(:status as varchar) is null or i.status = cast(:status as varchar)) "
                        + "and (cast(:from as timestamptz) is null or (i.status = 'ACCEPTED' and i.joined_at >= cast(:from as timestamptz) and i.joined_at < cast(:to as timestamptz)) "
                        + "or (i.status <> 'ACCEPTED' and i.sent_at >= cast(:from as timestamptz)))")
                .setParameter("now", now).setParameter("status", status).setParameter("from", from).setParameter("to", to)
                .getSingleResult());
    }

    // An invitation is addressed by its membership id from the console, across workspaces.
    public Optional<MembershipEntity> findMembership(UUID membershipId) {
        return Optional.ofNullable(em().find(MembershipEntity.class, membershipId));
    }

    static String like(String q) {
        return q == null || q.isBlank() ? null : "%" + q.trim().toLowerCase() + "%";
    }

    static long n(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    static Instant instant(Object o) {
        if (o == null) return null;
        if (o instanceof Instant i) return i;
        if (o instanceof java.time.OffsetDateTime odt) return odt.toInstant();
        if (o instanceof java.sql.Timestamp ts) return ts.toInstant();
        throw new IllegalStateException("unexpected timestamp type " + o.getClass());
    }

    private EntityManager em() {
        return getEntityManager();
    }
}
