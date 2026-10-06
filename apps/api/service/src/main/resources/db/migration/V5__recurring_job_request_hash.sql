-- CHQ-162: a series' retry key compares a SHA-256 of the canonical JSON request instead of the model's toString().
-- The old text cannot be turned into a hash, so rows from V4 keep a NULL hash: a replay of such a request is refused as
-- "already used for a different request" (never a second series; the unique request_id would refuse that anyway).
ALTER TABLE job_recurrence ADD COLUMN request_hash varchar(64) CHECK (request_hash ~ '^[0-9a-f]{64}$');
-- request_payload stays (nullable, no longer written) so v1.4.0, which still maps it, can be rolled back to; a later
-- release drops it once rolling back past this one is no longer needed.
ALTER TABLE job_recurrence ALTER COLUMN request_payload DROP NOT NULL;
