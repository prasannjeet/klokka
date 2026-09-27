package com.prasannjeet.klokka.domain;

import java.util.Objects;
import java.util.UUID;

// A workspace's id as a type of its own, so every repository method that reads or writes inside a workspace must
// take one: the ArchUnit rule in ArchitectureTest checks for this parameter type, which a bare UUID could not
// express. Isolation lives in three layers: this parameter, the composite foreign keys, and the membership check.
public record WorkspaceId(UUID value) {

    public WorkspaceId {
        Objects.requireNonNull(value, "workspaceId");
    }

    public static WorkspaceId of(UUID value) {
        return new WorkspaceId(value);
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
