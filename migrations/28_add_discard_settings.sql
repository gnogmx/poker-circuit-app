-- Add discard settings columns
ALTER TABLE tournament_settings ADD COLUMN discard_count INTEGER DEFAULT 0;
ALTER TABLE tournament_settings ADD COLUMN discard_after_round INTEGER DEFAULT 0;
