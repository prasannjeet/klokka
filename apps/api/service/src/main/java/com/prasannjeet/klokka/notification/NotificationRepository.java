package com.prasannjeet.klokka.notification;

import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.persistence.NotificationEntity;
import com.prasannjeet.klokka.persistence.UserPreferenceEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

// Notifications are addressed to a person, not scoped to a workspace (the centre lists every workspace at once),
// so this repository is keyed by logto_user_id and exempt from the WorkspaceId rule (ArchitectureTest). The push
// queue lives on the same rows: pushDueAt / pushedAt, claimed with SKIP LOCKED by the sweeper.
@ApplicationScoped
public class NotificationRepository implements PanacheRepositoryBase<NotificationEntity, UUID> {

    public record Recipient(Language language, boolean pushEnabled) {}

    public Optional<NotificationEntity> findOpenByKey(String coalesceKey) {
        return find("coalesceKey = ?1 and pushedAt is null", coalesceKey).firstResultOptional();
    }

    public void deleteNotification(NotificationEntity notification) {
        delete(notification);
    }

    public void persistNotification(NotificationEntity notification) {
        persist(notification);
    }

    public Optional<NotificationEntity> findOwn(String userId, UUID id) {
        return find("userId = ?1 and id = ?2", userId, id).firstResultOptional();
    }

    // Newest first, keyset paged on (createdAt, id); returns up to limit + 1 so the caller knows about a next page.
    public List<NotificationEntity> page(String userId, UUID workspaceId, boolean unreadOnly, Instant cursorAt, UUID cursorId, int limitPlusOne) {
        StringBuilder q = new StringBuilder("select n from NotificationEntity n where n.userId = :u");
        if (workspaceId != null) q.append(" and n.workspaceId = :w");
        if (unreadOnly) q.append(" and n.readAt is null");
        if (cursorAt != null) q.append(" and (n.createdAt < :ca or (n.createdAt = :ca and n.id < :ci))");
        q.append(" order by n.createdAt desc, n.id desc");
        var query = em().createQuery(q.toString(), NotificationEntity.class).setParameter("u", userId);
        if (workspaceId != null) query.setParameter("w", workspaceId);
        if (cursorAt != null) query.setParameter("ca", cursorAt).setParameter("ci", cursorId);
        return query.setMaxResults(limitPlusOne).getResultList();
    }

    public long countUnread(String userId, UUID workspaceId) {
        if (workspaceId == null) return count("userId = ?1 and readAt is null", userId);
        return count("userId = ?1 and workspaceId = ?2 and readAt is null", userId, workspaceId);
    }

    public int markAllRead(String userId, UUID workspaceId, Instant now) {
        String jpql = "update NotificationEntity n set n.readAt = :now where n.userId = :u and n.readAt is null"
                + (workspaceId == null ? "" : " and n.workspaceId = :w");
        var query = em().createQuery(jpql).setParameter("now", now).setParameter("u", userId);
        if (workspaceId != null) query.setParameter("w", workspaceId);
        return query.executeUpdate();
    }

    public Optional<WorkspaceEntity> workspaceOf(NotificationEntity notification) {
        return notification.workspaceId == null ? Optional.empty()
                : Optional.ofNullable(em().find(WorkspaceEntity.class, notification.workspaceId));
    }

    public Optional<Recipient> recipient(String userId) {
        UserPreferenceEntity p = em().find(UserPreferenceEntity.class, userId);
        return p == null ? Optional.empty() : Optional.of(new Recipient(p.language, p.pushEnabled));
    }

    // ---- the push queue

    @SuppressWarnings("unchecked")
    public List<NotificationEntity> claimDue(Instant now, int limit) {
        List<UUID> ids = em().createNativeQuery("select id from notification where push_due_at <= :now and pushed_at is null "
                        + "order by push_due_at limit :n for update skip locked", UUID.class)
                .setParameter("now", now)
                .setParameter("n", limit)
                .getResultList();
        if (ids.isEmpty()) return List.of();
        return list("id in ?1 order by pushDueAt", ids);
    }

    @SuppressWarnings("unchecked")
    public List<String> enabledTokens(String userId) {
        return em().createNativeQuery("select token from push_token where logto_user_id = :u and disabled_at is null "
                        + "order by last_seen_at desc", String.class)
                .setParameter("u", userId)
                .getResultList();
    }

    public void recordDelivery(String ticketId, UUID notificationId, String token, String status, String errorCode, Instant now) {
        em().createNativeQuery("insert into push_delivery (ticket_id, notification_id, provider, token, status, error_code, sent_at) "
                        + "values (:t, :n, 'EXPO', :tok, :s, :e, :now) on conflict (ticket_id) do nothing")
                .setParameter("t", ticketId)
                .setParameter("n", notificationId)
                .setParameter("tok", token)
                .setParameter("s", status)
                .setParameter("e", errorCode)
                .setParameter("now", now)
                .executeUpdate();
    }

    public record PendingDelivery(String ticketId, String token) {}

    @SuppressWarnings("unchecked")
    public List<PendingDelivery> claimPendingReceipts(Instant sentBefore, int limit) {
        List<Object[]> rows = em().createNativeQuery("select ticket_id, token from push_delivery where receipt_checked_at is null "
                        + "and status = 'SENT' and sent_at < :before order by sent_at limit :n for update skip locked")
                .setParameter("before", sentBefore)
                .setParameter("n", limit)
                .getResultList();
        return rows.stream().map(r -> new PendingDelivery((String) r[0], (String) r[1])).toList();
    }

    public void receipt(String ticketId, String status, String errorCode, Instant now) {
        em().createNativeQuery("update push_delivery set status = :s, error_code = :e, receipt_checked_at = :now where ticket_id = :t")
                .setParameter("s", status)
                .setParameter("e", errorCode)
                .setParameter("now", now)
                .setParameter("t", ticketId)
                .executeUpdate();
    }

    public int deleteToken(String token) {
        return em().createNativeQuery("delete from push_token where provider = 'EXPO' and token = :t")
                .setParameter("t", token)
                .executeUpdate();
    }

    private EntityManager em() {
        return getEntityManager();
    }
}
