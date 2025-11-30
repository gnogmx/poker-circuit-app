
CREATE TABLE tournament_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blind_level_duration INTEGER NOT NULL,
  blind_levels TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tournament_settings (blind_level_duration, blind_levels) 
VALUES (15, '100/200,200/400,400/800,800/1600,1600/3200');
