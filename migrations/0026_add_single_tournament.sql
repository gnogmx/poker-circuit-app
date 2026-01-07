-- Add is_single_tournament column to championships table
ALTER TABLE championships ADD COLUMN is_single_tournament INTEGER DEFAULT 0;
