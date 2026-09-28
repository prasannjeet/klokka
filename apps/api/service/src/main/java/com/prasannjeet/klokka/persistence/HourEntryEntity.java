package com.prasannjeet.klokka.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

// One member's hours on one day. Soft deleted (deletedAt) so history and "hours removed" notifications keep the
// value; the partial unique index hour_entry_live_uk keeps one live row per (membership, day).
@Entity
@Table(name = "hour_entry")
public class HourEntryEntity {

    @Id
    public UUID id;

    @Column(name = "workspace_id", nullable = false)
    public UUID workspaceId;

    @Column(name = "membership_id", nullable = false)
    public UUID membershipId;

    @Column(name = "work_date", nullable = false)
    public LocalDate workDate;

    @Column(nullable = false, precision = 5, scale = 2)
    public BigDecimal hours;

    @Column(length = 500)
    public String note;

    @Column(name = "created_by", nullable = false, length = 64)
    public String createdBy;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "updated_by", nullable = false, length = 64)
    public String updatedBy;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @Column(name = "deleted_by", length = 64)
    public String deletedBy;

    @Column(name = "deleted_at")
    public Instant deletedAt;
}
