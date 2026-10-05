package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.domain.WorkspaceId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

// Membership rows inside one workspace. Every method takes the WorkspaceId (ArchitectureTest enforces this);
// a membership is only ever found together with its workspace, never by id alone.
@ApplicationScoped
public class MembershipRepository implements PanacheRepositoryBase<MembershipEntity, UUID> {

    public void lockMember(WorkspaceId workspaceId, UUID id) {
        find("workspaceId = ?1 and id = ?2", workspaceId.value(), id)
                .withLock(LockModeType.PESSIMISTIC_WRITE).firstResult();
    }

    public List<MembershipEntity> listMembers(WorkspaceId workspaceId) {
        return list("workspaceId = ?1 order by role, displayName", workspaceId.value());
    }

    public Optional<MembershipEntity> findMember(WorkspaceId workspaceId, UUID membershipId) {
        return find("workspaceId = ?1 and id = ?2", workspaceId.value(), membershipId).firstResultOptional();
    }

    public Optional<MembershipEntity> findByUser(WorkspaceId workspaceId, String userId) {
        return find("workspaceId = ?1 and userId = ?2", workspaceId.value(), userId).firstResultOptional();
    }

    public Optional<MembershipEntity> findByEmail(WorkspaceId workspaceId, String email) {
        return find("workspaceId = ?1 and email = ?2", workspaceId.value(), email).firstResultOptional();
    }

    public Optional<MembershipEntity> findEmployer(WorkspaceId workspaceId) {
        return find("workspaceId = ?1 and role = ?2", workspaceId.value(), Role.EMPLOYER).firstResultOptional();
    }

    public List<MembershipEntity> listByStatus(WorkspaceId workspaceId, List<MemberStatus> statuses) {
        return list("workspaceId = ?1 and status in ?2 order by role, displayName", workspaceId.value(), statuses);
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

    public void deleteMember(WorkspaceId workspaceId, MembershipEntity member) {
        if (!workspaceId.value().equals(member.workspaceId)) {
            throw new IllegalArgumentException("membership " + member.id + " is not in workspace " + workspaceId);
        }
        delete(member);
    }
}
