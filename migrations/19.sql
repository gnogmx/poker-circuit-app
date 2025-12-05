-- Fix scoring_rules unique constraint
-- Create new table with composite unique constraint
CREATE TABLE scoring_rules_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  championship_id INTEGER REFERENCES championships(id),
  position INTEGER NOT NULL,
  points INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(championship_id, position)
);

-- Copy data from old table
INSERT INTO scoring_rules_new (id, championship_id, position, points, created_at, updated_at)
SELECT id, championship_id, position, points, created_at, updated_at FROM scoring_rules;

-- Drop old table
DROP TABLE scoring_rules;

-- Rename new table
ALTER TABLE scoring_rules_new RENAME TO scoring_rules;
