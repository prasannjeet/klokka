package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.domain.WorkspaceId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JobRecurrenceRepository implements PanacheRepositoryBase<JobRecurrenceEntity, UUID> {
    public Optional<JobRecurrenceEntity> findRequest(WorkspaceId workspaceId, UUID id) {
        return find("workspaceId = ?1 and requestId = ?2", workspaceId.value(), id).firstResultOptional();
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
