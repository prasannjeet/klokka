package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.domain.WorkspaceId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JobRecurrenceRepository implements PanacheRepositoryBase<JobRecurrenceEntity, UUID> {
    public Optional<JobRecurrenceEntity> findRequest(WorkspaceId workspaceId, UUID id) {
        return find("workspaceId = ?1 and requestId = ?2", workspaceId.value(), id).firstResultOptional();
    }

    // The series of these ids in this workspace, by id, in one select.
    public Map<UUID, JobRecurrenceEntity> byIds(WorkspaceId workspaceId, Collection<UUID> ids) {
        Map<UUID, JobRecurrenceEntity> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        for (JobRecurrenceEntity row : list("workspaceId = ?1 and id in ?2", workspaceId.value(), ids)) out.put(row.id, row);
        return out;
    }

    public JobRecurrenceEntity lockSeries(WorkspaceId workspaceId, UUID id) {
        return find("workspaceId = ?1 and id = ?2", workspaceId.value(), id)
                .withLock(LockModeType.PESSIMISTIC_WRITE).firstResult();
    }

    public void persistSeries(WorkspaceId workspaceId, JobRecurrenceEntity row) {
        if (!workspaceId.value().equals(row.workspaceId)) throw new IllegalArgumentException("series workspaceId");
        persist(row);
    }
}
