package com.prasannjeet.klokka.persistence;

import static com.prasannjeet.klokka.contract.model.JobRecurrenceRule.FrequencyEnum.MONTHLY;

import com.prasannjeet.klokka.contract.model.JobRecurrence;
import com.prasannjeet.klokka.contract.model.JobRecurrenceRule;
import com.prasannjeet.klokka.contract.model.JobRecurrenceRule.FrequencyEnum;
import com.prasannjeet.klokka.contract.model.Weekday;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "job_recurrence")
public class JobRecurrenceEntity {
    @Id
    public UUID id;
    @Column(name = "workspace_id", nullable = false)
    public UUID workspaceId;
    @Column(name = "request_id", nullable = false)
    public UUID requestId;
    @Column(name = "membership_id", nullable = false)
    public UUID membershipId;
    @Column(name = "first_date", nullable = false)
    public LocalDate firstDate;
    @Column(name = "end_date", nullable = false)
    public LocalDate endDate;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    public FrequencyEnum frequency;
    @Column(name = "repeat_interval", nullable = false)
    public int interval;
    // Monday first; empty or null for MONTHLY (NULL in the column).
    @Convert(converter = WeekdaysConverter.class)
    @Column(length = 100)
    public Set<Weekday> weekdays = EnumSet.noneOf(Weekday.class);
    @Column(name = "last_day_of_month", nullable = false)
    public boolean lastDayOfMonth;
    @Column(name = "period_count")
    public Integer periodCount;
    @Column(name = "occurrence_count", nullable = false)
    public int occurrenceCount;
    @Column(name = "last_date", nullable = false)
    public LocalDate lastDate;
    public boolean stopped;
    // SHA-256 hex of the canonical request (JobRequestHash); NULL on series created before V5.
    @Column(name = "request_hash", length = 64)
    public String requestHash;
    @Column(name = "first_entry_id")
    public UUID firstEntryId;
    @Column(name = "created_by", nullable = false)
    public String createdBy;
    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    public JobRecurrence view() {
        JobRecurrenceRule rule = new JobRecurrenceRule()
                .frequency(frequency).interval(interval);
        if (weekdays != null && !weekdays.isEmpty()) rule.weekdays(EnumSet.copyOf(weekdays));
        if (frequency == MONTHLY) rule.lastDayOfMonth(lastDayOfMonth);
        if (periodCount == null) rule.endDate(endDate);
        else rule.periodCount(periodCount);
        return new JobRecurrence().id(id).firstDate(firstDate).recurrence(rule).endDate(endDate)
                .occurrenceCount(occurrenceCount).lastDate(lastDate).stopped(stopped);
    }
}
