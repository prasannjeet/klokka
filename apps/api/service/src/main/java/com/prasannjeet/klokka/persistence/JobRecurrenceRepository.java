package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.domain.WorkspaceId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JobRecurrenceRepository implements PanacheRepositoryBase<JobRecurrenceEntity, UUID> {

    public record OpenSeries(WorkspaceId workspaceId, UUID id) {}

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

    // The links between the parts of a series split by schedule changes (CHQ-187), read as ids only, so the parts
    // are first loaded by the locking select. Null for the series' first part.
    public UUID previousIdOf(WorkspaceId workspaceId, UUID id) {
        List<UUID> rows = getEntityManager().createQuery("select r.previousId from JobRecurrenceEntity r "
                        + "where r.workspaceId = :w and r.id = :id", UUID.class)
                .setParameter("w", workspaceId.value())
                .setParameter("id", id)
                .getResultList();
        if (rows.isEmpty()) throw new IllegalStateException("series " + id + " does not exist in workspace " + workspaceId.value());
        return rows.getFirst();
    }

    // The parts that continue this one; at most one, since only a running part is split and splitting stops it.
    public List<UUID> successorIdsOf(WorkspaceId workspaceId, UUID id) {
        return getEntityManager().createQuery("select r.id from JobRecurrenceEntity r "
                        + "where r.workspaceId = :w and r.previousId = :id", UUID.class)
                .setParameter("w", workspaceId.value())
                .setParameter("id", id)
                .getResultList();
    }

    public JobRecurrenceEntity lockSeries(WorkspaceId workspaceId, UUID id) {
        return find("workspaceId = ?1 and id = ?2", workspaceId.value(), id)
                .withLock(LockModeType.PESSIMISTIC_WRITE).firstResult();
    }

    public void persistSeries(WorkspaceId workspaceId, JobRecurrenceEntity row) {
        if (!workspaceId.value().equals(row.workspaceId)) throw new IllegalArgumentException("series workspaceId");
        persist(row);
    }

    // The nightly RecurrenceExtender's batch, across workspaces (the one exemption from the WorkspaceId rule in
    // ArchitectureTest): open, running series planned through a date before `bound`, least planned first. Series that
    // cannot be extended (a deactivated member, or a workspace without an active employer to write as) are left
    // out, so they cannot hold the front of the queue night after night.
    public List<OpenSeries> openSeriesBefore(LocalDate bound, int limit) {
        return getEntityManager().createQuery("select r.workspaceId, r.id from JobRecurrenceEntity r, MembershipEntity m "
                        + "where m.workspaceId = r.workspaceId and m.id = r.membershipId and r.openEnded = true "
                        + "and r.stopped = false and r.endDate < :bound and m.status <> :deactivated "
                        + "and exists (select 1 from MembershipEntity e where e.workspaceId = r.workspaceId "
                        + "and e.role = :employer and e.status = :active) order by r.endDate, r.id", Object[].class)
                .setParameter("bound", bound)
                .setParameter("deactivated", MemberStatus.DEACTIVATED)
                .setParameter("employer", Role.EMPLOYER)
                .setParameter("active", MemberStatus.ACTIVE)
                .setMaxResults(limit)
                .getResultStream()
                .map(row -> new OpenSeries(WorkspaceId.of((UUID) row[0]), (UUID) row[1]))
                .toList();
    }

    // Empty when another transaction holds the row (an employer editing the series); the next run picks it up.
    @SuppressWarnings("unchecked")
    public Optional<JobRecurrenceEntity> lockSeriesSkipLocked(WorkspaceId workspaceId, UUID id) {
        List<JobRecurrenceEntity> rows = getEntityManager()
                .createNativeQuery("select * from job_recurrence where workspace_id = :w and id = :id for update skip locked",
                        JobRecurrenceEntity.class)
                .setParameter("w", workspaceId.value())
                .setParameter("id", id)
                .getResultList();
        return rows.stream().findFirst();
    }
}
