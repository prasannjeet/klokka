-- CHQ-109 / CHQ-113: the email ledger gets its final name (email_send) and the columns the invitation budget
-- needs; Logto webhook events get an idempotency table keyed by (hook_id, event, created_at).

ALTER TABLE email_log RENAME TO email_send;
ALTER INDEX email_log_month_ix RENAME TO email_send_month_ix;
ALTER TABLE email_send ADD COLUMN membership_id uuid;
ALTER TABLE email_send ADD COLUMN logto_user_id varchar(64);
CREATE INDEX email_send_membership_ix ON email_send (membership_id) WHERE membership_id IS NOT NULL;

CREATE TABLE webhook_event (
    hook_id     varchar(64) NOT NULL,
    event       varchar(64) NOT NULL,
    created_at  timestamptz NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (hook_id, event, created_at)
);

-- CHQ-119: history rows written in one request share the injected Clock's instant; the identity gives them an order.
ALTER TABLE hour_entry_change ADD COLUMN seq bigint GENERATED ALWAYS AS IDENTITY;
CREATE INDEX hour_entry_change_seq_ix ON hour_entry_change (entry_id, seq DESC);
