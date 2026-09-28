package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.domain.WorkspaceId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;
import java.util.UUID;

// Workspace rows. Every method takes the WorkspaceId it works in (ArchitectureTest enforces this); the slug
// check takes the id of the workspace being created so the rule holds there too.
@ApplicationScoped
public class WorkspaceRepository implements PanacheRepositoryBase<WorkspaceEntity, UUID> {

    public Optional<WorkspaceEntity> findWorkspace(WorkspaceId workspaceId) {
        return findByIdOptional(workspaceId.value());
    }

    public boolean slugTaken(WorkspaceId workspaceId, String slug) {
        return count("slug = ?1 and id <> ?2", slug, workspaceId.value()) > 0;
    }

    public void persistWorkspace(WorkspaceId workspaceId, WorkspaceEntity workspace) {
        if (!workspaceId.value().equals(workspace.id)) {
            throw new IllegalArgumentException("workspace id mismatch: " + workspaceId + " vs " + workspace.id);
        }
        persist(workspace);
    }

    // Flushes so a constraint violation surfaces here, inside the caller's compensation scope.
    public void flushNow(WorkspaceId workspaceId) {
        getEntityManager().flush();
    }
}
