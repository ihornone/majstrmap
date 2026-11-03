import type { BotSession } from './types';

const SESSION_TTL_MS = 48 * 60 * 60 * 1000;

function parseTimestamp(value: string): number {
  const hasZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalized = hasZone ? value : `${value.replace(' ', 'T')}Z`;
  return Date.parse(normalized);
}

export class SessionsRepository {
  constructor(private db: D1Database) {}

  async get(telegramId: number): Promise<{ step: string; data: Record<string, any> } | null> {
    const row = await this.db
      .prepare('SELECT * FROM bot_sessions WHERE telegram_id = ?')
      .bind(telegramId)
      .first<BotSession>();

    if (!row) return null;
    const updatedAt = parseTimestamp(row.updated_at);
    if (!Number.isNaN(updatedAt) && Date.now() - updatedAt > SESSION_TTL_MS) return null;
    try {
      return {
        step: row.step,
        data: JSON.parse(row.data || '{}'),
      };
    } catch {
      return { step: row.step, data: {} };
    }
  }

  async set(telegramId: number, step: string, data: Record<string, any>): Promise<void> {
    const jsonStr = JSON.stringify(data);
    await this.db
      .prepare(
        `INSERT INTO bot_sessions (telegram_id, step, data, updated_at) 
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(telegram_id) DO UPDATE SET 
           step = excluded.step, 
           data = excluded.data, 
           updated_at = excluded.updated_at`
      )
      .bind(telegramId, step, jsonStr)
      .run();
  }

  async clear(telegramId: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM bot_sessions WHERE telegram_id = ?')
      .bind(telegramId)
      .run();
  }
}
