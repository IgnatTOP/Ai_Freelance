-- Ensure conversations has updated_at for ordering and touch operations.
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Backfill existing rows.
UPDATE conversations
SET updated_at = created_at
WHERE updated_at IS NULL;

ALTER TABLE conversations
    ALTER COLUMN updated_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

DROP TRIGGER IF EXISTS conversations_set_updated_at ON conversations;
CREATE TRIGGER conversations_set_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
