-- CHQ-186, CHQ-187, CHQ-188: monthly series repeat on a chosen day or on the nth weekday of the month, a series may
-- have no end date (open-ended: planned a rolling horizon ahead and topped up nightly), a series remembers the values
-- new jobs are planned with (its template) and the series it was split from, and employees get a "Job updates"
-- preference for the new JOB_CHANGED notification. Additive only: every existing row keeps its meaning.

ALTER TABLE job_recurrence ADD COLUMN monthly_by varchar(20) NOT NULL DEFAULT 'DAY_OF_MONTH'
    CHECK (monthly_by IN ('DAY_OF_MONTH', 'WEEKDAY_OF_MONTH'));
-- 31 means the last day of the month; any day is clamped in shorter months.
ALTER TABLE job_recurrence ADD COLUMN day_of_month integer CHECK (day_of_month BETWEEN 1 AND 31);
ALTER TABLE job_recurrence ADD COLUMN week_of_month varchar(10)
    CHECK (week_of_month IN ('FIRST', 'SECOND', 'THIRD', 'FOURTH', 'LAST'));
ALTER TABLE job_recurrence ADD COLUMN month_weekday varchar(10)
    CHECK (month_weekday IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'));
-- An open-ended series keeps end_date (NOT NULL) as the date its jobs are planned through.
ALTER TABLE job_recurrence ADD COLUMN open_ended boolean NOT NULL DEFAULT false;
-- A schedule change that keeps earlier jobs splits the series: the new row points at the one it replaced.
ALTER TABLE job_recurrence ADD COLUMN previous_id uuid;
ALTER TABLE job_recurrence ADD CONSTRAINT job_recurrence_previous_fk FOREIGN KEY (workspace_id, previous_id)
    REFERENCES job_recurrence (workspace_id, id);

-- The template: the values new jobs of the series are planned with (same rules as job).
ALTER TABLE job_recurrence ADD COLUMN hours numeric(5,2) CHECK (hours >= 0 AND hours <= 24);
ALTER TABLE job_recurrence ADD COLUMN start_time time;
ALTER TABLE job_recurrence ADD COLUMN note varchar(500);
ALTER TABLE job_recurrence ADD COLUMN place_id varchar(300);
ALTER TABLE job_recurrence ADD COLUMN place_name varchar(200);
ALTER TABLE job_recurrence ADD COLUMN place_address varchar(300);
ALTER TABLE job_recurrence ADD COLUMN latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90);
ALTER TABLE job_recurrence ADD COLUMN longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180);
-- A location is all three (name and point) or nothing.
ALTER TABLE job_recurrence ADD CONSTRAINT job_recurrence_place_check
    CHECK ((place_name IS NULL) = (latitude IS NULL) AND (latitude IS NULL) = (longitude IS NULL));

-- Monthly series created before V6 repeat on a day of the month: the last day, or the first date's day.
UPDATE job_recurrence
SET day_of_month = CASE WHEN last_day_of_month THEN 31 ELSE extract(day FROM first_date)::integer END
WHERE frequency = 'MONTHLY';

-- Each existing series takes its template from its earliest live job. A fully removed series has none and keeps a
-- NULL template, so hours stays nullable; only open-ended series (all created after V6) are planned ahead.
UPDATE job_recurrence r
SET hours = t.hours, start_time = t.start_time, note = t.note, place_id = t.place_id, place_name = t.place_name,
    place_address = t.place_address, latitude = t.latitude, longitude = t.longitude
FROM (
    SELECT DISTINCT ON (j.workspace_id, j.recurrence_id)
           j.workspace_id, j.recurrence_id, j.hours, j.start_time, j.note, j.place_id, j.place_name, j.place_address,
           j.latitude, j.longitude
    FROM job j
    JOIN hour_entry e ON e.workspace_id = j.workspace_id AND e.id = j.entry_id
    WHERE j.recurrence_id IS NOT NULL AND e.deleted_at IS NULL
    ORDER BY j.workspace_id, j.recurrence_id, e.work_date, j.position
) t
WHERE r.workspace_id = t.workspace_id AND r.id = t.recurrence_id;

-- The nightly top-up reads open, running series by how far they are planned.
CREATE INDEX job_recurrence_open_ix ON job_recurrence (end_date) WHERE open_ended AND NOT stopped;

-- CHQ-188: push for job updates, per person, on by default (also for everyone who exists today).
ALTER TABLE user_preference ADD COLUMN job_updates boolean NOT NULL DEFAULT true;

ALTER TABLE notification DROP CONSTRAINT notification_kind_check;
ALTER TABLE notification ADD CONSTRAINT notification_kind_check CHECK (kind IN ('HOURS_CHANGED', 'INVITE_ACCEPTED',
    'ENTRY_FLAGGED', 'FLAG_RESOLVED', 'MONTH_CLOSED', 'MONTH_REOPENED', 'JOB_REMINDER', 'JOB_CHANGED'));
