-- CHQ-159: finite series materialise into ordinary jobs. Existing totals, history and reminders keep working.
CREATE TABLE job_recurrence (
    id uuid PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspace(id),
    request_id uuid NOT NULL,
    membership_id uuid NOT NULL,
    first_date date NOT NULL,
    end_date date NOT NULL CHECK (end_date >= first_date),
    frequency varchar(10) NOT NULL CHECK (frequency IN ('WEEKLY', 'MONTHLY')),
    repeat_interval integer NOT NULL CHECK (repeat_interval BETWEEN 1 AND 12),
    weekdays varchar(100),
    last_day_of_month boolean NOT NULL DEFAULT false,
    period_count integer CHECK (period_count BETWEEN 1 AND 120),
    occurrence_count integer NOT NULL CHECK (occurrence_count > 0),
    last_date date NOT NULL,
    stopped boolean NOT NULL DEFAULT false,
    request_payload text NOT NULL,
    first_entry_id uuid,
    created_by varchar(64) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, id),
    UNIQUE (workspace_id, request_id),
    FOREIGN KEY (workspace_id, membership_id) REFERENCES membership(workspace_id, id),
    FOREIGN KEY (workspace_id, first_entry_id) REFERENCES hour_entry(workspace_id, id)
);
ALTER TABLE job ADD COLUMN recurrence_id uuid;
ALTER TABLE job ADD CONSTRAINT job_recurrence_fk FOREIGN KEY (workspace_id, recurrence_id)
    REFERENCES job_recurrence(workspace_id, id);
CREATE INDEX job_recurrence_ix ON job(workspace_id, recurrence_id) WHERE recurrence_id IS NOT NULL;
