package com.prasannjeet.klokka.operator;

import static com.prasannjeet.klokka.auth.CurrentUser.OPERATOR_SCOPE;
import static com.prasannjeet.klokka.auth.CurrentUser.PLATFORM_ADMIN;

import com.prasannjeet.klokka.contract.api.OperatorApi;
import com.prasannjeet.klokka.contract.model.InvitationStatus;
import com.prasannjeet.klokka.contract.model.OperatorHealth;
import com.prasannjeet.klokka.contract.model.OperatorInvitationPage;
import com.prasannjeet.klokka.contract.model.OperatorUserPage;
import com.prasannjeet.klokka.contract.model.OperatorVolume;
import com.prasannjeet.klokka.contract.model.OperatorWorkspacePage;
import com.prasannjeet.klokka.contract.model.Role;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import java.util.UUID;

// /operator/* (CHQ-141): the global platform-admin role (or the `operator` scope it carries) from the token, D1.
@RolesAllowed({PLATFORM_ADMIN, OPERATOR_SCOPE})
public class OperatorResource implements OperatorApi {

    @Inject
    OperatorService service;

    @Override
    public OperatorHealth operatorHealth() {
        return service.health();
    }

    @Override
    public OperatorInvitationPage operatorListInvitations(InvitationStatus status, String month, Integer page, Integer pageSize) {
        return service.invitations(status, month, page, pageSize);
    }

    @Override
    public OperatorUserPage operatorListUsers(String q, Role role, Integer page, Integer pageSize) {
        return service.users(q, role, page, pageSize);
    }

    @Override
    public OperatorWorkspacePage operatorListWorkspaces(String q, Boolean pay, String month, Integer page, Integer pageSize, String sort) {
        return service.workspaces(q, pay, month, page, pageSize, sort);
    }

    @Override
    public void operatorResendInvitation(UUID invitationId) {
        service.resendInvitation(invitationId);
    }

    @Override
    public OperatorVolume operatorVolume(String month) {
        return service.volume(month);
    }
}
