-- Add elimination_state column to store real-time elimination data (JSON)
ALTER TABLE rounds ADD COLUMN elimination_state TEXT;
