-- Add prize_distribution column (JSON array)
ALTER TABLE tournament_settings ADD COLUMN prize_distribution TEXT;

-- Migrate existing values to the new JSON format
-- We construct a JSON array string manually using the existing columns
-- Format: [1st, 2nd, 3rd, 4th, 5th]
UPDATE tournament_settings 
SET prize_distribution = '[' || 
    COALESCE(first_place_percentage, 0) || ',' || 
    COALESCE(second_place_percentage, 0) || ',' || 
    COALESCE(third_place_percentage, 0) || ',' || 
    COALESCE(fourth_place_percentage, 0) || ',' || 
    COALESCE(fifth_place_percentage, 0) || 
']';
