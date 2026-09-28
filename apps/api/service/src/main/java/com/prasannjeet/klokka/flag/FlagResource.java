package com.prasannjeet.klokka.flag;

import com.prasannjeet.klokka.contract.api.FlagsApi;
import com.prasannjeet.klokka.contract.model.Flag;
import com.prasannjeet.klokka.contract.model.FlagCreate;
import com.prasannjeet.klokka.contract.model.FlagResolve;
import com.prasannjeet.klokka.contract.model.FlagStatus;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import java.util.List;
import java.util.UUID;

// /workspaces/{id}/flags (CHQ-135).
@Authenticated
public class FlagResource implements FlagsApi {

    @Inject
    FlagService service;

    @Override
    public List<Flag> listFlags(UUID workspaceId, FlagStatus status) {
        return service.list(workspaceId, status);
    }

    @Override
    public Flag raiseFlag(UUID workspaceId, UUID entryId, FlagCreate flagCreate) {
        return service.raise(workspaceId, entryId, flagCreate);
    }

    @Override
    public Flag resolveFlag(UUID workspaceId, UUID flagId, FlagResolve flagResolve) {
        return service.resolve(workspaceId, flagId, flagResolve);
    }
}
