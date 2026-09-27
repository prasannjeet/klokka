package com.prasannjeet.klokka.me;

import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.contract.model.PushPlatform;
import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.persistence.AppUserEntity;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.UserPreferenceEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

// Everything /me reads and writes. This repository is user-scoped by design (a person's own account, their
// memberships across workspaces, their push tokens), which is why the `me` package is exempt from the
// WorkspaceId rule in ArchitectureTest. Nothing here returns another user's data.
@ApplicationScoped
public class MeRepository implements PanacheRepositoryBase<AppUserEntity, String> {

    public record Membership(MembershipEntity membership, WorkspaceEntity workspace) {}

    private static final String PROVIDER_EXPO = "EXPO";

    public Optional<AppUserEntity> findUser(String userId) {
        return findByIdOptional(userId);
    }

    public void persistUser(AppUserEntity user) {
        persist(user);
    }

    public Optional<UserPreferenceEntity> findPreferences(String userId) {
        return Optional.ofNullable(em().find(UserPreferenceEntity.class, userId));
    }

    public void persistPreferences(UserPreferenceEntity preferences) {
        em().persist(preferences);
    }

    public List<Membership> listMemberships(String userId) {
        return em().createQuery(
                        "select m, w from MembershipEntity m, WorkspaceEntity w "
                                + "where w.id = m.workspaceId and m.userId = :userId order by w.name",
                        Object[].class)
                .setParameter("userId", userId)
                .getResultList()
                .stream()
                .map(row -> new Membership((MembershipEntity) row[0], (WorkspaceEntity) row[1]))
                .toList();
    }

    public Optional<String> employerName(UUID workspaceId) {
        return em().createQuery(
                        "select m.displayName from MembershipEntity m where m.workspaceId = :w and m.role = :role",
                        String.class)
                .setParameter("w", workspaceId)
                .setParameter("role", Role.EMPLOYER)
                .setMaxResults(1)
                .getResultStream()
                .findFirst();
    }

    public long memberCount(UUID workspaceId) {
        return em().createQuery(
                        "select count(m) from MembershipEntity m where m.workspaceId = :w and m.status in :statuses",
                        Long.class)
                .setParameter("w", workspaceId)
                .setParameter("statuses", List.of(MemberStatus.ACTIVE, MemberStatus.INVITED))
                .getSingleResult();
    }

    // Sum of live entries in [from, to]; membershipId null means the whole workspace.
    public BigDecimal hoursBetween(UUID workspaceId, UUID membershipId, LocalDate from, LocalDate to) {
        String sql = "select coalesce(sum(hours), 0) from hour_entry where workspace_id = :w "
                + (membershipId == null ? "" : "and membership_id = :m ")
                + "and work_date between :from and :to and deleted_at is null";
        var query = em().createNativeQuery(sql)
                .setParameter("w", workspaceId)
                .setParameter("from", from)
                .setParameter("to", to);
        if (membershipId != null) query.setParameter("m", membershipId);
        return new BigDecimal(query.getSingleResult().toString());
    }

    public long unreadNotifications(String userId, UUID workspaceId) {
        Object result = em().createNativeQuery(
                        "select count(*) from notification "
                                + "where logto_user_id = :u and workspace_id = :w and read_at is null")
                .setParameter("u", userId)
                .setParameter("w", workspaceId)
                .getSingleResult();
        return ((Number) result).longValue();
    }

    public boolean hasPushToken(String userId) {
        Object result = em().createNativeQuery(
                        "select count(*) from push_token where logto_user_id = :u and disabled_at is null")
                .setParameter("u", userId)
                .getSingleResult();
        return ((Number) result).longValue() > 0;
    }

    // Tokens are per device install: a token that arrives for another user moves to that user.
    public void upsertPushToken(String userId, String token, PushPlatform platform, String deviceName, Instant now) {
        em().createNativeQuery(
                        "insert into push_token (provider, token, logto_user_id, platform, device_name, created_at, "
                                + "last_seen_at, disabled_at) values (:p, :t, :u, :platform, :d, :now, :now, null) "
                                + "on conflict (provider, token) do update set logto_user_id = excluded.logto_user_id, "
                                + "platform = excluded.platform, device_name = excluded.device_name, "
                                + "last_seen_at = excluded.last_seen_at, disabled_at = null")
                .setParameter("p", PROVIDER_EXPO)
                .setParameter("t", token)
                .setParameter("u", userId)
                .setParameter("platform", platform.name())
                .setParameter("d", deviceName)
                .setParameter("now", now)
                .executeUpdate();
    }

    public int disablePushToken(String userId, String token, Instant now) {
        return em().createNativeQuery(
                        "update push_token set disabled_at = :now "
                                + "where provider = :p and token = :t and logto_user_id = :u and disabled_at is null")
                .setParameter("now", now)
                .setParameter("p", PROVIDER_EXPO)
                .setParameter("t", token)
                .setParameter("u", userId)
                .executeUpdate();
    }

    private EntityManager em() {
        return getEntityManager();
    }
}
