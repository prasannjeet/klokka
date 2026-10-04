package com.prasannjeet.klokka.me;

import com.prasannjeet.klokka.contract.api.MeApi;
import com.prasannjeet.klokka.contract.model.Me;
import com.prasannjeet.klokka.contract.model.Preferences;
import com.prasannjeet.klokka.contract.model.PreferencesUpdate;
import com.prasannjeet.klokka.contract.model.PushTokenRegistration;
import com.prasannjeet.klokka.contract.model.UserProfileUpdate;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import java.util.Optional;

// /me, /me/preferences, /me/push-tokens: the generated MeApi implemented against the database. DELETE /me is
// AccountDeletionService (CHQ-157).
@Authenticated
public class MeResource implements MeApi {

    @Inject
    MeService service;

    @Inject
    AccountDeletionService deletion;

    @Context
    HttpHeaders headers;

    @Override
    public Me getMe() {
        return service.me(Optional.ofNullable(headers.getHeaderString(HttpHeaders.ACCEPT_LANGUAGE)));
    }

    @Override
    public void deleteMe() {
        deletion.deleteCurrentUser();
    }

    @Override
    public Me updateMe(UserProfileUpdate userProfileUpdate) {
        return service.updateProfile(userProfileUpdate);
    }

    @Override
    public Preferences updateMyPreferences(PreferencesUpdate preferencesUpdate) {
        return service.updatePreferences(preferencesUpdate);
    }

    @Override
    public void registerPushToken(PushTokenRegistration pushTokenRegistration) {
        service.registerPushToken(pushTokenRegistration);
    }

    @Override
    public void deletePushToken(String token) {
        service.deletePushToken(token);
    }
}
