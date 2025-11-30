
ALTER TABLE rounds ADD COLUMN round_type TEXT DEFAULT 'regular';
ALTER TABLE rounds ADD COLUMN buy_in_value REAL;
ALTER TABLE rounds ADD COLUMN rebuy_value REAL;
ALTER TABLE rounds ADD COLUMN knockout_value REAL;

ALTER TABLE round_results ADD COLUMN rebuys INTEGER DEFAULT 0;
ALTER TABLE round_results ADD COLUMN knockout_earnings REAL DEFAULT 0;
