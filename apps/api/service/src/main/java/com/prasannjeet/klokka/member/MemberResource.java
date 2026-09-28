package com.prasannjeet.klokka.member;

import com.prasannjeet.klokka.contract.api.MembersApi;
import com.prasannjeet.klokka.contract.model.Member;
import com.prasannjeet.klokka.contract.model.MemberInvite;
import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.contract.model.MemberUpdate;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import java.util.List;
import java.util.UUID;

// /workspaces/{id}/members (CHQ-113, CHQ-116).
@Authenticated
public class MemberResource implements MembersApi {

    @Inject
    MemberService service;

    @Override
    public Member getMember(UUID workspaceId, UUID membershipId, String month) {
        return service.get(workspaceId, membershipId, month);
    }

    @Override
    public Member inviteMember(UUID workspaceId, MemberInvite memberInvite) {
        return service.invite(workspaceId, memberInvite);
    }

    @Override
    public List<Member> listMembers(UUID workspaceId, MemberStatus status, String month) {
        return service.list(workspaceId, status, month);
    }

    @Override
    public void removeMember(UUID workspaceId, UUID membershipId) {
        service.remove(workspaceId, membershipId);
    }

    @Override
    public Member resendInvitation(UUID workspaceId, UUID membershipId) {
        return service.resend(workspaceId, membershipId);
    }

    @Override
    public Member updateMember(UUID workspaceId, UUID membershipId, MemberUpdate memberUpdate) {
        return service.update(workspaceId, membershipId, memberUpdate);
    }
}
