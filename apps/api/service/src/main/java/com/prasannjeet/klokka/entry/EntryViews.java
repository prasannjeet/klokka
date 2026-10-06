package com.prasannjeet.klokka.entry;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.contract.model.Actor;
import com.prasannjeet.klokka.contract.model.Entry;
import com.prasannjeet.klokka.contract.model.EntryChange;
import com.prasannjeet.klokka.contract.model.EntryFlagSummary;
import com.prasannjeet.klokka.contract.model.Job;
import com.prasannjeet.klokka.contract.model.JobLocation;
import com.prasannjeet.klokka.member.MemberViews;
import com.prasannjeet.klokka.persistence.EntryFlagEntity;
import com.prasannjeet.klokka.persistence.HourEntryChangeEntity;
import com.prasannjeet.klokka.persistence.HourEntryEntity;
import com.prasannjeet.klokka.persistence.JobEntity;
import com.prasannjeet.klokka.persistence.JobRecurrenceEntity;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.function.Function;

// Entities to contract shapes, with names looked up once per request through a small cache.
public final class EntryViews {

    private EntryViews() {}

    // Actor names come from the workspace's memberships (the person who logged is always a member).
    public static final class Names {
        private final MembershipRepository memberships;
        private final Access access;
        private final Map<String, String> byUser = new HashMap<>();
        private final Map<UUID, MembershipEntity> byMembership = new HashMap<>();

        public Names(MembershipRepository memberships, Access access) {
            this.memberships = memberships;
            this.access = access;
        }

        public Actor actor(String userId) {
            String name = byUser.computeIfAbsent(userId, id -> memberships.findByUser(access.workspaceId(), id)
                    .map(m -> m.displayName).orElse(id));
            return new Actor().userId(userId).name(name);
        }

        public MembershipEntity membership(UUID membershipId, Function<UUID, MembershipEntity> loader) {
            return byMembership.computeIfAbsent(membershipId, loader);
        }
    }

    public static Entry toEntry(Access access, HourEntryEntity e, MembershipEntity member, Names names, long changeCount,
            EntryFlagEntity flag, boolean locked, List<JobEntity> jobs, Map<UUID, JobRecurrenceEntity> series) {
        boolean rate = MemberViews.maySeeRate(access, member);
        Entry entry = new Entry()
                .id(e.id)
                .workspaceId(e.workspaceId)
                .membershipId(e.membershipId)
                .memberName(member.displayName)
                .workDate(e.workDate)
                .hours(e.hours)
                .note(e.note)
                .jobs(jobs.stream().map(j -> toJob(j, series)).toList())
                .earnings(rate ? MemberViews.earnings(e.hours, member.hourlyRate) : null)
                .hourlyRate(rate ? member.hourlyRate : null)
                .locked(locked)
                .createdAt(e.createdAt.atOffset(ZoneOffset.UTC))
                .createdBy(names.actor(e.createdBy))
                .updatedAt(e.updatedAt.atOffset(ZoneOffset.UTC))
                .updatedBy(names.actor(e.updatedBy))
                .changeCount((int) changeCount);
        if (flag != null) entry.flag(flagSummary(flag));
        return entry;
    }

    // The series ids the given days' jobs belong to, for one JobRecurrenceRepository.byIds call.
    public static Set<UUID> seriesIds(Collection<List<JobEntity>> dayJobs) {
        return dayJobs.stream().flatMap(List::stream).map(j -> j.recurrenceId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    // `series` holds every series a job here belongs to (the composite FK keeps it in the job's workspace).
    public static Job toJob(JobEntity j, Map<UUID, JobRecurrenceEntity> series) {
        Job job = new Job()
                .id(j.id)
                .hours(j.hours)
                .startTime(j.startTime == null ? null : j.startTime.format(HH_MM))
                .note(j.note)
                .createdAt(j.createdAt.atOffset(ZoneOffset.UTC))
                .updatedAt(j.updatedAt.atOffset(ZoneOffset.UTC));
        if (j.placeName != null) {
            job.location(new JobLocation().placeId(j.placeId).name(j.placeName).address(j.placeAddress)
                    .latitude(j.latitude).longitude(j.longitude));
        }
        if (j.recurrenceId != null) {
            JobRecurrenceEntity row = series.get(j.recurrenceId);
            if (row == null) throw new IllegalStateException("series " + j.recurrenceId + " of job " + j.id + " not loaded");
            job.recurrence(row.view());
        }
        return job;
    }

    public static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    public static EntryFlagSummary flagSummary(EntryFlagEntity flag) {
        return new EntryFlagSummary().id(flag.id).status(flag.status).reason(flag.reason).suggestedHours(flag.suggestedHours);
    }

    public static EntryChange toChange(HourEntryChangeEntity c, Names names) {
        return new EntryChange()
                .id(c.id)
                .entryId(c.entryId)
                .kind(c.kind)
                .hoursBefore(c.hoursBefore)
                .hoursAfter(c.hoursAfter)
                .noteBefore(c.noteBefore)
                .noteAfter(c.noteAfter)
                .flagId(c.flagId)
                .changedBy(names.actor(c.changedBy))
                .changedAt(c.changedAt.atOffset(ZoneOffset.UTC));
    }
}
