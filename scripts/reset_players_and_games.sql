-- Script to reset players and game history ONLY
-- Keeps tournament_settings and scoring_rules intact

DELETE FROM round_results;
DELETE FROM rounds;
DELETE FROM players;

-- Reset auto-increment counters for these tables
DELETE FROM sqlite_sequence WHERE name IN ('round_results', 'rounds', 'players');
