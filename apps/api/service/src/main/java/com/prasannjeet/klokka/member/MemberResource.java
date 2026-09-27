package com.prasannjeet.klokka.member;

import static com.prasannjeet.klokka.error.KlokkaException.notImplemented;

import com.prasannjeet.klokka.contract.api.MembersApi;
import com.prasannjeet.klokka.contract.model.Member;
import com.prasannjeet.klokka.contract.model.MemberInvite;
import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.contract.model.MemberUpdate;
import io.quarkus.security.Authenticated;
import java.util.List;
import java.util.UUID;

// E1 (CHQ-113, CHQ-116): 501 NOT_IMPLEMENTED until then.
@Authenticated
public class MemberResource implements MembersApi {

    @Override
    public Member getMember(UUID workspaceId, UUID membershipId, String month) {
        throw notImplemented("getMember");
    }

    @Override
    public Member inviteMember(UUID workspaceId, MemberInvite memberInvite) {
        throw notImplemented("inviteMember");
    }

    @Override
    public List<Member> listMembers(UUID workspaceId, MemberStatus status, String month) {
        throw notImplemented("listMembers");
    }

    @Override
    public void removeMember(UUID workspaceId, UUID membershipId) {
        throw notImplemented("removeMember");
    }

    @Override
    public Member resendInvitation(UUID workspaceId, UUID membershipId) {
        throw notImplemented("resendInvitation");
    }

    @Override
    public Member updateMember(UUID workspaceId, UUID membershipId, MemberUpdate memberUpdate) {
        throw notImplemented("updateMember");
    }
}
