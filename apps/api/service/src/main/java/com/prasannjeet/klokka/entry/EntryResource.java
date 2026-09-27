package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.error.KlokkaException.notImplemented;

import com.prasannjeet.klokka.contract.api.EntriesApi;
import com.prasannjeet.klokka.contract.model.Entry;
import com.prasannjeet.klokka.contract.model.EntryBatchRequest;
import com.prasannjeet.klokka.contract.model.EntryBatchResult;
import com.prasannjeet.klokka.contract.model.EntryChange;
import com.prasannjeet.klokka.contract.model.EntryUpsert;
import io.quarkus.security.Authenticated;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// E2 (CHQ-117, CHQ-118, CHQ-119): 501 NOT_IMPLEMENTED until then.
@Authenticated
public class EntryResource implements EntriesApi {

    @Override
    public EntryBatchResult batchUpsertEntries(UUID workspaceId, EntryBatchRequest entryBatchRequest) {
        throw notImplemented("batchUpsertEntries");
    }

    @Override
    public void deleteEntry(UUID workspaceId, UUID membershipId, LocalDate date) {
        throw notImplemented("deleteEntry");
    }

    @Override
    public List<EntryChange> getEntryHistory(UUID workspaceId, UUID entryId) {
        throw notImplemented("getEntryHistory");
    }

    @Override
    public List<Entry> listEntries(LocalDate from, LocalDate to, UUID workspaceId, UUID membershipId) {
        throw notImplemented("listEntries");
    }

    @Override
    public Entry upsertEntry(UUID workspaceId, UUID membershipId, LocalDate date, EntryUpsert entryUpsert) {
        throw notImplemented("upsertEntry");
    }
}
