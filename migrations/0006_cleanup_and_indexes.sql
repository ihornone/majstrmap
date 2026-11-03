DROP INDEX IF EXISTS idx_masters_slug;
DROP INDEX IF EXISTS idx_deal_codes_code;
ALTER TABLE reviews DROP COLUMN deal_code_id;
DROP TABLE IF EXISTS deal_codes;
CREATE INDEX IF NOT EXISTS idx_services_master ON services(master_id);
CREATE INDEX IF NOT EXISTS idx_saved_masters_master ON saved_masters(master_id);
CREATE INDEX IF NOT EXISTS idx_metrics_day ON master_metrics(day);
ALTER TABLE notification_outbox ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
