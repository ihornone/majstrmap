-- Таблиця для фотографій портфоліо майстрів
CREATE TABLE IF NOT EXISTS master_portfolio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_key TEXT NOT NULL,
  description TEXT,
  tag TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_master_id ON master_portfolio(master_id, sort_order);
