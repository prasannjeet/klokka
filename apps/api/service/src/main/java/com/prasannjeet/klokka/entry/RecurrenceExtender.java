package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.contract.model.MemberStatus.ACTIVE;
import static com.prasannjeet.klokka.contract.model.MemberStatus.DEACTIVATED;
import static com.prasannjeet.klokka.contract.model.Role.EMPLOYER;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.persistence.JobRecurrenceEntity;
import com.prasannjeet.klokka.persistence.JobRecurrenceRepository;
import com.prasannjeet.klokka.persistence.JobRecurrenceRepository.OpenSeries;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import com.prasannjeet.klokka.persistence.WorkspaceRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.jboss.logging.Logger;

// The nightly top-up of open-ended series (CHQ-186): each open, running series gets the jobs between the date it
// is planned through and today + horizonMonths in its workspace, with the series' template values, written as its
// creator (or another active employer). No notification is written; jobs in closed months and on days that are
// already full (24 hours or the per-day job cap) are skipped. One bounded
// batch per run, each series in its own transaction and claimed with SKIP LOCKED, so a failing series is logged and
// the others still go ahead.
@ApplicationScoped
public class RecurrenceExtender {

    private static final Logger LOG = Logger.getLogger(RecurrenceExtender.class);

    @Inject
    JobRecurrenceRepository recurrences;

    @Inject
    WorkspaceRepository workspaces;

    @Inject
    MembershipRepository memberships;

    @Inject
    JobRecurrenceDates recurrenceDates;

    @Inject
    EntryWriter writer;

    @Inject
    KlokkaConfig config;

    @Inject
    Clock clock;

    @Scheduled(cron = "{klokka.recurrence.extend-cron}", identity = "recurrence-extender",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduledRun() {
        int extended = run();
        if (extended > 0) LOG.infof("recurrence extender: %d series extended", extended);
    }

    // Returns how many series moved their planned-through date.
    public int run() {
        // A workspace east of UTC may already be on the next day, so the bound reaches one day past UTC's horizon.
        LocalDate bound = recurrenceDates.horizon(LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC)).plusDays(1);
        List<OpenSeries> due = QuarkusTransaction.requiringNew()
                .call(() -> recurrences.openSeriesBefore(bound, config.recurrence().extendBatchSize()));
        int extended = 0;
        for (OpenSeries series : due) {
            try {
                if (QuarkusTransaction.requiringNew().call(() -> extend(series))) extended++;
            } catch (RuntimeException e) {
                LOG.errorf(e, "extending series %s failed; continuing with the next series", series.id());
            }
        }
        return extended;
    }

    private boolean extend(OpenSeries ref) {
        Optional<JobRecurrenceEntity> locked = recurrences.lockSeriesSkipLocked(ref.workspaceId(), ref.id());
        if (locked.isEmpty()) return false;
        JobRecurrenceEntity series = locked.get();
        if (!series.openEnded || series.stopped) return false;
        WorkspaceEntity workspace = workspaces.findWorkspace(ref.workspaceId()).orElse(null);
        if (workspace == null) return false;
        MembershipEntity target = memberships.findMember(ref.workspaceId(), series.membershipId).orElse(null);
        if (target == null || target.status == DEACTIVATED) {
            LOG.debugf("series %s: member gone or deactivated, not extended", series.id);
            return false;
        }
        LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneId.of(workspace.timezone));
        LocalDate horizon = recurrenceDates.horizon(today);
        if (!horizon.isAfter(series.endDate)) return false;
        Optional<Access> author = author(workspace, series);
        if (author.isEmpty()) {
            LOG.infof("series %s: the workspace has no active employer, not extended", series.id);
            return false;
        }
        // Never plan into the past, e.g. for a series whose member was deactivated for longer than the horizon.
        LocalDate from = series.endDate.isBefore(today) ? today : series.endDate.plusDays(1);
        List<LocalDate> dates = RecurrencePattern.of(series).datesBetween(from, horizon, config.recurrence().maxJobs());
        EntryWriter.SeriesWrite written = writer.createSeriesJobs(author.get(), target, dates, JobService.templateOf(series),
                series, EntryWriter.SeriesOptions.EXTEND);
        series.endDate = horizon;
        series.occurrenceCount += written.written();
        if (written.lastDate() != null) series.lastDate = written.lastDate();
        if (written.skippedClosed() + written.skippedFull() > 0) {
            LOG.debugf("series %s: %d jobs in closed months and %d on full days skipped", series.id, written.skippedClosed(),
                    written.skippedFull());
        }
        return true;
    }

    // The jobs are written as the series' creator while they are an active employer, else as another active employer.
    private Optional<Access> author(WorkspaceEntity workspace, JobRecurrenceEntity series) {
        WorkspaceId id = WorkspaceId.of(workspace.id);
        Optional<MembershipEntity> creator = memberships.findByUser(id, series.createdBy)
                .filter(m -> m.status == ACTIVE && m.role == EMPLOYER);
        Optional<MembershipEntity> employer = creator.isPresent() ? creator
                : memberships.listByStatus(id, List.of(ACTIVE)).stream().filter(m -> m.role == EMPLOYER).findFirst();
        return employer.map(m -> new Access(workspace, m));
    }
}
