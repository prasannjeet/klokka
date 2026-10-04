package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.Rounding;
import com.prasannjeet.klokka.contract.model.WeekStart;
import com.prasannjeet.klokka.contract.model.WorkspaceColour;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// One business. Mirrors a Logto organization (logtoOrgId); settings are what the employer changes in Settings.
@Entity
@Table(name = "workspace")
public class WorkspaceEntity {

    @Id
    public UUID id;

    @Column(nullable = false, length = 80)
    public String name;

    @Column(nullable = false, unique = true, length = 100)
    public String slug;

    @Column(name = "logto_org_id", nullable = false, unique = true, length = 64)
    public String logtoOrgId;

    @Column(length = 2)
    public String country;

    @Column(nullable = false, length = 3)
    public String currency;

    @Column(nullable = false, length = 64)
    public String timezone;

    @Enumerated(EnumType.STRING)
    @Column(name = "week_start", nullable = false, length = 6)
    public WeekStart weekStart;

    @Column(name = "show_pay", nullable = false)
    public boolean showPay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 7)
    public Rounding rounding;

    @Column(name = "default_day_hours", nullable = false, precision = 4, scale = 2)
    public BigDecimal defaultDayHours;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    public WorkspaceColour colour;

    @Column(nullable = false, length = 16)
    public String emoji;

    // CHQ-156: tell the employee when a flag is declined; let employees see their analysis.
    @Column(name = "notify_flag_declined", nullable = false)
    public boolean notifyFlagDeclined = true;

    @Column(name = "employees_see_insights", nullable = false)
    public boolean employeesSeeInsights = true;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;
}
