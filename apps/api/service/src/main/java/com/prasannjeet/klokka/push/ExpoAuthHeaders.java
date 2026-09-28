package com.prasannjeet.klokka.push;

import com.prasannjeet.klokka.config.KlokkaConfig;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.client.ClientRequestContext;
import jakarta.ws.rs.client.ClientRequestFilter;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;

// Adds `Authorization: Bearer <EXPO access token>` when KLOKKA_EXPO_ACCESS_TOKEN is set (Expo's enhanced push
// security); registered on the expo REST client through quarkus.rest-client.expo.providers.
@Provider
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
