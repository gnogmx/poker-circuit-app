-- Migration to add rules text
ALTER TABLE tournament_settings ADD COLUMN rules_text TEXT;
