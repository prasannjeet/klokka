package com.prasannjeet.klokka.flag;

import static com.prasannjeet.klokka.error.KlokkaException.notImplemented;

import com.prasannjeet.klokka.contract.api.FlagsApi;
import com.prasannjeet.klokka.contract.model.Flag;
import com.prasannjeet.klokka.contract.model.FlagCreate;
import com.prasannjeet.klokka.contract.model.FlagResolve;
import com.prasannjeet.klokka.contract.model.FlagStatus;
import io.quarkus.security.Authenticated;
import java.util.List;
import java.util.UUID;

// E7 (CHQ-135): 501 NOT_IMPLEMENTED until then.
@Authenticated
public class FlagResource implements FlagsApi {

    @Override
    public List<Flag> listFlags(UUID workspaceId, FlagStatus status) {
        throw notImplemented("listFlags");
    }

    @Override
    public Flag raiseFlag(UUID workspaceId, UUID entryId, FlagCreate flagCreate) {
        throw notImplemented("raiseFlag");
    }

    @Override
    public Flag resolveFlag(UUID workspaceId, UUID flagId, FlagResolve flagResolve) {
        throw notImplemented("resolveFlag");
    }
}
