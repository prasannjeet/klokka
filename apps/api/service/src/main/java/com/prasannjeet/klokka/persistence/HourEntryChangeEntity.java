package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.EntryChangeKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// One history row per change to an entry, flag events included (CHQ-119).
@Entity
@Table(name = "hour_entry_change")
public class HourEntryChangeEntity {

    @Id
    public UUID id;

    @Column(name = "workspace_id", nullable = false)
    public UUID workspaceId;

    @Column(name = "entry_id", nullable = false)
    public UUID entryId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 14)
    public EntryChangeKind kind;

    @Column(name = "hours_before", precision = 5, scale = 2)
    public BigDecimal hoursBefore;

    @Column(name = "hours_after", precision = 5, scale = 2)
    public BigDecimal hoursAfter;

    @Column(name = "note_before", length = 500)
    public String noteBefore;

    @Column(name = "note_after", length = 500)
    public String noteAfter;

    @Column(name = "flag_id")
    public UUID flagId;

    @Column(name = "changed_by", nullable = false, length = 64)
    public String changedBy;

    @Column(name = "changed_at", nullable = false)
    public Instant changedAt;

    // Database identity: the order of rows that share a changedAt (never written by the application).
    @Column(insertable = false, updatable = false)
    public Long seq;
}
