package com.prasannjeet.klokka.auth;

import static com.prasannjeet.klokka.contract.model.MemberStatus.INVITED;
import static com.prasannjeet.klokka.error.KlokkaException.forbidden;
import static com.prasannjeet.klokka.error.KlokkaException.notFound;

import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import com.prasannjeet.klokka.persistence.WorkspaceRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.UUID;

// Authorization inside a workspace, decided from the membership table only (D1). A workspace the caller is not a
// member of answers 404, never revealing that it exists; a member without the needed role answers 403. Deactivated
// members keep read access to their history; invited ones have no user yet and cannot get here.
@ApplicationScoped
public class WorkspaceAccess {

    @Inject
    CurrentUser currentUser;

    @Inject
    WorkspaceRepository workspaces;

    @Inject
    MembershipRepository memberships;

    public Access member(UUID workspaceId) {
        WorkspaceId id = WorkspaceId.of(workspaceId);
        WorkspaceEntity workspace = workspaces.findWorkspace(id).orElseThrow(() -> notFound("Workspace " + workspaceId));
        MembershipEntity membership = memberships.findByUser(id, currentUser.id())
                .filter(m -> m.status != INVITED)
                .orElseThrow(() -> notFound("Workspace " + workspaceId));
        return new Access(workspace, membership);
    }

    public Access employer(UUID workspaceId) {
        Access access = member(workspaceId);
        if (!access.employer()) throw forbidden("Only the employer of this workspace can do that.");
        return access;
    }

    // The employer, or the member the path names.
    public Access employerOrSelf(UUID workspaceId, UUID membershipId) {
        Access access = member(workspaceId);
        if (!access.employer() && !access.isSelf(membershipId)) {
            throw forbidden("Only the employer or the member themselves can see that.");
        }
        return access;
    }

    // The target membership in the same workspace, 404 when it is not there.
    public MembershipEntity target(Access access, UUID membershipId) {
        return memberships.findMember(access.workspaceId(), membershipId)
                .orElseThrow(() -> notFound("Member " + membershipId + " in this workspace"));
    }
}
