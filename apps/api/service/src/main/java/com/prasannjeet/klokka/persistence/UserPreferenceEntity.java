package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.JobReminderLead;
import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.contract.model.ThemePreference;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

// Per-user (not per-workspace) preferences: language for every notification (D2), push, digest, theme.
@Entity
@Table(name = "user_preference")
public class UserPreferenceEntity {

    @Id
    @Column(name = "logto_user_id", length = 64)
    public String userId;

    @Convert(converter = LanguageConverter.class)
    @Column(nullable = false, length = 2)
    public Language language;

    @Column(name = "push_enabled", nullable = false)
    public boolean pushEnabled;

    @Column(name = "digest_enabled", nullable = false)
    public boolean digestEnabled;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 6)
    public ThemePreference theme;

    // CHQ-156: a push before each job with a start time, this long before it.
    @Column(name = "job_reminders", nullable = false)
    public boolean jobReminders = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_reminder_lead", nullable = false, length = 10)
    public JobReminderLead jobReminderLead = JobReminderLead.HOUR_1;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;
}
