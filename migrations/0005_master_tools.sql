ALTER TABLE notification_outbox ADD COLUMN claimed_at TEXT;
ALTER TABLE masters ADD COLUMN availability TEXT NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS master_metrics (
 id INTEGER PRIMARY KEY AUTOINCREMENT, master_id INTEGER NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
 visitor_key TEXT NOT NULL, event_kind TEXT NOT NULL CHECK(event_kind IN ('view','contact')),
 contact_kind TEXT NOT NULL DEFAULT '', day TEXT NOT NULL,
 UNIQUE(master_id,visitor_key,event_kind,contact_kind,day)
);
CREATE INDEX IF NOT EXISTS idx_metrics_master_day ON master_metrics(master_id,day);
CREATE TABLE IF NOT EXISTS saved_masters (
 telegram_id INTEGER NOT NULL, master_id INTEGER NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
 PRIMARY KEY(telegram_id,master_id)
);
CREATE TABLE IF NOT EXISTS client_subscriptions (
 id INTEGER PRIMARY KEY AUTOINCREMENT, telegram_id INTEGER NOT NULL, region_id TEXT NOT NULL,
 city TEXT NOT NULL, category_id TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
 since TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_sent TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(telegram_id,region_id,city,category_id)
);
CREATE TABLE IF NOT EXISTS publication_events (
 master_id INTEGER PRIMARY KEY REFERENCES masters(id) ON DELETE CASCADE, published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS service_reminders (
 review_id INTEGER PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,
 telegram_id INTEGER NOT NULL, due_at TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
 sent INTEGER NOT NULL DEFAULT 0
);
