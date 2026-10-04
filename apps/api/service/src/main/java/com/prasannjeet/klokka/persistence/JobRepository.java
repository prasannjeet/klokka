package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.domain.WorkspaceId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

// The jobs of a workspace's days (CHQ-156), always inside one workspace (ArchitectureTest).
@ApplicationScoped
public class JobRepository implements PanacheRepositoryBase<JobEntity, UUID> {

    // Display order: by start time (jobs without one last), then the order they were added.
    private static final String ORDER = "order by startTime nulls last, position, createdAt";

    public Optional<JobEntity> findJob(WorkspaceId workspaceId, UUID jobId) {
        return find("workspaceId = ?1 and id = ?2", workspaceId.value(), jobId).firstResultOptional();
    }

    public List<JobEntity> listForEntry(WorkspaceId workspaceId, UUID entryId) {
        return list("workspaceId = ?1 and entryId = ?2 " + ORDER, workspaceId.value(), entryId);
    }

    // Every entry id present as a key, in display order; entries without jobs map to an empty list.
    public Map<UUID, List<JobEntity>> listForEntries(WorkspaceId workspaceId, List<UUID> entryIds) {
        Map<UUID, List<JobEntity>> out = new LinkedHashMap<>();
        for (UUID id : entryIds) out.put(id, new ArrayList<>());
        if (entryIds.isEmpty()) return out;
        for (JobEntity job : list("workspaceId = ?1 and entryId in ?2 " + ORDER, workspaceId.value(), entryIds)) {
            out.get(job.entryId).add(job);
        }
        return out;
    }

    public int nextPosition(WorkspaceId workspaceId, UUID entryId) {
        Integer max = getEntityManager()
                .createQuery("select max(j.position) from JobEntity j where j.workspaceId = :w and j.entryId = :e", Integer.class)
                .setParameter("w", workspaceId.value())
                .setParameter("e", entryId)
                .getSingleResult();
        return max == null ? 0 : max + 1;
    }

    public void persistJob(WorkspaceId workspaceId, JobEntity job) {
        requireWorkspace(workspaceId, job.workspaceId);
        persist(job);
    }

    public void deleteJob(WorkspaceId workspaceId, JobEntity job) {
        requireWorkspace(workspaceId, job.workspaceId);
        delete(job);
    }

    public long deleteForEntry(WorkspaceId workspaceId, UUID entryId) {
        return delete("workspaceId = ?1 and entryId = ?2", workspaceId.value(), entryId);
    }

    // The places on this workspace's jobs, most recently used first, one row per place.
    public List<JobEntity> recentPlaces(WorkspaceId workspaceId, int limit) {
        List<JobEntity> out = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        // Bounded scan: the newest jobs with a place, enough to find `limit` distinct ones in practice.
        for (JobEntity job : find("workspaceId = ?1 and placeName is not null order by updatedAt desc", workspaceId.value())
                .page(0, limit * 10).list()) {
            String key = job.placeId != null ? job.placeId : job.placeName + "|" + job.latitude + "|" + job.longitude;
            if (seen.add(key)) out.add(job);
            if (out.size() == limit) break;
        }
        return out;
    }

    // A job of this workspace at this point (to five decimals, what the map proxy uses).
    public boolean hasPlaceAt(WorkspaceId workspaceId, java.math.BigDecimal latitude, java.math.BigDecimal longitude) {
        java.math.BigDecimal tolerance = new java.math.BigDecimal("0.000006");
        return count("workspaceId = ?1 and latitude between ?2 and ?3 and longitude between ?4 and ?5", workspaceId.value(),
                latitude.subtract(tolerance), latitude.add(tolerance), longitude.subtract(tolerance), longitude.add(tolerance)) > 0;
    }

    private static void requireWorkspace(WorkspaceId workspaceId, UUID rowWorkspaceId) {
        if (!workspaceId.value().equals(rowWorkspaceId)) {
            throw new IllegalArgumentException("row is not in workspace " + workspaceId);
        }
    }
}
