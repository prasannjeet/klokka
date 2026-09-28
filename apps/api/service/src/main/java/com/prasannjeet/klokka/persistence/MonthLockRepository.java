package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.domain.WorkspaceId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

// Month locks inside one workspace. The active lock is the row without unlockedAt.
@ApplicationScoped
public class MonthLockRepository implements PanacheRepositoryBase<MonthLockEntity, UUID> {

    public Optional<MonthLockEntity> findActive(WorkspaceId workspaceId, YearMonth month) {
        return find("workspaceId = ?1 and yearMonth = ?2 and unlockedAt is null", workspaceId.value(), month.atDay(1))
                .firstResultOptional();
    }

    public boolean isLocked(WorkspaceId workspaceId, YearMonth month) {
        return findActive(workspaceId, month).isPresent();
    }

    public List<LocalDate> lockedMonthsBetween(WorkspaceId workspaceId, LocalDate from, LocalDate to) {
        return list("workspaceId = ?1 and unlockedAt is null and yearMonth between ?2 and ?3",
                workspaceId.value(), from.withDayOfMonth(1), to.withDayOfMonth(1))
                .stream().map(l -> l.yearMonth).toList();
    }

    public void persistLock(WorkspaceId workspaceId, MonthLockEntity lock) {
        if (!workspaceId.value().equals(lock.workspaceId)) throw new IllegalArgumentException("lock is not in workspace " + workspaceId);
        persist(lock);
    }
}
