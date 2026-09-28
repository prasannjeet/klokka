package com.prasannjeet.klokka.logto;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.health.HealthCheck;
import io.smallrye.health.api.Wellness;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.jboss.logging.Logger;

// Logto reachability as a wellness check (/q/health/well) and a log line at startup. Deliberately not readiness:
// the API serves hours without Logto, so an outage there must never take the pod out of rotation or fail the boot.
@Wellness
@ApplicationScoped
public class LogtoHealth implements HealthCheck {

    private static final Logger LOG = Logger.getLogger(LogtoHealth.class);

    @Inject
    LogtoService logto;

    void onStart(@Observes StartupEvent event) {
        LogtoService.SelfCheck check = logto.selfCheck();
        if (check.reachable()) LOG.infof("Logto Management API reachable (%d ms)", check.latencyMs());
        else LOG.warnf("Logto Management API NOT reachable at startup: %s (workspace creation and invitations will fail until it is)", check.detail());
    }

    @Override
    public HealthCheckResponse call() {
        LogtoService.SelfCheck check = logto.selfCheck();
        return HealthCheckResponse.named("logto")
                .status(check.reachable())
                .withData("latencyMs", check.latencyMs())
                .withData("detail", check.detail())
                .build();
    }
}
