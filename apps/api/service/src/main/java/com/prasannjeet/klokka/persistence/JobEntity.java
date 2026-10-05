package com.prasannjeet.klokka.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

// One piece of a member's day (CHQ-156). The day's hour_entry holds the sum of its jobs; jobs are hard deleted
// (the entry's history keeps the totals). A location is name + point, or nothing (CHECK in V3).
@Entity
@Table(name = "job")
public class JobEntity {

    @Id
    public UUID id;

    @Column(name = "workspace_id", nullable = false)
    public UUID workspaceId;

    @Column(name = "entry_id", nullable = false)
    public UUID entryId;

    @ManyToOne
    @JoinColumn(name = "recurrence_id")
    public JobRecurrenceEntity recurrence;

    @Column(nullable = false)
    public int position;

    @Column(nullable = false, precision = 5, scale = 2)
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

    @Column(name = "created_by", nullable = false, length = 64)
    public String createdBy;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "updated_by", nullable = false, length = 64)
    public String updatedBy;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;
}
