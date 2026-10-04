package com.prasannjeet.klokka.notification;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.entry.EntryViews;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.jboss.logging.Logger;

// Job reminders (CHQ-156): every minute, the jobs whose reminder moment has come get one JOB_REMINDER notification,
// pushed by the push sweeper like any other. The ledger row (job, start instant) makes a repeated sweep harmless;
// a reminder more than `grace` late is skipped rather than sent late.
@ApplicationScoped
public class JobReminderJob {

    private static final Logger LOG = Logger.getLogger(JobReminderJob.class);

    @Inject
    JobReminderRepository reminders;

    @Inject
    NotificationService notifications;

    @Inject
    EntityManager em;

    @Inject
    KlokkaConfig config;

    @Inject
    Clock clock;

    @Scheduled(every = "1m", identity = "job-reminders", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduledSweep() {
        int sent = sweep();
        if (sent > 0) LOG.infof("job reminders: %d sent", sent);
    }

    // Each reminder in its own transaction: one bad row is logged and skipped, the others still go out.
    public int sweep() {
        Instant now = clock.instant();
        List<JobReminderRepository.Due> due = QuarkusTransaction.requiringNew()
                .call(() -> reminders.due(now, config.reminders().grace(), config.reminders().batchSize()));
        int sent = 0;
        for (JobReminderRepository.Due d : due) {
            try {
                if (QuarkusTransaction.requiringNew().call(() -> send(d, now))) sent++;
            } catch (RuntimeException e) {
                LOG.errorf(e, "job reminder for job %s failed", d.jobId());
            }
        }
        return sent;
    }

    private boolean send(JobReminderRepository.Due d, Instant now) {
        if (!reminders.markSent(d.workspaceId(), d.jobId(), d.startsAt(), now)) return false;
        WorkspaceEntity workspace = em.find(WorkspaceEntity.class, d.workspaceId());
        notifications.jobReminder(workspace, d.userId(), d.membershipId(), d.entryId(), d.date(),
                d.startTime().format(EntryViews.HH_MM), d.hours(), d.placeName(), d.placeAddress(), d.note(), d.lead());
        return true;
    }
}
