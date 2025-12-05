SELECT 'Round Players for latest round:' as info;
SELECT * FROM round_players WHERE round_id = (SELECT id FROM rounds ORDER BY id DESC LIMIT 1);

SELECT 'Round Results for latest round:' as info;
SELECT * FROM round_results WHERE round_id = (SELECT id FROM rounds ORDER BY id DESC LIMIT 1);

SELECT 'All Players:' as info;
SELECT * FROM players;
