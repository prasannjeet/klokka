-- CHQ-191: a job's optional title, shown as its main label (the place becomes the second line). Additive and nullable,
-- so v1.7.0 keeps running on V8 and a rollback stays a tag pin. job_recurrence carries it in the series template.

ALTER TABLE job ADD COLUMN title varchar(120);
ALTER TABLE job_recurrence ADD COLUMN title varchar(120);
