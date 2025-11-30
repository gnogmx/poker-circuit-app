-- Migration 9: Insert default scoring rules
INSERT OR IGNORE INTO scoring_rules (position, points) VALUES
(1, 150),
(2, 125),
(3, 105),
(4, 85),
(5, 70),
(6, 60),
(7, 50),
(8, 45),
(9, 40),
(10, 20),
(11, 15),
(12, 10),
(13, 5);
