package com.prasannjeet.klokka.arch.fixture;

// Positive control for ArchitectureTest.resourcesAreGuardedRule: a resource with no security annotation.
public class UnguardedResource {

    public String hello() {
        return "hello";
    }
}
