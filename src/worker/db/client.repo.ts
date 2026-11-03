
export interface SavedMasterRow {
  id: number;
  name: string;
  slug: string;
}

export interface ClientSubscriptionRow {
  id: number;
  telegram_id: number;
  region_id: string;
  city: string;
  category_id: string;
}

export interface ServiceReminderRow {
  review_id: number;
  due_at: string;
}

export class ClientRepository {
  constructor(private db: D1Database) {}

  async listSavedMasters(telegramId: number): Promise<SavedMasterRow[]> {
    const { results } = await this.db
      .prepare("SELECT m.id, m.name, m.slug FROM saved_masters s JOIN masters m ON m.id = s.master_id WHERE s.telegram_id = ? AND m.status = 'active' LIMIT 100")
      .bind(telegramId)
      .all<SavedMasterRow>();
    return results || [];
  }

  async saveMaster(telegramId: number, masterId: number): Promise<void> {
    await this.db
      .prepare("INSERT OR IGNORE INTO saved_masters (telegram_id, master_id) SELECT ?, id FROM masters WHERE id = ? AND status = 'active'")
      .bind(telegramId, masterId)
      .run();
  }

  async unsaveMaster(telegramId: number, masterId: number): Promise<void> {
    await this.db.prepare('DELETE FROM saved_masters WHERE telegram_id = ? AND master_id = ?').bind(telegramId, masterId).run();
  }

  async listSubscriptions(telegramId: number): Promise<ClientSubscriptionRow[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM client_subscriptions WHERE telegram_id = ? AND active = 1')
      .bind(telegramId)
      .all<ClientSubscriptionRow>();
    return results || [];
  }

  async deactivateAllSubscriptions(telegramId: number): Promise<void> {
    await this.db.batch([
      this.db.prepare('UPDATE client_subscriptions SET active = 0 WHERE telegram_id = ?').bind(telegramId),
      this.db.prepare("UPDATE notification_outbox SET delivered = 1 WHERE chat_id = ? AND event_key LIKE ?").bind(telegramId, `weekly-user:${telegramId}:%`),
    ]);
  }

  async deactivateSubscription(id: number, telegramId: number): Promise<void> {
    await this.db.batch([
      this.db.prepare('UPDATE client_subscriptions SET active = 0 WHERE id = ? AND telegram_id = ?').bind(id, telegramId),
      this.db.prepare("UPDATE notification_outbox SET delivered = 1 WHERE chat_id = ? AND event_key LIKE ?").bind(telegramId, `weekly-user:${telegramId}:%`),
    ]);
  }

  async upsertSubscription(telegramId: number, regionId: string, city: string, categoryId: string): Promise<void> {
    await this.db
      .prepare(`INSERT INTO client_subscriptions (telegram_id, region_id, city, category_id) VALUES (?, ?, ?, ?)
        ON CONFLICT(telegram_id, region_id, city, category_id) DO UPDATE SET active = 1, last_sent = CURRENT_TIMESTAMP, since = CURRENT_TIMESTAMP`)
      .bind(telegramId, regionId, city, categoryId)
      .run();
  }

  async createServiceReminder(reviewId: number, telegramId: number): Promise<boolean> {
    const result = await this.db
      .prepare(`INSERT OR IGNORE INTO service_reminders (review_id, telegram_id, due_at) SELECT r.id, ?, datetime('now','+1 month') FROM reviews r JOIN review_collaborations c ON c.review_id = r.id WHERE r.id = ? AND r.client_telegram_id = ? AND c.client_confirmed = 1 AND c.master_confirmed = 1`)
      .bind(telegramId, reviewId, telegramId)
      .run();
    return (result.meta.changes || 0) > 0;
  }

  async listServiceReminders(telegramId: number): Promise<ServiceReminderRow[]> {
    const { results } = await this.db
      .prepare('SELECT review_id, due_at FROM service_reminders WHERE telegram_id = ? AND active = 1 AND sent = 0')
      .bind(telegramId)
      .all<ServiceReminderRow>();
    return results || [];
  }

  async deactivateServiceReminder(reviewId: number, telegramId: number): Promise<void> {
    await this.db.batch([
      this.db.prepare('UPDATE service_reminders SET active = 0 WHERE review_id = ? AND telegram_id = ?').bind(reviewId, telegramId),
      this.db.prepare('UPDATE notification_outbox SET delivered = 1 WHERE event_key = ? AND chat_id = ?').bind(`service-reminder:${reviewId}`, telegramId),
    ]);
  }
}
