package com.prasannjeet.klokka.arch.fixture;

import io.quarkus.security.Authenticated;
import java.util.List;
import java.util.UUID;

// Positive control for ArchitectureTest.resourcesNeverTouchARepositoryRule: a resource holding a repository.
@Authenticated
public class LeakyResource {

    private final LeakyRepository repository = new LeakyRepository();

    public List<UUID> everything() {
        return repository.findEverything();
    }
}
