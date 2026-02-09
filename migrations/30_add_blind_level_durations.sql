-- Add blind_level_durations column to store custom duration per level (JSON)
ALTER TABLE tournament_settings ADD COLUMN blind_level_durations TEXT;
