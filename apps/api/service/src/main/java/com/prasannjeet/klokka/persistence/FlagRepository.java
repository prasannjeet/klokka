package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.FlagStatus;
import com.prasannjeet.klokka.domain.WorkspaceId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

// Entry flags inside one workspace.
@ApplicationScoped
public class FlagRepository implements PanacheRepositoryBase<EntryFlagEntity, UUID> {

    public Optional<EntryFlagEntity> findFlag(WorkspaceId workspaceId, UUID flagId) {
        return find("workspaceId = ?1 and id = ?2", workspaceId.value(), flagId).firstResultOptional();
    }

    public Optional<EntryFlagEntity> findOpenForEntry(WorkspaceId workspaceId, UUID entryId) {
        return find("workspaceId = ?1 and entryId = ?2 and status = ?3", workspaceId.value(), entryId, FlagStatus.OPEN)
                .firstResultOptional();
    }

    // Open first, then newest first; membershipId null means every member.
    public List<EntryFlagEntity> listFlags(WorkspaceId workspaceId, UUID membershipId, FlagStatus status) {
        StringBuilder q = new StringBuilder("workspaceId = ?1");
        java.util.List<Object> params = new java.util.ArrayList<>(List.of(workspaceId.value()));
        if (membershipId != null) {
            params.add(membershipId);
            q.append(" and membershipId = ?").append(params.size());
        }
        if (status != null) {
            params.add(status);
            q.append(" and status = ?").append(params.size());
        }
        q.append(" order by case when status = 'OPEN' then 0 else 1 end, createdAt desc");
        return list(q.toString(), params.toArray());
    }

    // The open flag, or else the latest flag, per entry.
    public Map<UUID, EntryFlagEntity> latestPerEntry(WorkspaceId workspaceId, List<UUID> entryIds) {
        if (entryIds.isEmpty()) return Map.of();
        List<EntryFlagEntity> flags = list("workspaceId = ?1 and entryId in ?2 order by createdAt", workspaceId.value(), entryIds);
        return flags.stream().collect(Collectors.toMap(f -> f.entryId, f -> f,
                (a, b) -> a.status == FlagStatus.OPEN ? a : b));
    }

    public long countOpen(WorkspaceId workspaceId, UUID membershipId) {
        if (membershipId == null) return count("workspaceId = ?1 and status = ?2", workspaceId.value(), FlagStatus.OPEN);
        return count("workspaceId = ?1 and membershipId = ?2 and status = ?3", workspaceId.value(), membershipId, FlagStatus.OPEN);
    }

    public void persistFlag(WorkspaceId workspaceId, EntryFlagEntity flag) {
        if (!workspaceId.value().equals(flag.workspaceId)) throw new IllegalArgumentException("flag is not in workspace " + workspaceId);
        persist(flag);
    }
}
