
ALTER TABLE rounds ADD COLUMN status TEXT DEFAULT 'completed';
CREATE INDEX idx_rounds_status ON rounds(status);
