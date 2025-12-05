SELECT * FROM tournament_settings ORDER BY id DESC LIMIT 1;
SELECT * FROM rounds ORDER BY id DESC LIMIT 1;
SELECT COUNT(*) as player_count FROM round_players WHERE round_id = (SELECT id FROM rounds ORDER BY id DESC LIMIT 1);
