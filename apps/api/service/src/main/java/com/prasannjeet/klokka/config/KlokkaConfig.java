package com.prasannjeet.klokka.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.net.URI;
import java.time.Duration;
import java.util.Optional;

// Every knob the API has, validated at startup (a bad value fails the boot, never degrades silently). The values
// come from application.properties, which reads the KLOKKA_* environment variables.
@ConfigMapping(prefix = "klokka")
public interface KlokkaConfig {

    // Where the web app lives; invite links and share cards point here.
    URI webBaseUrl();

    // The language a new user gets when the Accept-Language header says nothing useful (D16).
    @WithDefault("sv")
    @Pattern(regexp = "sv|en")
    String defaultLanguage();

    Invitation invitation();

    Entries entries();

    Push push();

    Mail mail();

    Digest digest();

    Logto logto();

    interface Invitation {
        // How long an invitation link works (D3: 7 days).
        @WithDefault("P7D")
        Duration lifetime();
    }

    interface Entries {
        // Items accepted by POST /workspaces/{id}/entries/batch.
        @WithDefault("500")
        @Min(1)
        @Max(5000)
        int batchMax();

        // Days accepted by GET /workspaces/{id}/entries?from&to.
        @WithDefault("62")
        @Min(1)
        @Max(366)
        int rangeMaxDays();
    }

    interface Push {
        // "One notification per sitting": the sliding quiet window and its hard cap.
        @WithDefault("PT10M")
        Duration quietWindow();

        @WithDefault("PT30M")
        Duration maxDelay();

        // Messages per Expo push call (Expo accepts at most 100).
        @WithDefault("100")
        @Min(1)
        @Max(100)
        int batchSize();

        Optional<String> expoAccessToken();
    }

    interface Mail {
        // The SMTP account's monthly allowance, shown on the operator's volume page.
        @WithDefault("100")
        @Min(1)
        int monthlyQuota();
    }

    interface Digest {
        // The workspace-local hour on Monday when the weekly digest goes out.
        @WithDefault("7")
        @Min(0)
        @Max(23)
        int localHour();
    }

    interface Logto {
        URI endpoint();

        Optional<String> webhookSigningKey();
    }
}
