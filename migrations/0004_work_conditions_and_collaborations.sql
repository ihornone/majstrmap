ALTER TABLE masters ADD COLUMN work_conditions TEXT NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS review_collaborations (
  review_id INTEGER PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,
  client_confirmed INTEGER NOT NULL DEFAULT 0,
  master_confirmed INTEGER NOT NULL DEFAULT 0,
  confirmed_at TEXT
);
