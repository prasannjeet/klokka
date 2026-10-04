package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.error.KlokkaException.notFound;
import static com.prasannjeet.klokka.error.KlokkaException.validation;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.auth.WorkspaceAccess;
import com.prasannjeet.klokka.contract.model.Entry;
import com.prasannjeet.klokka.contract.model.JobWrite;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.HourEntryEntity;
import com.prasannjeet.klokka.persistence.JobEntity;
import com.prasannjeet.klokka.persistence.JobRepository;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

// The jobs of a day (CHQ-156). Every write goes through EntryWriter, which keeps the day's entry the sum of its jobs.
@ApplicationScoped
public class JobService {

    @Inject
    WorkspaceAccess access;

    @Inject
    EntryWriter writer;

    @Inject
    EntryService entryService;

    @Inject
    EntryRepository entries;

    @Inject
    JobRepository jobs;

    @Transactional
    public Entry create(UUID workspaceId, UUID membershipId, LocalDate date, JobWrite body) {
        Access a = access.employer(workspaceId);
        MembershipEntity target = access.target(a, membershipId);
        EntryWriter.Outcome outcome = writer.createJob(a, target, date, input(a, body));
        return entryService.view(a, outcome.entry(), target);
    }

    @Transactional
    public Entry update(UUID workspaceId, UUID jobId, JobWrite body) {
        Access a = access.employer(workspaceId);
        JobEntity job = jobs.findJob(a.workspaceId(), jobId).orElseThrow(() -> notFound("Job " + jobId));
        HourEntryEntity entry = liveEntry(a, job);
        MembershipEntity target = access.target(a, entry.membershipId);
        EntryWriter.Outcome outcome = writer.updateJob(a, target, entry, job, input(a, body));
        return entryService.view(a, outcome.entry(), target);
    }

    @Transactional
    public void delete(UUID workspaceId, UUID jobId) {
        Access a = access.employer(workspaceId);
        JobEntity job = jobs.findJob(a.workspaceId(), jobId).orElseThrow(() -> notFound("Job " + jobId));
        HourEntryEntity entry = liveEntry(a, job);
        writer.deleteJob(a, access.target(a, entry.membershipId), entry, job);
    }

    private HourEntryEntity liveEntry(Access a, JobEntity job) {
        return entries.findEntry(a.workspaceId(), job.entryId).filter(e -> e.deletedAt == null)
                .orElseThrow(() -> notFound("Job " + job.id));
    }

    private static EntryWriter.JobInput input(Access a, JobWrite body) {
        BigDecimal hours = HoursRounding.apply(body.getHours(), a.workspace().rounding, "hours");
        if (hours.signum() == 0) throw validation("hours", "rounds to 0 under the workspace rule");
        LocalTime start = body.getStartTime() == null ? null : LocalTime.parse(body.getStartTime());
        return new EntryWriter.JobInput(hours, start, body.getNote(), body.getLocation());
    }

}
