package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.contract.model.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// A person's place in one workspace: the row the API authorizes from (D1). userId is null until the invitation
// is accepted; hours can already be logged against an INVITED membership.
@Entity
@Table(name = "membership")
public class MembershipEntity {

    @Id
    public UUID id;

    @Column(name = "workspace_id", nullable = false)
    public UUID workspaceId;

    @Column(name = "logto_user_id", length = 64)
    public String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    public Role role;

    @Column(name = "display_name", nullable = false, length = 80)
    public String displayName;

    @Column(nullable = false, length = 254)
    public String email;

    @Column(name = "avatar_emoji", length = 16)
    public String avatarEmoji;

    @Column(name = "hourly_rate", precision = 10, scale = 2)
    public BigDecimal hourlyRate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 11)
    public MemberStatus status;

    @Column(name = "invitation_token", length = 128)
    public String invitationToken;

    @Column(name = "invitation_sent_at")
    public Instant invitationSentAt;

    @Column(name = "invitation_expires_at")
    public Instant invitationExpiresAt;

    @Column(name = "invitation_resend_count", nullable = false)
    public int invitationResendCount;

    @Column(name = "invited_at", nullable = false)
    public Instant invitedAt;

    @Column(name = "joined_at")
    public Instant joinedAt;

    @Column(name = "deactivated_at")
    public Instant deactivatedAt;
}
