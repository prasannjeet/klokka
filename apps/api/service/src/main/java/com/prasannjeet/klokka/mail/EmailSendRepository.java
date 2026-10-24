package com.prasannjeet.klokka.mail;

import com.prasannjeet.klokka.persistence.AppUserEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

// The email ledger (email_send) and the digest bookkeeping. Counted over a rolling 24 hours for the daily quota,
// keyed by recipient and user rather than workspace, so this package is exempt from the WorkspaceId rule.
@ApplicationScoped
public class EmailSendRepository implements PanacheRepositoryBase<AppUserEntity, String> {

    public static final String KIND_INVITATION = "INVITATION";
    public static final String KIND_VERIFICATION = "VERIFICATION";
    public static final String KIND_DIGEST = "DIGEST";
    public static final String STATUS_SENT = "SENT";
    public static final String STATUS_FAILED = "FAILED";

    // Non-failed sends with sent_at in (from, to]: the rolling window the daily quota is counted over.
    public long countSentIn(Instant fromExclusive, Instant toInclusive) {
        Object n = em().createNativeQuery("select count(*) from email_send where sent_at > :f and sent_at <= :t and status <> 'FAILED'")
                .setParameter("f", fromExclusive).setParameter("t", toInclusive).getSingleResult();
        return ((Number) n).longValue();
    }

    public void record(String kind, String recipient, UUID workspaceId, UUID membershipId, String userId, String status, String error, Instant now) {
        em().createNativeQuery("insert into email_send (id, kind, recipient, workspace_id, membership_id, logto_user_id, status, error, sent_at) "
                        + "values (:id, :k, :r, :w, :m, :u, :s, :e, :now)")
                .setParameter("id", UUID.randomUUID())
                .setParameter("k", kind)
                .setParameter("r", recipient)
                .setParameter("w", workspaceId)
                .setParameter("m", membershipId)
                .setParameter("u", userId)
                .setParameter("s", status)
                .setParameter("e", error)
                .setParameter("now", now)
                .executeUpdate();
    }

    // One keyset page of the users with the digest on (CHQ-189: on by default), after `afterUserId` (null: from the
    // start), ordered by user id so a sweep can walk all of them page by page.
    @SuppressWarnings("unchecked")
    public List<String> digestOptIns(String afterUserId, int limit) {
        return em().createNativeQuery("select p.logto_user_id from user_preference p where p.digest_enabled "
                        + "and p.logto_user_id > :after order by p.logto_user_id limit :n", String.class)
                .setParameter("after", afterUserId == null ? "" : afterUserId)
                .setParameter("n", limit)
                .getResultList();
    }

    public boolean digestRunExists(String userId, String isoWeek) {
        Object n = em().createNativeQuery("select count(*) from digest_run where logto_user_id = :u and iso_week = :w")
                .setParameter("u", userId).setParameter("w", isoWeek).getSingleResult();
        return ((Number) n).longValue() > 0;
    }

    // True when this (user, week) was not yet recorded; the primary key makes the digest idempotent.
    public boolean recordDigestRun(String userId, String isoWeek, Instant now) {
        return em().createNativeQuery("insert into digest_run (logto_user_id, iso_week, sent_at) values (:u, :w, :now) on conflict do nothing")
                .setParameter("u", userId).setParameter("w", isoWeek).setParameter("now", now).executeUpdate() == 1;
    }

    private EntityManager em() {
        return getEntityManager();
    }
}
