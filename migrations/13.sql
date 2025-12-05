-- Remove duplicates keeping the one with lowest ID
DELETE FROM round_players 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM round_players 
  GROUP BY round_id, player_id
);

-- Create unique index to prevent future duplicates
CREATE UNIQUE INDEX idx_round_players_unique ON round_players(round_id, player_id);
