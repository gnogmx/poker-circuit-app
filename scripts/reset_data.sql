-- Script to reset all data (keep structure, delete data)
DELETE FROM round_results;
DELETE FROM rounds;
DELETE FROM players;
DELETE FROM scoring_rules;
DELETE FROM tournament_settings;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('round_results', 'rounds', 'players', 'scoring_rules', 'tournament_settings');
