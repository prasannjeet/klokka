package com.prasannjeet.klokka.push;

import com.prasannjeet.klokka.config.KlokkaConfig;
import io.quarkus.arc.Unremovable;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.client.ClientRequestContext;
import jakarta.ws.rs.client.ClientRequestFilter;
import java.io.IOException;

// Adds `Authorization: Bearer <EXPO access token>` when KLOKKA_EXPO_ACCESS_TOKEN is set (Expo's enhanced push
// security); registered on the expo REST client ONLY, through quarkus.rest-client.expo.providers. Never annotate
// it @Provider: Quarkus then applies it to every REST client, and the Logto Management API would receive the Expo
// token as its bearer (ExpoAuthHeadersTest). @Unremovable: nothing injects it, the REST client looks it up by class.
@Unremovable
@ApplicationScoped
public class ExpoAuthHeaders implements ClientRequestFilter {

    @Inject
    KlokkaConfig config;

    @Override
    public void filter(ClientRequestContext request) throws IOException {
        config.push().expoAccessToken().filter(t -> !t.isBlank())
                .ifPresent(token -> request.getHeaders().putSingle("Authorization", "Bearer " + token));
        request.getHeaders().putSingle("Accept-Encoding", "gzip, deflate");
    }
}
