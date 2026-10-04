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

    // The API's own version label for the operator health page (CI sets the commit part).
    @WithDefault("dev")
    String buildVersion();

    Invitation invitation();

    Entries entries();

    Push push();

    Mail mail();

    Digest digest();

    Logto logto();

    Operator operator();

    Maps maps();

    Reminders reminders();

    // Opt-in test switches; mapped here because every klokka.* key must be known (unknown keys fail the boot).
    It it();

    interface Invitation {
        // How long an invitation link works (D3: 7 days).
        @WithDefault("P7D")
        Duration lifetime();

        // Emails one invitee costs: the invitation itself plus Logto's sign-up verification code (D3).
        @WithDefault("2")
        @Min(1)
        @Max(10)
        int emailBudget();
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

        // Jobs one member may have on one day (CHQ-156).
        @WithDefault("20")
        @Min(1)
        @Max(100)
        int jobsPerDayMax();
    }

    interface Push {
        // "One notification per sitting": the sliding quiet window and its hard cap.
        @WithDefault("PT2M")
        Duration quietWindow();

        @WithDefault("PT10M")
        Duration maxDelay();

        // Messages per Expo push call (Expo accepts at most 100).
        @WithDefault("100")
        @Min(1)
        @Max(100)
        int batchSize();

        // How long after sending a ticket its receipt is fetched.
        @WithDefault("PT15M")
        Duration receiptDelay();

        Optional<String> expoAccessToken();
    }

    interface Mail {
        // The SMTP account's monthly allowance, shown on the operator's volume page and enforced before an invite.
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

        // Users considered per sweep.
        @WithDefault("200")
        @Min(1)
        @Max(5000)
        int batchSize();
    }

    interface Logto {
        URI endpoint();

        Optional<String> webhookSigningKey();

        // Organization role ids in the Klokka Logto (docs/INFRA.md section 4); assigned on create and invite.
        String employerRoleId();

        String employeeRoleId();
    }

    // Google Maps Platform for job locations (CHQ-156). The key is server-side only; absent means the places
    // operations answer 503 MAPS_NOT_CONFIGURED and jobs are saved without locations.
    interface Maps {
        Optional<String> apiKey();

        // Map images kept on disk so a card seen twice costs Google one request.
        @WithDefault("2000")
        @Min(1)
        @Max(100000)
        int imageCacheMax();

        // Suggestions returned per keystroke and places listed as recent.
        @WithDefault("5")
        @Min(1)
        @Max(5)
        int suggestions();

        @WithDefault("8")
        @Min(1)
        @Max(50)
        int recentPlaces();
    }

    // Job reminders (CHQ-156): the sweep runs every minute; a reminder whose moment passed more than `grace`
    // ago is not sent late (a job added after its reminder time gets none).
    interface Reminders {
        @WithDefault("PT10M")
        Duration grace();

        @WithDefault("500")
        @Min(1)
        @Max(10000)
        int batchSize();
    }

    interface It {
        // -Dklokka.it.logto=true runs LogtoStagingTest against the real staging Logto with the M2M credentials.
        @WithDefault("false")
        boolean logto();
    }

    interface Operator {
        // The three deployments probed by GET /operator/health; absent means "not probed".
        Optional<URI> apiUrl();

        Optional<URI> landingUrl();

        @WithDefault("PT3S")
        Duration probeTimeout();
    }
}
