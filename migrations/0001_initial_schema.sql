
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  approved INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS masters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region_id TEXT NOT NULL,
  city TEXT NOT NULL,
  category_primary TEXT NOT NULL REFERENCES categories(id),
  category_secondary TEXT REFERENCES categories(id),
  price_start INTEGER NOT NULL DEFAULT 0,
  contacts TEXT NOT NULL DEFAULT '{}', -- JSON: { phone?, telegram?, viber?, whatsapp?, instagram? }
  avatar_key TEXT,                     -- R2 bucket key for avatar image
  description TEXT NOT NULL,           -- Short 1-2 sentence description
  about TEXT,                          -- Extended description
  experience_years INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0.0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, inactive, banned
  channel_subscribed INTEGER NOT NULL DEFAULT 0,
  last_activity_check TEXT,
  activity_check_state TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS deal_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  master_id INTEGER NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- active, used, expired
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  client_telegram_id INTEGER NOT NULL,
  client_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  deal_code_id INTEGER REFERENCES deal_codes(id),
  status TEXT NOT NULL DEFAULT 'approved', -- approved, pending, hidden
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CONSTRAINT unique_client_master UNIQUE (master_id, client_telegram_id)
);

CREATE TABLE IF NOT EXISTS bot_sessions (
  telegram_id INTEGER PRIMARY KEY,
  step TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}', -- JSON data
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS admin_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- new_category, change_category, complaint
  master_id INTEGER REFERENCES masters(id),
  payload TEXT NOT NULL DEFAULT '{}', -- JSON data
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_masters_region_city ON masters(region_id, city);
CREATE INDEX IF NOT EXISTS idx_masters_category_primary ON masters(category_primary);
CREATE INDEX IF NOT EXISTS idx_masters_status ON masters(status);
CREATE INDEX IF NOT EXISTS idx_masters_slug ON masters(slug);
CREATE INDEX IF NOT EXISTS idx_deal_codes_code ON deal_codes(code);
CREATE INDEX IF NOT EXISTS idx_deal_codes_master ON deal_codes(master_id);
CREATE INDEX IF NOT EXISTS idx_reviews_master ON reviews(master_id);
