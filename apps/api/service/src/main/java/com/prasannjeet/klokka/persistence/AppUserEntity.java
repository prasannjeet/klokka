package com.prasannjeet.klokka.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

// A person who has signed in at least once. Identity lives in Logto; this row holds what Klokka needs to show
// and to notify. Plain JPA (no Panache base class): only repositories touch Panache, see ArchitectureTest.
@Entity
@Table(name = "app_user")
public class AppUserEntity {

    @Id
    @Column(name = "logto_user_id", length = 64)
    public String id;

    @Column(length = 254)
    public String email;

    @Column(name = "display_name", nullable = false, length = 80)
    public String displayName;

    @Column(name = "avatar_emoji", length = 16)
    public String avatarEmoji;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "last_seen_at", nullable = false)
    public Instant lastSeenAt;
}
