package com.prasannjeet.klokka.auth;

import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;

// The outcome of an authorization check: the workspace and the caller's own membership in it.
public record Access(WorkspaceEntity workspace, MembershipEntity membership) {

    public WorkspaceId workspaceId() {
        return WorkspaceId.of(workspace.id);
    }

    public boolean employer() {
        return membership.role == Role.EMPLOYER;
    }

    public String userId() {
        return membership.userId;
    }

    public boolean isSelf(java.util.UUID membershipId) {
        return membership.id.equals(membershipId);
    }
}
