-- Add default scoring rules (12 positions) - uses OR IGNORE since migration 9 may have already inserted these
INSERT OR IGNORE INTO scoring_rules (position, points) VALUES
(1, 50),
(2, 40),
(3, 35),
(4, 30),
(5, 25),
(6, 20),
(7, 15),
(8, 12),
(9, 10),
(10, 8),
(11, 7),
(12, 6);
