package com.prasannjeet.klokka.notification;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

// The job reminder sweep's queries (CHQ-156). Job-scoped by design (one sweep for every workspace), so it lives with
// the notification repositories. The start instant is the job's local date and time in its workspace's time zone.
@ApplicationScoped
public class JobReminderRepository {

    public record Due(UUID workspaceId, UUID jobId, UUID entryId, UUID membershipId, String userId, LocalDate date,
            LocalTime startTime, Instant startsAt, BigDecimal hours, String placeName, String placeAddress, String note,
            String lead) {}

    @Inject
    EntityManager em;

    // Jobs whose reminder moment is in (now - grace, now], that start after now, for active employees who want
    // reminders, and that have not been reminded for this start instant. Bounded and oldest first.
    @SuppressWarnings("unchecked")
    public List<Due> due(Instant now, Duration grace, int limit) {
        List<Object[]> rows = em.createNativeQuery("""
                select * from (
                    select j.workspace_id, j.id as job_id, e.id as entry_id, e.membership_id, m.logto_user_id, e.work_date,
                           j.start_time, (e.work_date + j.start_time) at time zone w.timezone as starts_at, j.hours,
                           j.place_name, j.place_address, j.note, p.job_reminder_lead,
                           case p.job_reminder_lead
                               when 'MINUTES_15' then interval '15 minutes'
                               when 'MINUTES_30' then interval '30 minutes'
                               when 'HOURS_2' then interval '2 hours'
                               when 'DAY_BEFORE' then interval '1 day'
                               else interval '1 hour' end as lead_interval
                    from job j
                    join hour_entry e on e.workspace_id = j.workspace_id and e.id = j.entry_id and e.deleted_at is null
                    join membership m on m.workspace_id = e.workspace_id and m.id = e.membership_id
                        and m.status = 'ACTIVE' and m.role = 'EMPLOYEE' and m.logto_user_id is not null
                    join user_preference p on p.logto_user_id = m.logto_user_id and p.job_reminders
                    join workspace w on w.id = j.workspace_id
                    where j.start_time is not null
                      and e.work_date between cast(:fromDate as date) and cast(:toDate as date)
                ) c
                where c.starts_at > :now
                  and c.starts_at - c.lead_interval <= :now
                  and c.starts_at - c.lead_interval > :since
                  and not exists (select 1 from job_reminder r where r.job_id = c.job_id and r.starts_at = c.starts_at)
                order by c.starts_at
                limit :limit
                """)
                .setParameter("fromDate", LocalDate.ofInstant(now, java.time.ZoneOffset.UTC).minusDays(1))
                .setParameter("toDate", LocalDate.ofInstant(now, java.time.ZoneOffset.UTC).plusDays(2))
                .setParameter("now", Timestamp.from(now))
                .setParameter("since", Timestamp.from(now.minus(grace)))
                .setParameter("limit", limit)
                .getResultList();
        return rows.stream().map(r -> new Due(
                (UUID) r[0], (UUID) r[1], (UUID) r[2], (UUID) r[3], (String) r[4],
                toDate(r[5]), toTime(r[6]), toInstant(r[7]), (BigDecimal) r[8],
                (String) r[9], (String) r[10], (String) r[11], (String) r[12])).toList();
    }

    // True when this call recorded the reminder (false: an earlier sweep already did).
    public boolean markSent(UUID workspaceId, UUID jobId, Instant startsAt, Instant now) {
        return em.createNativeQuery("insert into job_reminder (workspace_id, job_id, starts_at, sent_at) "
                        + "values (:w, :j, :s, :n) on conflict do nothing")
                .setParameter("w", workspaceId)
                .setParameter("j", jobId)
                .setParameter("s", Timestamp.from(startsAt))
                .setParameter("n", Timestamp.from(now))
                .executeUpdate() == 1;
    }

    private static LocalDate toDate(Object value) {
        return value instanceof java.sql.Date d ? d.toLocalDate() : (LocalDate) value;
    }

    private static LocalTime toTime(Object value) {
        return value instanceof java.sql.Time t ? t.toLocalTime() : (LocalTime) value;
    }

    private static Instant toInstant(Object value) {
        if (value instanceof Timestamp t) return t.toInstant();
        if (value instanceof java.time.OffsetDateTime o) return o.toInstant();
        return (Instant) value;
    }
}
