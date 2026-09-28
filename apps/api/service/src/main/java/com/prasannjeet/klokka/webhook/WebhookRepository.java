package com.prasannjeet.klokka.webhook;

import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.persistence.AppUserEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Instant;
import java.util.Optional;

// What Logto events touch: the app_user profile mirror, the idempotency ledger and membership deactivation on
// user deletion. Keyed by Logto ids, not by workspace, which is why the webhook package is exempt from the
// WorkspaceId rule in ArchitectureTest.
@ApplicationScoped
public class WebhookRepository implements PanacheRepositoryBase<AppUserEntity, String> {

    // True when the event is new; false when it was already applied (the primary key rejects the duplicate).
    public boolean recordEvent(String hookId, String event, Instant createdAt, Instant now) {
        int inserted = getEntityManager().createNativeQuery(
                        "insert into webhook_event (hook_id, event, created_at, received_at) values (:h, :e, :c, :n) "
                                + "on conflict do nothing")
                .setParameter("h", hookId)
                .setParameter("e", event)
                .setParameter("c", createdAt)
                .setParameter("n", now)
                .executeUpdate();
        return inserted == 1;
    }

    public Optional<AppUserEntity> findUser(String userId) {
        return findByIdOptional(userId);
    }

    public void persistUser(AppUserEntity user) {
        persist(user);
    }

    public int deactivateMembershipsOf(String userId, Instant now) {
        return getEntityManager().createQuery("update MembershipEntity m set m.status = :deactivated, m.deactivatedAt = :now "
                        + "where m.userId = :u and m.status = :active")
                .setParameter("deactivated", MemberStatus.DEACTIVATED)
                .setParameter("active", MemberStatus.ACTIVE)
                .setParameter("now", now)
                .setParameter("u", userId)
                .executeUpdate();
    }
}
