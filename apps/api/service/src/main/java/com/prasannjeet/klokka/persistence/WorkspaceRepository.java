package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.domain.WorkspaceId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;
import java.util.UUID;

// Workspace rows. Every method takes the WorkspaceId it works in (ArchitectureTest enforces this).
@ApplicationScoped
public class WorkspaceRepository implements PanacheRepositoryBase<WorkspaceEntity, UUID> {

    public Optional<WorkspaceEntity> findWorkspace(WorkspaceId workspaceId) {
        return findByIdOptional(workspaceId.value());
    }

    public void persistWorkspace(WorkspaceId workspaceId, WorkspaceEntity workspace) {
        if (!workspaceId.value().equals(workspace.id)) {
            throw new IllegalArgumentException("workspace id mismatch: " + workspaceId + " vs " + workspace.id);
        }
        persist(workspace);
    }
}
