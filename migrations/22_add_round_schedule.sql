-- Migration to add round schedule table
CREATE TABLE IF NOT EXISTS round_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  championship_id INTEGER NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  scheduled_date DATE NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(championship_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_round_schedule_championship ON round_schedule(championship_id);
