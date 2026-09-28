package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.NotificationKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

// One in-app item, also the push queue: pushDueAt says when the sweeper may send it, pushedAt closes the row.
// HOURS_CHANGED rows carry a coalesceKey while open so a sitting's changes merge into one row.
@Entity
@Table(name = "notification")
public class NotificationEntity {

    @Id
    public UUID id;

    @Column(name = "logto_user_id", nullable = false, length = 64)
    public String userId;

    @Column(name = "workspace_id")
    public UUID workspaceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public NotificationKind kind;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    public String payload;

    @Column(name = "coalesce_key", length = 200)
    public String coalesceKey;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @Column(name = "read_at")
    public Instant readAt;

    @Column(name = "push_due_at")
    public Instant pushDueAt;

    @Column(name = "pushed_at")
    public Instant pushedAt;
}
