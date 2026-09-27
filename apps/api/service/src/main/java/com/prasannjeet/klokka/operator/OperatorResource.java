package com.prasannjeet.klokka.operator;

import static com.prasannjeet.klokka.auth.CurrentUser.PLATFORM_ADMIN;
import static com.prasannjeet.klokka.error.KlokkaException.notImplemented;

import com.prasannjeet.klokka.contract.api.OperatorApi;
import com.prasannjeet.klokka.contract.model.InvitationStatus;
import com.prasannjeet.klokka.contract.model.OperatorHealth;
import com.prasannjeet.klokka.contract.model.OperatorInvitationPage;
import com.prasannjeet.klokka.contract.model.OperatorUserPage;
import com.prasannjeet.klokka.contract.model.OperatorVolume;
import com.prasannjeet.klokka.contract.model.OperatorWorkspacePage;
import com.prasannjeet.klokka.contract.model.Role;
import jakarta.annotation.security.RolesAllowed;
import java.util.UUID;

// E10 (CHQ-141): 501 NOT_IMPLEMENTED until then. The role gate is live already: platform-admin only (D1).
@RolesAllowed(PLATFORM_ADMIN)
public class OperatorResource implements OperatorApi {

    @Override
    public OperatorHealth operatorHealth() {
        throw notImplemented("operatorHealth");
    }

    @Override
    public OperatorInvitationPage operatorListInvitations(InvitationStatus status, String month, Integer page,
            Integer pageSize) {
        throw notImplemented("operatorListInvitations");
    }

    @Override
    public OperatorUserPage operatorListUsers(String q, Role role, Integer page, Integer pageSize) {
        throw notImplemented("operatorListUsers");
    }

    @Override
    public OperatorWorkspacePage operatorListWorkspaces(String q, Boolean pay, String month, Integer page,
            Integer pageSize, String sort) {
        throw notImplemented("operatorListWorkspaces");
    }

    @Override
    public void operatorResendInvitation(UUID invitationId) {
        throw notImplemented("operatorResendInvitation");
    }

    @Override
    public OperatorVolume operatorVolume(String month) {
        throw notImplemented("operatorVolume");
    }
}
