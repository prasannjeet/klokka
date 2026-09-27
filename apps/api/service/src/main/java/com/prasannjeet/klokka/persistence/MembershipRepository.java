package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.domain.WorkspaceId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

// Membership rows inside one workspace. Every method takes the WorkspaceId (ArchitectureTest enforces this);
// a membership is only ever found together with its workspace, never by id alone.
@ApplicationScoped
public class MembershipRepository implements PanacheRepositoryBase<MembershipEntity, UUID> {

    public List<MembershipEntity> listMembers(WorkspaceId workspaceId) {
        return list("workspaceId = ?1 order by role, displayName", workspaceId.value());
    }

    public Optional<MembershipEntity> findMember(WorkspaceId workspaceId, UUID membershipId) {
        return find("workspaceId = ?1 and id = ?2", workspaceId.value(), membershipId).firstResultOptional();
    }

    public Optional<MembershipEntity> findByUser(WorkspaceId workspaceId, String userId) {
        return find("workspaceId = ?1 and userId = ?2", workspaceId.value(), userId).firstResultOptional();
    }

    public long countByStatus(WorkspaceId workspaceId, List<MemberStatus> statuses) {
        return count("workspaceId = ?1 and status in ?2", workspaceId.value(), statuses);
    }

    public void persistMember(WorkspaceId workspaceId, MembershipEntity member) {
        if (!workspaceId.value().equals(member.workspaceId)) {
            throw new IllegalArgumentException("membership " + member.id + " is not in workspace " + workspaceId);
        }
        persist(member);
    }
}
