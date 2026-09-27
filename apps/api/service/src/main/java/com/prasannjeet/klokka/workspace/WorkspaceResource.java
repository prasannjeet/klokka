package com.prasannjeet.klokka.workspace;

import static com.prasannjeet.klokka.error.KlokkaException.notImplemented;

import com.prasannjeet.klokka.contract.api.WorkspacesApi;
import com.prasannjeet.klokka.contract.model.Workspace;
import com.prasannjeet.klokka.contract.model.WorkspaceCreate;
import com.prasannjeet.klokka.contract.model.WorkspaceUpdate;
import io.quarkus.security.Authenticated;
import java.util.UUID;

// E1 (CHQ-112): every operation answers 501 NOT_IMPLEMENTED until then, so the contract compiles against the server.
@Authenticated
public class WorkspaceResource implements WorkspacesApi {

    @Override
    public Workspace createWorkspace(WorkspaceCreate workspaceCreate) {
        throw notImplemented("createWorkspace");
    }

    @Override
    public Workspace getWorkspace(UUID workspaceId) {
        throw notImplemented("getWorkspace");
    }

    @Override
    public Workspace updateWorkspace(UUID workspaceId, WorkspaceUpdate workspaceUpdate) {
        throw notImplemented("updateWorkspace");
    }
}
