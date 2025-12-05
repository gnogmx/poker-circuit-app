-- Migration to add final table support
ALTER TABLE rounds ADD COLUMN is_final_table BOOLEAN DEFAULT 0;
ALTER TABLE tournament_settings ADD COLUMN final_table_date TEXT;
