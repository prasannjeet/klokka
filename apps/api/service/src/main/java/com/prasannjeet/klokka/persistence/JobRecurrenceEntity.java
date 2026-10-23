package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.JobRecurrenceRule.FrequencyEnum;
import com.prasannjeet.klokka.contract.model.MonthlyBy;
import com.prasannjeet.klokka.contract.model.WeekOfMonth;
import com.prasannjeet.klokka.contract.model.Weekday;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

// A series' rule columns are written and read through entry.RecurrencePattern (applyTo / of), its template through
// JobService; persistence stays independent of the entry package.
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
    // CHQ-186: the monthly mode; NOT NULL in the column, so a weekly row carries the default and ignores it.
    @Enumerated(EnumType.STRING)
    @Column(name = "monthly_by", nullable = false, length = 20)
    public MonthlyBy monthlyBy = MonthlyBy.DAY_OF_MONTH;
    // DAY_OF_MONTH: 1 to 31, 31 being the last day; NULL otherwise.
    @Column(name = "day_of_month")
    public Integer dayOfMonth;
    @Enumerated(EnumType.STRING)
    @Column(name = "week_of_month", length = 10)
    public WeekOfMonth weekOfMonth;
    @Enumerated(EnumType.STRING)
    @Column(name = "month_weekday", length = 10)
    public Weekday monthWeekday;
    // No end date: endDate is the date the jobs are planned through, moved on nightly by the RecurrenceExtender.
    @Column(name = "open_ended", nullable = false)
    public boolean openEnded;
    // The series this one was split from by a schedule change (CHQ-187).
    @Column(name = "previous_id")
    public UUID previousId;
    // The template: the values the series' next jobs are planned with. NULL hours only on a pre-V6 series that had
    // no live job left when V6 ran.
    @Column(precision = 5, scale = 2)
    public BigDecimal hours;
    @Column(name = "start_time")
    public LocalTime startTime;
    @Column(length = 500)
    public String note;
    @Column(name = "place_id", length = 300)
    public String placeId;
    @Column(name = "place_name", length = 200)
    public String placeName;
    @Column(name = "place_address", length = 300)
    public String placeAddress;
    @Column(precision = 9, scale = 6)
    public BigDecimal latitude;
    @Column(precision = 9, scale = 6)
    public BigDecimal longitude;
}
