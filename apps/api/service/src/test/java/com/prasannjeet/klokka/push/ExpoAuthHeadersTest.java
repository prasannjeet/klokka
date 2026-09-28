package com.prasannjeet.klokka.push;

import static org.assertj.core.api.Assertions.assertThat;

import com.prasannjeet.klokka.logto.LogtoService;
import com.prasannjeet.klokka.support.Fake;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// The Expo access token must reach the Expo client only. Staging showed the filter on every REST client: with
// KLOKKA_EXPO_ACCESS_TOKEN set, the Logto Management API received the Expo token as its bearer (401 JWSInvalid).
@QuarkusTest
@TestProfile(ExpoAuthHeadersTest.WithExpoToken.class)
class ExpoAuthHeadersTest {

    private static final String EXPO_TOKEN = "expo-secret-token";

    @Inject
    LogtoService logto;

    @Inject
    @RestClient
    ExpoPushApi expo;

    @BeforeEach
    void reset() {
        Fake.reset();
    }

    @Test
    void logtoCallsCarryTheLogtoTokenEvenWhenAnExpoTokenIsConfigured() {
        LogtoService.SelfCheck check = logto.selfCheck();
        assertThat(check.reachable()).as(check.detail()).isTrue();
        assertThat(Fake.<String>list("managementAuthorizations")).containsExactly("Bearer fake-m2m-token");
    }

    @Test
    void expoCallsCarryTheExpoToken() {
        expo.send(List.of(new ExpoModels.Message("ExponentPushToken[auth-test]", "t", "b", Map.of(), "default", "hours", "high")));
        assertThat(Fake.<String>list("expoAuthorizations")).containsExactly("Bearer " + EXPO_TOKEN);
    }

    public static class WithExpoToken implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("klokka.push.expo-access-token", EXPO_TOKEN);
        }
    }
}
