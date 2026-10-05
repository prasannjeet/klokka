package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.JobRecurrence;
import com.prasannjeet.klokka.contract.model.JobRecurrenceRule;
import com.prasannjeet.klokka.contract.model.Weekday;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.UUID;
import java.util.stream.Collectors;

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
    @Column(nullable = false)
    public String frequency;
    @Column(name = "repeat_interval", nullable = false)
    public int interval;
    public String weekdays;
    @Column(name = "last_day_of_month", nullable = false)
    public boolean lastDayOfMonth;
    @Column(name = "period_count")
    public Integer periodCount;
    @Column(name = "occurrence_count", nullable = false)
    public int occurrenceCount;
    @Column(name = "last_date", nullable = false)
    public LocalDate lastDate;
    public boolean stopped;
    @Column(name = "request_payload", nullable = false, columnDefinition = "text")
    public String requestPayload;
    @Column(name = "first_entry_id")
    public UUID firstEntryId;
    @Column(name = "created_by", nullable = false)
    public String createdBy;
    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    public JobRecurrence view() {
        JobRecurrenceRule rule = new JobRecurrenceRule()
                .frequency(JobRecurrenceRule.FrequencyEnum.fromValue(frequency)).interval(interval);
        if (weekdays != null) rule.weekdays(Arrays.stream(weekdays.split(",")).map(Weekday::fromValue).collect(Collectors.toSet()));
        if (frequency.equals("MONTHLY")) rule.lastDayOfMonth(lastDayOfMonth);
        if (periodCount == null) rule.endDate(endDate);
        else rule.periodCount(periodCount);
        return new JobRecurrence().id(id).firstDate(firstDate).recurrence(rule).endDate(endDate)
                .occurrenceCount(occurrenceCount).lastDate(lastDate).stopped(stopped);
    }
}
