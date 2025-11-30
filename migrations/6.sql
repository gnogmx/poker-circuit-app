
ALTER TABLE tournament_settings ADD COLUMN default_buy_in REAL DEFAULT 600;
ALTER TABLE tournament_settings ADD COLUMN final_table_percentage REAL DEFAULT 33.33;
ALTER TABLE tournament_settings ADD COLUMN total_rounds INTEGER DEFAULT 24;
ALTER TABLE tournament_settings ADD COLUMN first_place_percentage REAL DEFAULT 60;
ALTER TABLE tournament_settings ADD COLUMN second_place_percentage REAL DEFAULT 30;
ALTER TABLE tournament_settings ADD COLUMN third_place_percentage REAL DEFAULT 10;
ALTER TABLE tournament_settings ADD COLUMN final_table_top_players INTEGER DEFAULT 9;
