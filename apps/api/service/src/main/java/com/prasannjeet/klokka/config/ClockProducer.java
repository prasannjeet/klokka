package com.prasannjeet.klokka.config;

import io.quarkus.arc.DefaultBean;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import java.time.Clock;

// The one Clock, UTC. Injected everywhere time is read so tests can pin it with an alternative bean.
@ApplicationScoped
public class ClockProducer {

    @Produces
    @ApplicationScoped
    @DefaultBean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
