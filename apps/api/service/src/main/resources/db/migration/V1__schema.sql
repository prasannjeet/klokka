-- Klokka schema, baseline. The brief's data model (docs/PRODUCT_BRIEF.md) with the corrections from
-- docs/research/backend-and-infra.md section 3: soft-deleted entries, composite workspace foreign keys so a
-- child row can never point into another workspace, push tokens keyed by (provider, token), a per-user
-- preference table, month lock history, and unique job rows (digest_run, push_delivery) for idempotent jobs.
-- Enumerations are varchar + CHECK (not Postgres enum types) so Hibernate's schema validation and Flyway stay
-- simple; the allowed values mirror the enums in openapi.yaml.

-- ---------------------------------------------------------------- identity and preferences
CREATE TABLE app_user (
    logto_user_id   varchar(64)  PRIMARY KEY,
    email           varchar(254) CHECK (email = lower(email)),
    display_name    varchar(80)  NOT NULL,
    avatar_emoji    varchar(16),
    created_at      timestamptz  NOT NULL DEFAULT now(),
    last_seen_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE user_preference (
    logto_user_id   varchar(64)  PRIMARY KEY REFERENCES app_user (logto_user_id) ON DELETE CASCADE,
    language        varchar(2)   NOT NULL DEFAULT 'sv' CHECK (language IN ('sv', 'en')),
    push_enabled    boolean      NOT NULL DEFAULT true,
    digest_enabled  boolean      NOT NULL DEFAULT false,
    theme           varchar(6)   NOT NULL DEFAULT 'SYSTEM' CHECK (theme IN ('SYSTEM', 'LIGHT', 'DARK')),
    updated_at      timestamptz  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- workspaces and members
CREATE TABLE workspace (
    id                uuid         PRIMARY KEY,
    name              varchar(80)  NOT NULL,
    slug              varchar(100) NOT NULL UNIQUE,
    logto_org_id      varchar(64)  NOT NULL UNIQUE,
    country           varchar(2),
    currency          varchar(3)   NOT NULL,
    timezone          varchar(64)  NOT NULL,
    week_start        varchar(6)   NOT NULL DEFAULT 'MONDAY' CHECK (week_start IN ('MONDAY', 'SUNDAY')),
    show_pay          boolean      NOT NULL DEFAULT false,
    rounding          varchar(7)   NOT NULL DEFAULT 'NONE' CHECK (rounding IN ('NONE', 'QUARTER', 'HALF')),
    default_day_hours numeric(4,2) NOT NULL DEFAULT 8 CHECK (default_day_hours > 0 AND default_day_hours <= 24),
    colour            varchar(8)   NOT NULL DEFAULT 'PRIMARY'
                      CHECK (colour IN ('PRIMARY', 'BLUE', 'GREEN', 'PURPLE', 'YELLOW', 'INK')),
    emoji             varchar(16)  NOT NULL,
    created_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE membership (
    id                      uuid         PRIMARY KEY,
    workspace_id            uuid         NOT NULL REFERENCES workspace (id),
    logto_user_id           varchar(64)  REFERENCES app_user (logto_user_id),
    role                    varchar(8)   NOT NULL CHECK (role IN ('EMPLOYER', 'EMPLOYEE')),
    display_name            varchar(80)  NOT NULL,
    email                   varchar(254) NOT NULL CHECK (email = lower(email)),
    avatar_emoji            varchar(16),
    hourly_rate             numeric(10,2) CHECK (hourly_rate >= 0),
    status                  varchar(11)  NOT NULL CHECK (status IN ('INVITED', 'ACTIVE', 'DEACTIVATED')),
    logto_invitation_id     varchar(64),
    invitation_token        varchar(128) UNIQUE,
    invitation_sent_at      timestamptz,
    invitation_expires_at   timestamptz,
    invitation_resend_count integer      NOT NULL DEFAULT 0,
    invited_at              timestamptz  NOT NULL DEFAULT now(),
    joined_at               timestamptz,
    deactivated_at          timestamptz,
    UNIQUE (workspace_id, id),
    UNIQUE (workspace_id, email),
    UNIQUE (workspace_id, logto_user_id)
);
CREATE INDEX membership_user_ix ON membership (logto_user_id);

-- ---------------------------------------------------------------- hours
CREATE TABLE hour_entry (
    id            uuid         PRIMARY KEY,
    workspace_id  uuid         NOT NULL,
    membership_id uuid         NOT NULL,
    work_date     date         NOT NULL,
    hours         numeric(5,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
    note          varchar(500),
    created_by    varchar(64)  NOT NULL,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_by    varchar(64)  NOT NULL,
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    deleted_by    varchar(64),
    deleted_at    timestamptz,
    UNIQUE (workspace_id, id),
    FOREIGN KEY (workspace_id, membership_id) REFERENCES membership (workspace_id, id)
);
-- One live entry per member and day; deleted rows stay for history and notifications.
CREATE UNIQUE INDEX hour_entry_live_uk ON hour_entry (membership_id, work_date) WHERE deleted_at IS NULL;
CREATE INDEX hour_entry_workspace_date_ix ON hour_entry (workspace_id, work_date) WHERE deleted_at IS NULL;

CREATE TABLE hour_entry_change (
    id           uuid         PRIMARY KEY,
    workspace_id uuid         NOT NULL,
    entry_id     uuid         NOT NULL,
    kind         varchar(14)  NOT NULL
                 CHECK (kind IN ('CREATED', 'UPDATED', 'DELETED', 'FLAGGED', 'FLAG_FIXED', 'FLAG_DISMISSED')),
    hours_before numeric(5,2),
    hours_after  numeric(5,2),
    note_before  varchar(500),
    note_after   varchar(500),
    flag_id      uuid,
    changed_by   varchar(64)  NOT NULL,
    changed_at   timestamptz  NOT NULL DEFAULT now(),
    FOREIGN KEY (workspace_id, entry_id) REFERENCES hour_entry (workspace_id, id)
);
CREATE INDEX hour_entry_change_entry_ix ON hour_entry_change (entry_id, changed_at DESC);

CREATE TABLE entry_flag (
    id               uuid         PRIMARY KEY,
    workspace_id     uuid         NOT NULL,
    entry_id         uuid         NOT NULL,
    membership_id    uuid         NOT NULL,
    raised_by        varchar(64)  NOT NULL,
    reason           varchar(6)   NOT NULL CHECK (reason IN ('MORE', 'LESS', 'NOT_IN')),
    message          varchar(500) NOT NULL,
    logged_hours     numeric(5,2) NOT NULL,
    suggested_hours  numeric(5,2) CHECK (suggested_hours >= 0 AND suggested_hours <= 24),
    status           varchar(9)   NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FIXED', 'DISMISSED')),
    resolution_hours numeric(5,2),
    resolution_note  varchar(500),
    resolved_by      varchar(64),
    resolved_at      timestamptz,
    created_at       timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, id),
    FOREIGN KEY (workspace_id, entry_id) REFERENCES hour_entry (workspace_id, id),
    FOREIGN KEY (workspace_id, membership_id) REFERENCES membership (workspace_id, id)
);
-- One open flag per entry.
CREATE UNIQUE INDEX entry_flag_open_uk ON entry_flag (entry_id) WHERE status = 'OPEN';
CREATE INDEX entry_flag_workspace_ix ON entry_flag (workspace_id, status, created_at DESC);

-- ---------------------------------------------------------------- month locks (history kept)
CREATE TABLE month_lock (
    id           uuid        PRIMARY KEY,
    workspace_id uuid        NOT NULL REFERENCES workspace (id),
    year_month   date        NOT NULL CHECK (extract(day FROM year_month) = 1),
    locked_by    varchar(64) NOT NULL,
    locked_at    timestamptz NOT NULL DEFAULT now(),
    unlocked_by  varchar(64),
    unlocked_at  timestamptz
);
-- At most one active lock per workspace and month; unlocked rows remain as history.
CREATE UNIQUE INDEX month_lock_active_uk ON month_lock (workspace_id, year_month) WHERE unlocked_at IS NULL;

-- ---------------------------------------------------------------- notifications and push
CREATE TABLE notification (
    id            uuid         PRIMARY KEY,
    logto_user_id varchar(64)  NOT NULL REFERENCES app_user (logto_user_id) ON DELETE CASCADE,
    workspace_id  uuid         REFERENCES workspace (id),
    kind          varchar(16)  NOT NULL CHECK (kind IN ('HOURS_CHANGED', 'INVITE_ACCEPTED', 'ENTRY_FLAGGED',
                                                        'FLAG_RESOLVED', 'MONTH_CLOSED', 'MONTH_REOPENED')),
    payload       jsonb        NOT NULL,
    coalesce_key  varchar(200),
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    read_at       timestamptz,
    push_due_at   timestamptz,
    pushed_at     timestamptz
);
CREATE INDEX notification_user_ix ON notification (logto_user_id, created_at DESC);
CREATE INDEX notification_unread_ix ON notification (logto_user_id, workspace_id) WHERE read_at IS NULL;
-- One open coalescing bucket per key ("one notification per sitting"); closed once pushed.
CREATE UNIQUE INDEX notification_coalesce_uk ON notification (coalesce_key) WHERE pushed_at IS NULL AND coalesce_key IS NOT NULL;
CREATE INDEX notification_push_due_ix ON notification (push_due_at) WHERE pushed_at IS NULL AND push_due_at IS NOT NULL;

CREATE TABLE push_token (
    provider      varchar(8)   NOT NULL DEFAULT 'EXPO' CHECK (provider IN ('EXPO')),
    token         varchar(200) NOT NULL,
    logto_user_id varchar(64)  NOT NULL REFERENCES app_user (logto_user_id) ON DELETE CASCADE,
    platform      varchar(7)   NOT NULL CHECK (platform IN ('ANDROID', 'IOS')),
    device_name   varchar(80),
    created_at    timestamptz  NOT NULL DEFAULT now(),
    last_seen_at  timestamptz  NOT NULL DEFAULT now(),
    disabled_at   timestamptz,
    PRIMARY KEY (provider, token)
);
CREATE INDEX push_token_user_ix ON push_token (logto_user_id) WHERE disabled_at IS NULL;

CREATE TABLE push_delivery (
    ticket_id          varchar(64)  PRIMARY KEY,
    notification_id    uuid         NOT NULL REFERENCES notification (id) ON DELETE CASCADE,
    provider           varchar(8)   NOT NULL DEFAULT 'EXPO',
    token              varchar(200) NOT NULL,
    status             varchar(16)  NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'FAILED')),
    error_code         varchar(64),
    sent_at            timestamptz  NOT NULL DEFAULT now(),
    receipt_checked_at timestamptz
);
CREATE INDEX push_delivery_pending_ix ON push_delivery (sent_at) WHERE receipt_checked_at IS NULL;

-- ---------------------------------------------------------------- email
CREATE TABLE digest_run (
    logto_user_id varchar(64) NOT NULL REFERENCES app_user (logto_user_id) ON DELETE CASCADE,
    iso_week      char(8)     NOT NULL,
    sent_at       timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (logto_user_id, iso_week)
);

-- Every email the API sends, for the operator's quota figure and for bounce tracking.
CREATE TABLE email_log (
    id           uuid         PRIMARY KEY,
    kind         varchar(12)  NOT NULL CHECK (kind IN ('INVITATION', 'VERIFICATION', 'DIGEST', 'OTHER')),
    recipient    varchar(254) NOT NULL,
    workspace_id uuid         REFERENCES workspace (id),
    status       varchar(8)   NOT NULL CHECK (status IN ('SENT', 'FAILED', 'BOUNCED')),
    error        text,
    sent_at      timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX email_log_month_ix ON email_log (sent_at);
