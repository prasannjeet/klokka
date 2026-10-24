-- CHQ-189: the weekly digest goes to everyone by default (it now carries last week's Excel workbook). New rows get
-- digest_enabled = true and every existing row is switched on; the setting still turns it off.

ALTER TABLE user_preference ALTER COLUMN digest_enabled SET DEFAULT true;
UPDATE user_preference SET digest_enabled = true WHERE NOT digest_enabled;
