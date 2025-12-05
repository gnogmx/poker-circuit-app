-- Migration to add final table prize percentages
ALTER TABLE tournament_settings ADD COLUMN final_table_1st_percentage REAL DEFAULT 40;
ALTER TABLE tournament_settings ADD COLUMN final_table_2nd_percentage REAL DEFAULT 25;
ALTER TABLE tournament_settings ADD COLUMN final_table_3rd_percentage REAL DEFAULT 20;
ALTER TABLE tournament_settings ADD COLUMN final_table_4th_percentage REAL DEFAULT 10;
ALTER TABLE tournament_settings ADD COLUMN final_table_5th_percentage REAL DEFAULT 5;
