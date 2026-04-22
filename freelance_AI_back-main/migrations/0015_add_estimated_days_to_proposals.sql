-- Добавляем поле estimated_days для хранения предложенного срока в днях
ALTER TABLE proposals
    ADD COLUMN IF NOT EXISTS estimated_days INTEGER;
