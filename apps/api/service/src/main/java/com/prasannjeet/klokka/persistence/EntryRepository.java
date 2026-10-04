package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.EntryChangeKind;
import com.prasannjeet.klokka.domain.WorkspaceId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

// Live and deleted hour entries plus their history rows, always inside one workspace (ArchitectureTest).
@ApplicationScoped
public class EntryRepository implements PanacheRepositoryBase<HourEntryEntity, UUID> {

    public Optional<HourEntryEntity> findLive(WorkspaceId workspaceId, UUID membershipId, LocalDate date) {
        return find("workspaceId = ?1 and membershipId = ?2 and workDate = ?3 and deletedAt is null",
                workspaceId.value(), membershipId, date).firstResultOptional();
    }

    // The live day, row-locked until the transaction ends: two job writes on one day queue up, so the day's
    // total is always computed from every committed job (CHQ-156).
    public Optional<HourEntryEntity> findLiveForUpdate(WorkspaceId workspaceId, UUID membershipId, LocalDate date) {
        return find("workspaceId = ?1 and membershipId = ?2 and workDate = ?3 and deletedAt is null",
                workspaceId.value(), membershipId, date).withLock(LockModeType.PESSIMISTIC_WRITE).firstResultOptional();
    }

    public void lockEntry(WorkspaceId workspaceId, HourEntryEntity entry) {
        requireWorkspace(workspaceId, entry.workspaceId);
        getEntityManager().lock(entry, LockModeType.PESSIMISTIC_WRITE);
        getEntityManager().refresh(entry);
    }

    public Optional<HourEntryEntity> findEntry(WorkspaceId workspaceId, UUID entryId) {
        return find("workspaceId = ?1 and id = ?2", workspaceId.value(), entryId).firstResultOptional();
    }

    public List<HourEntryEntity> listLive(WorkspaceId workspaceId, UUID membershipId, LocalDate from, LocalDate to) {
        if (membershipId == null) {
            return list("workspaceId = ?1 and workDate between ?2 and ?3 and deletedAt is null "
                    + "order by membershipId, workDate", workspaceId.value(), from, to);
        }
        return list("workspaceId = ?1 and membershipId = ?2 and workDate between ?3 and ?4 and deletedAt is null "
                + "order by workDate", workspaceId.value(), membershipId, from, to);
    }

    public long countLiveInMonth(WorkspaceId workspaceId, LocalDate from, LocalDate to) {
        return count("workspaceId = ?1 and workDate between ?2 and ?3 and deletedAt is null",
                workspaceId.value(), from, to);
    }

    public boolean hasLiveEntries(WorkspaceId workspaceId, UUID membershipId) {
        return count("workspaceId = ?1 and membershipId = ?2 and deletedAt is null", workspaceId.value(), membershipId) > 0;
    }

    public void persistEntry(WorkspaceId workspaceId, HourEntryEntity entry) {
        requireWorkspace(workspaceId, entry.workspaceId);
        persist(entry);
    }

    public void persistChange(WorkspaceId workspaceId, HourEntryChangeEntity change) {
        requireWorkspace(workspaceId, change.workspaceId);
        em().persist(change);
    }

    public List<HourEntryChangeEntity> listChanges(WorkspaceId workspaceId, UUID entryId) {
        return em().createQuery("select c from HourEntryChangeEntity c where c.workspaceId = :w and c.entryId = :e "
                        + "order by c.changedAt desc, c.seq desc", HourEntryChangeEntity.class)
                .setParameter("w", workspaceId.value())
                .setParameter("e", entryId)
                .getResultList();
    }

    public Map<UUID, Long> changeCounts(WorkspaceId workspaceId, List<UUID> entryIds) {
        if (entryIds.isEmpty()) return Map.of();
        return em().createQuery("select c.entryId, count(c) from HourEntryChangeEntity c "
                        + "where c.workspaceId = :w and c.entryId in :ids group by c.entryId", Object[].class)
                .setParameter("w", workspaceId.value())
                .setParameter("ids", entryIds)
                .getResultStream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
    }

    public long countChangesOfKinds(WorkspaceId workspaceId, List<EntryChangeKind> kinds) {
        return em().createQuery("select count(c) from HourEntryChangeEntity c where c.workspaceId = :w and c.kind in :k",
                        Long.class)
                .setParameter("w", workspaceId.value())
                .setParameter("k", kinds)
                .getSingleResult();
    }

    // Sum of live hours per member in [from, to].
    public Map<UUID, BigDecimal> hoursPerMember(WorkspaceId workspaceId, LocalDate from, LocalDate to) {
        return em().createQuery("select e.membershipId, sum(e.hours) from HourEntryEntity e where e.workspaceId = :w "
                        + "and e.workDate between :f and :t and e.deletedAt is null group by e.membershipId", Object[].class)
                .setParameter("w", workspaceId.value())
                .setParameter("f", from)
                .setParameter("t", to)
                .getResultStream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (BigDecimal) row[1]));
    }

    public Map<UUID, Long> daysPerMember(WorkspaceId workspaceId, LocalDate from, LocalDate to) {
        return em().createQuery("select e.membershipId, count(e) from HourEntryEntity e where e.workspaceId = :w "
                        + "and e.workDate between :f and :t and e.deletedAt is null group by e.membershipId", Object[].class)
                .setParameter("w", workspaceId.value())
                .setParameter("f", from)
                .setParameter("t", to)
                .getResultStream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
    }

    public Map<UUID, LocalDate> lastEntryDates(WorkspaceId workspaceId) {
        return em().createQuery("select e.membershipId, max(e.workDate) from HourEntryEntity e where e.workspaceId = :w "
                        + "and e.deletedAt is null group by e.membershipId", Object[].class)
                .setParameter("w", workspaceId.value())
                .getResultStream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (LocalDate) row[1]));
    }

    // Sum of live hours per day in [from, to] for one member, or the whole workspace when membershipId is null.
    public Map<LocalDate, BigDecimal> hoursPerDay(WorkspaceId workspaceId, UUID membershipId, LocalDate from, LocalDate to) {
        String jpql = "select e.workDate, sum(e.hours) from HourEntryEntity e where e.workspaceId = :w "
                + (membershipId == null ? "" : "and e.membershipId = :m ")
                + "and e.workDate between :f and :t and e.deletedAt is null group by e.workDate";
        var query = em().createQuery(jpql, Object[].class)
                .setParameter("w", workspaceId.value())
                .setParameter("f", from)
                .setParameter("t", to);
        if (membershipId != null) query.setParameter("m", membershipId);
        return query.getResultStream().collect(Collectors.toMap(row -> (LocalDate) row[0], row -> (BigDecimal) row[1]));
    }

    // Distinct members with a live entry on one day.
    public long membersLoggedOn(WorkspaceId workspaceId, LocalDate date) {
        return em().createQuery("select count(distinct e.membershipId) from HourEntryEntity e where e.workspaceId = :w "
                        + "and e.workDate = :d and e.deletedAt is null", Long.class)
                .setParameter("w", workspaceId.value())
                .setParameter("d", date)
                .getSingleResult();
    }

    // Which days of the week (1 = Monday .. 7 = Sunday) the workspace has ever logged on.
    public List<Integer> weekdaysEverLogged(WorkspaceId workspaceId) {
        return em().createNativeQuery("select distinct extract(isodow from work_date)::int from hour_entry "
                        + "where workspace_id = :w and deleted_at is null", Integer.class)
                .setParameter("w", workspaceId.value())
                .getResultList();
    }

    public Optional<LocalDate> lastActivity(WorkspaceId workspaceId) {
        return em().createQuery("select max(e.workDate) from HourEntryEntity e where e.workspaceId = :w and e.deletedAt is null",
                        LocalDate.class)
                .setParameter("w", workspaceId.value())
                .getResultStream().filter(java.util.Objects::nonNull).findFirst();
    }

    private static void requireWorkspace(WorkspaceId workspaceId, UUID rowWorkspaceId) {
        if (!workspaceId.value().equals(rowWorkspaceId)) {
            throw new IllegalArgumentException("row is not in workspace " + workspaceId);
        }
    }

    private EntityManager em() {
        return getEntityManager();
    }
}
