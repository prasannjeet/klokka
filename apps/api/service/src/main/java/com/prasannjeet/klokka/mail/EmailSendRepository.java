package com.prasannjeet.klokka.mail;

import com.prasannjeet.klokka.persistence.AppUserEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

// The email ledger (email_send) and the digest bookkeeping. Counted per calendar month for the quota, keyed by
// recipient and user rather than workspace, so this package is exempt from the WorkspaceId rule.
@ApplicationScoped
public class EmailSendRepository implements PanacheRepositoryBase<AppUserEntity, String> {

    public static final String KIND_INVITATION = "INVITATION";
    public static final String KIND_VERIFICATION = "VERIFICATION";
    public static final String KIND_DIGEST = "DIGEST";
    public static final String STATUS_SENT = "SENT";
    public static final String STATUS_FAILED = "FAILED";

    public long countSentBetween(Instant from, Instant to) {
        Object n = em().createNativeQuery("select count(*) from email_send where sent_at >= :f and sent_at < :t and status <> 'FAILED'")
                .setParameter("f", from).setParameter("t", to).getSingleResult();
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

    // Users who opted in to the digest, oldest account first, bounded.
    @SuppressWarnings("unchecked")
    public List<String> digestOptIns(int limit) {
        return em().createNativeQuery("select p.logto_user_id from user_preference p where p.digest_enabled order by p.logto_user_id limit :n",
                        String.class)
                .setParameter("n", limit)
                .getResultList();
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
