package com.prasannjeet.klokka.arch.fixture;

import java.util.List;
import java.util.UUID;

// Positive control for ArchitectureTest.workspaceRepositoryRule: a repository method without a WorkspaceId.
public class LeakyRepository {

    public List<UUID> findEverything() {
        return List.of();
    }
}
