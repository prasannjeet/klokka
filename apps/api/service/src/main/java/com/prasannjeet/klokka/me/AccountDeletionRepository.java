package com.prasannjeet.klokka.me;

import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.persistence.AppUserEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

// The database half of deleting an account (CHQ-157). User-scoped like MeRepository, so it lives in the exempt `me`
// package; the workspace deletes still take the WorkspaceId. Native SQL because a whole workspace goes in FK order
// and the rows are never needed as entities.
@ApplicationScoped
public class AccountDeletionRepository implements PanacheRepositoryBase<AppUserEntity, String> {

    public record Counts(int workspacesDeleted, int membershipsDeactivated, int membershipsRemoved) {}

    // Children of a workspace, deleted before it in this order. A table added later with a foreign key to one of
    // these (or to workspace) belongs here too; AccountDeletionTest seeds every table and fails on a missing one.
    private static final List<String> WORKSPACE_CHILDREN = List.of(
            "delete from job_reminder where workspace_id = :w",
            "delete from job where workspace_id = :w",
            "delete from entry_flag where workspace_id = :w",
            "delete from hour_entry_change where workspace_id = :w",
            "delete from hour_entry where workspace_id = :w",
            "delete from month_lock where workspace_id = :w",
            "delete from notification where workspace_id = :w",
            "update email_send set workspace_id = null where workspace_id = :w",
            "delete from membership where workspace_id = :w",
            "delete from workspace where id = :w");

    @Transactional
    @SuppressWarnings("unchecked")
    public List<String> ownedOrganizations(String userId) {
        return em().createNativeQuery("select w.logto_org_id from membership m join workspace w on w.id = m.workspace_id "
                        + "where m.logto_user_id = :u and m.role = 'EMPLOYER'")
                .setParameter("u", userId)
                .getResultList();
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Counts deleteAccountData(String userId, Instant now) {
        List<Object[]> memberships = em().createNativeQuery(
                        "select workspace_id, id, role from membership where logto_user_id = :u")
                .setParameter("u", userId)
                .getResultList();
        int workspaces = 0, deactivated = 0, removed = 0;
        for (Object[] row : memberships) {
            WorkspaceId workspaceId = WorkspaceId.of((UUID) row[0]);
            UUID membershipId = (UUID) row[1];
            if ("EMPLOYER".equals(row[2])) {
                deleteWorkspace(workspaceId);
                workspaces++;
            } else if (hasAnyEntries(workspaceId, membershipId)) {
                // The employer's record stays (D1: the workspace's hours); what tied it to this person goes.
                em().createNativeQuery("update membership set status = 'DEACTIVATED', deactivated_at = coalesce(deactivated_at, :now), "
                                + "logto_user_id = null, email = :email, avatar_emoji = null where workspace_id = :w and id = :m")
                        .setParameter("now", now)
                        .setParameter("email", membershipId + "@deleted.invalid")
                        .setParameter("w", workspaceId.value())
                        .setParameter("m", membershipId)
                        .executeUpdate();
                deactivated++;
            } else {
                em().createNativeQuery("delete from membership where workspace_id = :w and id = :m")
                        .setParameter("w", workspaceId.value())
                        .setParameter("m", membershipId)
                        .executeUpdate();
                removed++;
            }
        }
        // The monthly mail quota counts these rows, so they stay; only the address goes.
        em().createNativeQuery("update email_send set recipient = 'deleted@deleted.invalid' where logto_user_id = :u")
                .setParameter("u", userId)
                .executeUpdate();
        // Cascades to user_preference, notification, push_token and digest_run.
        em().createNativeQuery("delete from app_user where logto_user_id = :u").setParameter("u", userId).executeUpdate();
        return new Counts(workspaces, deactivated, removed);
    }

    // Any entry, soft-deleted ones included: they still reference the membership, so it cannot be deleted.
    private boolean hasAnyEntries(WorkspaceId workspaceId, UUID membershipId) {
        Number n = (Number) em().createNativeQuery("select count(*) from hour_entry where workspace_id = :w and membership_id = :m")
                .setParameter("w", workspaceId.value())
                .setParameter("m", membershipId)
                .getSingleResult();
        return n.longValue() > 0;
    }

    private void deleteWorkspace(WorkspaceId workspaceId) {
        for (String sql : WORKSPACE_CHILDREN) {
            em().createNativeQuery(sql).setParameter("w", workspaceId.value()).executeUpdate();
        }
    }

    private EntityManager em() {
        return getEntityManager();
    }
}
