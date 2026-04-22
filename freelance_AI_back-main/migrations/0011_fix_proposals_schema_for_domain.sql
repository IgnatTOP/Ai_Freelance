-- Align proposals table schema with domain/persistence layer.
-- Safe for existing databases due to IF NOT EXISTS guards.

ALTER TABLE proposals
    ADD COLUMN IF NOT EXISTS proposed_budget NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS proposed_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ai_analysis_for_client TEXT,
    ADD COLUMN IF NOT EXISTS ai_analysis_for_client_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_by_freelancer_at TIMESTAMPTZ;

-- Backfill proposed_budget from legacy proposed_amount if needed.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'proposals' AND column_name = 'proposed_amount'
    ) THEN
        UPDATE proposals
        SET proposed_budget = proposed_amount
        WHERE proposed_budget IS NULL AND proposed_amount IS NOT NULL;
    END IF;
END $$;
