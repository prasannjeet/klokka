package com.prasannjeet.klokka.entry;

import com.prasannjeet.klokka.contract.api.EntriesApi;
import com.prasannjeet.klokka.contract.model.Entry;
import com.prasannjeet.klokka.contract.model.EntryBatchRequest;
import com.prasannjeet.klokka.contract.model.EntryBatchResult;
import com.prasannjeet.klokka.contract.model.EntryChange;
import com.prasannjeet.klokka.contract.model.EntryUpsert;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// /workspaces/{id}/entries and /members/{id}/entries/{date} (CHQ-117, CHQ-118, CHQ-119, CHQ-123).
@Authenticated
public class EntryResource implements EntriesApi {

    @Inject
    EntryService service;

    @Override
    public EntryBatchResult batchUpsertEntries(UUID workspaceId, EntryBatchRequest entryBatchRequest) {
        return service.batch(workspaceId, entryBatchRequest);
    }

    @Override
    public void deleteEntry(UUID workspaceId, UUID membershipId, LocalDate date) {
        service.delete(workspaceId, membershipId, date);
    }

    @Override
    public List<EntryChange> getEntryHistory(UUID workspaceId, UUID entryId) {
        return service.history(workspaceId, entryId);
    }

    @Override
    public List<Entry> listEntries(LocalDate from, LocalDate to, UUID workspaceId, UUID membershipId) {
        return service.list(workspaceId, from, to, membershipId);
    }

    @Override
    public Entry upsertEntry(UUID workspaceId, UUID membershipId, LocalDate date, EntryUpsert entryUpsert) {
        return service.upsert(workspaceId, membershipId, date, entryUpsert);
    }
}
