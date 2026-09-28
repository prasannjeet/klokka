package com.prasannjeet.klokka.support;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

// The test suite's Clock: fixed at a known Wednesday unless a test moves it (and moves it back).
public class MutableClock extends Clock {

    public static final Instant DEFAULT = Instant.parse("2026-09-23T12:00:00Z");

    private volatile Instant instant = DEFAULT;
    private final ZoneId zone;

    public MutableClock() {
        this(ZoneOffset.UTC);
    }

    private MutableClock(ZoneId zone) {
        this.zone = zone;
    }

    public void set(Instant instant) {
        this.instant = instant;
    }

    public void reset() {
        instant = DEFAULT;
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        MutableClock copy = new MutableClock(zone) {
            @Override
            public Instant instant() {
                return MutableClock.this.instant();
            }
        };
        return copy;
    }

    @Override
    public Instant instant() {
        return instant;
    }
}
