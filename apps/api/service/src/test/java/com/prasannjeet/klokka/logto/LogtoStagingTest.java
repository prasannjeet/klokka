package com.prasannjeet.klokka.logto;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

// Opt-in (-Dklokka.it.logto=true): the real staging Logto with the klokka-api M2M credentials from
// .agents/local-credentials/logto.json. Creates a throwaway organization and deletes it again.
@QuarkusTest
@TestProfile(LogtoStagingTest.StagingLogto.class)
@EnabledIfSystemProperty(named = "klokka.it.logto", matches = "true")
class LogtoStagingTest {

    @Inject
    LogtoService logto;

    @Test
    void createsAndDeletesAThrowawayOrganizationOnStaging() {
        LogtoService.SelfCheck check = logto.selfCheck();
        assertThat(check.reachable()).as(check.detail()).isTrue();
        String name = "klokka-it-" + UUID.randomUUID().toString().substring(0, 8);
        String orgId = logto.createOrganization(name, "test");
        assertThat(orgId).isNotBlank();
        logto.deleteOrganization(orgId);
        assertThat(logto.findUser("usr_does_not_exist")).isEmpty();
    }

    public static class StagingLogto implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            // Quarkus instantiates every test profile during discovery, on CI runners too, where the
            // gitignored credentials file does not exist: stay inert unless the test is opted in.
            if (!Boolean.getBoolean("klokka.it.logto")) {
                return Map.of();
            }
            Path file = credentials();
            try {
                JsonNode json = new ObjectMapper().readTree(Files.readString(file));
                String issuer = json.get("issuer").asText();
                Map<String, String> config = new HashMap<>();
                config.put("quarkus.oidc-client.auth-server-url", issuer);
                config.put("quarkus.oidc-client.token-path", issuer + "/token");
                config.put("quarkus.oidc-client.client-id", json.at("/management_api/m2m_app/id").asText());
                config.put("quarkus.oidc-client.credentials.secret", json.at("/management_api/m2m_app/secret").asText());
                config.put("quarkus.rest-client.logto.url", json.at("/management_api/api_base").asText());
                config.put("klokka.logto.endpoint", json.get("endpoint").asText());
                return config;
            } catch (IOException e) {
                throw new IllegalStateException("cannot read " + file, e);
            }
        }

        private static Path credentials() {
            Path p = Path.of("").toAbsolutePath();
            for (int i = 0; i < 6 && p != null; i++, p = p.getParent()) {
                Path candidate = p.resolve(".agents/local-credentials/logto.json");
                if (Files.exists(candidate)) return candidate;
            }
            throw new IllegalStateException(".agents/local-credentials/logto.json not found above " + Path.of("").toAbsolutePath());
        }
    }
}
