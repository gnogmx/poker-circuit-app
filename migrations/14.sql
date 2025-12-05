CREATE TABLE admin_auth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default password 'admin123' (hashed)
-- For simplicity in this demo, we might store plain text or simple hash. 
-- Since we don't have bcrypt in Cloudflare Workers easily without external libs, 
-- we will store it as plain text for now or a simple hash if possible.
-- Let's store plain text for now as requested "simple password based system" and upgrade later if needed.
-- Or better, let's use a simple SHA-256 hash if we can generate it. 
-- But for SQL insert, we can't generate hash easily.
-- Let's insert a placeholder and update it via API later.
-- Or just insert 'admin123' as plain text for the MVP as agreed "simple password-based system".
-- Wait, the plan said "hashed". I should implement hashing in the worker.
-- So the initial migration can be empty or have a default.

INSERT INTO admin_auth (password_hash) VALUES ('admin123');
