-- Create championship members table for role-based access
CREATE TABLE championship_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  championship_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'player')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (championship_id) REFERENCES championships(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(championship_id, user_id)
);

CREATE INDEX idx_members_championship ON championship_members(championship_id);
CREATE INDEX idx_members_user ON championship_members(user_id);
