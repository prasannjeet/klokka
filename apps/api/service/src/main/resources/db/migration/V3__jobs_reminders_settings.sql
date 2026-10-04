-- CHQ-156: a day's entry becomes the roll-up of its jobs. Each job has hours, an optional start time (local, in the
-- workspace time zone), an optional location (from Google Places through the API) and an optional note.
-- hour_entry keeps hours = the sum of its jobs, so flags, month locks, history and every total are unchanged.
-- Additive only: no existing column changes meaning, every live entry gets one job with its hours and note.

CREATE TABLE job (
    id            uuid         PRIMARY KEY,
    workspace_id  uuid         NOT NULL,
    entry_id      uuid         NOT NULL,
    position      integer      NOT NULL CHECK (position >= 0),
    hours         numeric(5,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
    start_time    time,
    note          varchar(500),
    place_id      varchar(300),
    place_name    varchar(200),
    place_address varchar(300),
    latitude      numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
    longitude     numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
    created_by    varchar(64)  NOT NULL,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_by    varchar(64)  NOT NULL,
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, id),
    FOREIGN KEY (workspace_id, entry_id) REFERENCES hour_entry (workspace_id, id),
    -- A location is all three (name and point) or nothing.
    CHECK ((place_name IS NULL) = (latitude IS NULL) AND (latitude IS NULL) = (longitude IS NULL))
);
CREATE INDEX job_entry_ix ON job (entry_id, position);
CREATE INDEX job_recent_place_ix ON job (workspace_id, updated_at DESC) WHERE place_name IS NOT NULL;
CREATE INDEX job_start_ix ON job (start_time) WHERE start_time IS NOT NULL;

INSERT INTO job (id, workspace_id, entry_id, position, hours, note, created_by, created_at, updated_by, updated_at)
SELECT gen_random_uuid(), e.workspace_id, e.id, 0, e.hours, e.note, e.created_by, e.created_at, e.updated_by, e.updated_at
FROM hour_entry e
WHERE e.deleted_at IS NULL;

-- One reminder per job and start instant: moving a job's start gets a new reminder, a sweep that runs twice does
-- not send twice.
CREATE TABLE job_reminder (
    workspace_id uuid        NOT NULL,
    job_id       uuid        NOT NULL,
    starts_at    timestamptz NOT NULL,
    sent_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (job_id, starts_at),
    FOREIGN KEY (workspace_id, job_id) REFERENCES job (workspace_id, id) ON DELETE CASCADE
);

-- Workspace settings (both default to the behaviour before CHQ-156).
ALTER TABLE workspace ADD COLUMN notify_flag_declined boolean NOT NULL DEFAULT true;
ALTER TABLE workspace ADD COLUMN employees_see_insights boolean NOT NULL DEFAULT true;

-- Job reminders, per person.
ALTER TABLE user_preference ADD COLUMN job_reminders boolean NOT NULL DEFAULT true;
ALTER TABLE user_preference ADD COLUMN job_reminder_lead varchar(10) NOT NULL DEFAULT 'HOUR_1'
    CHECK (job_reminder_lead IN ('MINUTES_15', 'MINUTES_30', 'HOUR_1', 'HOURS_2', 'DAY_BEFORE'));

ALTER TABLE notification DROP CONSTRAINT notification_kind_check;
ALTER TABLE notification ADD CONSTRAINT notification_kind_check CHECK (kind IN ('HOURS_CHANGED', 'INVITE_ACCEPTED',
    'ENTRY_FLAGGED', 'FLAG_RESOLVED', 'MONTH_CLOSED', 'MONTH_REOPENED', 'JOB_REMINDER'));
