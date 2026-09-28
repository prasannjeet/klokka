package com.prasannjeet.klokka.invitation;

import com.prasannjeet.klokka.contract.api.InvitationsApi;
import com.prasannjeet.klokka.contract.model.Invitation;
import com.prasannjeet.klokka.contract.model.InvitationAccepted;
import com.prasannjeet.klokka.contract.model.Language;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import java.util.Optional;

// /invitations/{token}: the lookup is public (the token is the secret), accepting needs a signed-in user.
@Authenticated
public class InvitationResource implements InvitationsApi {

    @Inject
    InvitationService service;

    @Context
    HttpHeaders headers;

    @Override
    public InvitationAccepted acceptInvitation(String token) {
        return service.accept(token, Optional.ofNullable(headers.getHeaderString(HttpHeaders.ACCEPT_LANGUAGE)));
    }

    @PermitAll
    @Override
    public Invitation getInvitation(String token, Language lang) {
        return service.lookup(token, lang);
    }
}
