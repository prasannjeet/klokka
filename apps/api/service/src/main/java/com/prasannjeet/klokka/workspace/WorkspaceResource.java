package com.prasannjeet.klokka.workspace;

import com.prasannjeet.klokka.contract.api.WorkspacesApi;
import com.prasannjeet.klokka.contract.model.Workspace;
import com.prasannjeet.klokka.contract.model.WorkspaceCreate;
import com.prasannjeet.klokka.contract.model.WorkspaceUpdate;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import java.util.UUID;

// /workspaces (CHQ-112, CHQ-127): create, read, settings.
@Authenticated
public class WorkspaceResource implements WorkspacesApi {

    @Inject
    WorkspaceService service;

    @Override
    public Workspace createWorkspace(WorkspaceCreate workspaceCreate) {
        return service.create(workspaceCreate);
    }

    @Override
    public Workspace getWorkspace(UUID workspaceId) {
        return service.get(workspaceId);
    }

    @Override
    public Workspace updateWorkspace(UUID workspaceId, WorkspaceUpdate workspaceUpdate) {
        return service.update(workspaceId, workspaceUpdate);
    }
}
