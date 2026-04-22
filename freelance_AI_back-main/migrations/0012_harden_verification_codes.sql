ALTER TABLE verification_codes
    ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE verification_codes
    ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_verification_codes_active_lookup
    ON verification_codes (user_id, type, used, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_codes_created_at
    ON verification_codes (created_at DESC);
