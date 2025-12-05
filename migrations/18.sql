-- Add championship_id to existing tables
ALTER TABLE players ADD COLUMN championship_id INTEGER REFERENCES championships(id);
ALTER TABLE rounds ADD COLUMN championship_id INTEGER REFERENCES championships(id);
ALTER TABLE tournament_settings ADD COLUMN championship_id INTEGER REFERENCES championships(id);
ALTER TABLE scoring_rules ADD COLUMN championship_id INTEGER REFERENCES championships(id);

-- Create default user and championship for existing data
INSERT INTO users (email, password_hash, name) 
VALUES ('admin@pokerp.ro', 'admin123', 'Admin');

INSERT INTO championships (name, code, created_by)
VALUES ('Default Championship', 'DEFAULT', 1);

INSERT INTO championship_members (championship_id, user_id, role)
VALUES (1, 1, 'admin');

-- Migrate existing data to default championship
UPDATE players SET championship_id = 1 WHERE championship_id IS NULL;
UPDATE rounds SET championship_id = 1 WHERE championship_id IS NULL;
UPDATE tournament_settings SET championship_id = 1 WHERE championship_id IS NULL;
UPDATE scoring_rules SET championship_id = 1 WHERE championship_id IS NULL;

-- Drop old admin_auth table
DROP TABLE IF EXISTS admin_auth;
