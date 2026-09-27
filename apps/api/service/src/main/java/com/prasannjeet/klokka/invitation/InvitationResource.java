package com.prasannjeet.klokka.invitation;

import static com.prasannjeet.klokka.error.KlokkaException.notImplemented;

import com.prasannjeet.klokka.contract.api.InvitationsApi;
import com.prasannjeet.klokka.contract.model.Invitation;
import com.prasannjeet.klokka.contract.model.InvitationAccepted;
import com.prasannjeet.klokka.contract.model.Language;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;

// E1 (CHQ-114): 501 NOT_IMPLEMENTED until then. The lookup is public (the token is the secret), accepting is not.
@Authenticated
public class InvitationResource implements InvitationsApi {

    @Override
    public InvitationAccepted acceptInvitation(String token) {
        throw notImplemented("acceptInvitation");
    }

    @PermitAll
    @Override
    public Invitation getInvitation(String token, Language lang) {
        throw notImplemented("getInvitation");
    }
}
