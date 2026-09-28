package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.FlagReason;
import com.prasannjeet.klokka.contract.model.FlagStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// An employee's objection to one entry; at most one OPEN per entry (entry_flag_open_uk).
@Entity
@Table(name = "entry_flag")
public class EntryFlagEntity {

    @Id
    public UUID id;

    @Column(name = "workspace_id", nullable = false)
    public UUID workspaceId;

    @Column(name = "entry_id", nullable = false)
    public UUID entryId;

    @Column(name = "membership_id", nullable = false)
    public UUID membershipId;

    @Column(name = "raised_by", nullable = false, length = 64)
    public String raisedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 6)
    public FlagReason reason;

    @Column(nullable = false, length = 500)
    public String message;

    @Column(name = "logged_hours", nullable = false, precision = 5, scale = 2)
    public BigDecimal loggedHours;

    @Column(name = "suggested_hours", precision = 5, scale = 2)
    public BigDecimal suggestedHours;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 9)
    public FlagStatus status;

    @Column(name = "resolution_hours", precision = 5, scale = 2)
    public BigDecimal resolutionHours;

    @Column(name = "resolution_note", length = 500)
    public String resolutionNote;

    @Column(name = "resolved_by", length = 64)
    public String resolvedBy;

    @Column(name = "resolved_at")
    public Instant resolvedAt;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;
}
