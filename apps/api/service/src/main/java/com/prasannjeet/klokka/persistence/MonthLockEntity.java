package com.prasannjeet.klokka.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

// A month lock; unlocked rows stay as history, month_lock_active_uk allows one active lock per month.
@Entity
@Table(name = "month_lock")
public class MonthLockEntity {

    @Id
    public UUID id;

    @Column(name = "workspace_id", nullable = false)
    public UUID workspaceId;

    @Column(name = "year_month", nullable = false)
    public LocalDate yearMonth;

    @Column(name = "locked_by", nullable = false, length = 64)
    public String lockedBy;

    @Column(name = "locked_at", nullable = false)
    public Instant lockedAt;

    @Column(name = "unlocked_by", length = 64)
    public String unlockedBy;

    @Column(name = "unlocked_at")
    public Instant unlockedAt;
}
