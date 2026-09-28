package com.prasannjeet.klokka.invitation;

import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;
import java.util.UUID;

// The invite link flow starts from a token, before any workspace is known: the token is the scope (it is the
// secret in the email link), which is why this package is exempt from the WorkspaceId rule.
@ApplicationScoped
public class InvitationRepository implements PanacheRepositoryBase<MembershipEntity, UUID> {

    public Optional<MembershipEntity> findByToken(String token) {
        return find("invitationToken = ?1", token).firstResultOptional();
    }

    public WorkspaceEntity workspaceOf(MembershipEntity membership) {
        return getEntityManager().find(WorkspaceEntity.class, membership.workspaceId);
    }

    public Optional<MembershipEntity> employerOf(MembershipEntity membership) {
        return find("workspaceId = ?1 and role = ?2", membership.workspaceId, Role.EMPLOYER)
                .firstResultOptional();
    }

    public Optional<MembershipEntity> findByUserInWorkspace(UUID workspaceId, String userId) {
        return find("workspaceId = ?1 and userId = ?2", workspaceId, userId).firstResultOptional();
    }
}
