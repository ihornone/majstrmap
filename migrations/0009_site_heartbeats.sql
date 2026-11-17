-- Таблиці для живого лічильника відвідувачів та онлайну
CREATE TABLE IF NOT EXISTS site_heartbeats (
  visitor_key TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS site_stats (
  key TEXT PRIMARY KEY,
  val INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO site_stats (key, val) VALUES ('total_visitors', 1);
