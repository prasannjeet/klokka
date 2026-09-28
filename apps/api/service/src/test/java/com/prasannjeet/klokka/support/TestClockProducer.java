package com.prasannjeet.klokka.support;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;

// Replaces ClockProducer's @DefaultBean in tests: one MutableClock the whole suite (and the application) shares.
@ApplicationScoped
public class TestClockProducer {

    private final MutableClock clock = new MutableClock();

    @Produces
    @ApplicationScoped
    public MutableClock clock() {
        return clock;
    }
}
