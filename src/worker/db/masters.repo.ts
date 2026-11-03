import type { Master } from './types';

export interface GetMastersFilter {
  regionId?: string;
  categoryId?: string;
  city?: string;
  sort?: 'rating' | 'reviews' | 'newest';
  visits?: boolean;
  sunday?: boolean;
  emergency?: boolean;
  limit?: number;
  offset?: number;
}

export class MastersRepository {
  constructor(private db: D1Database) {}

  async getFiltered(filters: GetMastersFilter): Promise<{ masters: Master[]; total: number }> {
    const conditions: string[] = ["status = 'active'"];
    const bindings: any[] = [];

    if (filters.regionId && filters.regionId !== 'all') {
      conditions.push('region_id = ?');
      bindings.push(filters.regionId);
    }

    if (filters.categoryId && filters.categoryId !== 'all') {
      conditions.push('(category_primary = ? OR category_secondary = ?)');
      bindings.push(filters.categoryId, filters.categoryId);
    }

    if (filters.city && filters.city !== 'all') {
      conditions.push('city = ?');
      bindings.push(filters.city);
    }

    if (filters.visits) conditions.push("json_extract(work_conditions, '$.visit') IN ('city','nearby')");
    if (filters.sunday) conditions.push("EXISTS (SELECT 1 FROM json_each(json_extract(work_conditions, '$.days')) WHERE value = 7)");
    if (filters.emergency) conditions.push("json_extract(work_conditions, '$.emergency') = 1");

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as count FROM masters ${whereClause}`;
    const countRes = await this.db.prepare(countSql).bind(...bindings).first<{ count: number }>();
    const total = countRes?.count || 0;

    let orderBy = 'rating DESC, reviews_count DESC';
    if (filters.sort === 'reviews') {
      orderBy = 'reviews_count DESC, rating DESC';
    } else if (filters.sort === 'newest') {
      orderBy = 'created_at DESC';
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const dataSql = `SELECT * FROM masters ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    const { results } = await this.db
      .prepare(dataSql)
      .bind(...bindings, limit, offset)
      .all<Master>();

    return {
      masters: results || [],
      total,
    };
  }

  async getRegionFilters(regionId: string) {
    const [cities, categories, emergency] = await this.db.batch([
      this.db.prepare("SELECT DISTINCT city FROM masters WHERE region_id = ? AND status = 'active' AND TRIM(city) != '' ORDER BY city").bind(regionId),
      this.db.prepare(`SELECT DISTINCT c.* FROM categories c JOIN masters m
        ON (c.id = m.category_primary OR c.id = m.category_secondary)
        WHERE m.region_id = ? AND m.status = 'active' AND c.approved = 1 ORDER BY c.name`).bind(regionId),
      this.db.prepare("SELECT DISTINCT category_primary AS id FROM masters WHERE region_id=? AND status='active' AND json_extract(work_conditions, '$.emergency')=1 UNION SELECT DISTINCT category_secondary AS id FROM masters WHERE region_id=? AND status='active' AND category_secondary IS NOT NULL AND json_extract(work_conditions, '$.emergency')=1").bind(regionId,regionId),
    ]);
    if (!cities?.results || !categories?.results || !emergency?.results) throw new Error('Failed to read region filters');
    return { emergencyCategories: emergency.results.map(row=>String((row as {id:string}).id)), cities: cities.results.map(row => String((row as { city: string }).city)), categories: categories.results };
  }

  async getBySlug(slug: string): Promise<Master | null> {
    return this.db
      .prepare('SELECT * FROM masters WHERE slug = ? AND status = "active"')
      .bind(slug)
      .first<Master>();
  }

  async getById(id: number): Promise<Master | null> {
    return this.db
      .prepare('SELECT * FROM masters WHERE id = ?')
      .bind(id)
      .first<Master>();
  }

  async getBySlugs(slugs: string[]): Promise<Master[]> {
    const unique = [...new Set(slugs)];
    if (unique.length === 0) return [];
    const placeholders = unique.map(() => '?').join(',');
    const { results } = await this.db
      .prepare(`SELECT * FROM masters WHERE status = 'active' AND slug IN (${placeholders})`)
      .bind(...unique)
      .all<Master>();
    return results || [];
  }

  async getByActivityStates(states: string[]): Promise<Master[]> {
    if (states.length === 0) return [];
    const placeholders = states.map(() => '?').join(',');
    const { results } = await this.db
      .prepare(`SELECT * FROM masters WHERE status = 'active' AND activity_check_state IN (${placeholders})`)
      .bind(...states)
      .all<Master>();
    return results || [];
  }

  async getMetricsCounts(masterId: number): Promise<Record<string, number>> {
    const { results } = await this.db
      .prepare("SELECT event_kind, COUNT(*) AS n FROM master_metrics WHERE master_id = ? AND day >= date('now', '-30 days') GROUP BY event_kind")
      .bind(masterId)
      .all<{ event_kind: string; n: number }>();
    const counts: Record<string, number> = {};
    for (const row of results || []) counts[row.event_kind] = row.n;
    return counts;
  }

  async getByTelegramId(telegramId: number): Promise<Master | null> {
    return this.db
      .prepare('SELECT * FROM masters WHERE telegram_id = ?')
      .bind(telegramId)
      .first<Master>();
  }

  async getRegionStats(): Promise<Record<string, number>> {
    const { results } = await this.db
      .prepare(
        'SELECT region_id, COUNT(*) as count FROM masters WHERE status = "active" GROUP BY region_id'
      )
      .all<{ region_id: string; count: number }>();

    const stats: Record<string, number> = {};
    if (results) {
      for (const row of results) {
        stats[row.region_id] = row.count;
      }
    }
    return stats;
  }

  async create(data: {
    telegram_id: number;
    slug: string;
    name: string;
    region_id: string;
    city: string;
    category_primary: string;
    category_secondary?: string | null;
    price_start?: number;
    contacts: string;
    avatar_key?: string | null;
    description: string;
    about?: string | null;
    experience_years: number;
    channel_subscribed?: number;
    status?: string;
  }): Promise<Master> {
    const res = await this.db
      .prepare(
        `INSERT INTO masters (
          telegram_id, slug, name, region_id, city, category_primary, category_secondary,
          price_start, contacts, avatar_key, description, about, experience_years,
          channel_subscribed, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *`
      )
      .bind(
        data.telegram_id,
        data.slug,
        data.name,
        data.region_id,
        data.city,
        data.category_primary,
        data.category_secondary || null,
        data.price_start ?? 0,
        data.contacts,
        data.avatar_key || null,
        data.description,
        data.about || null,
        data.experience_years,
        data.channel_subscribed ?? 1,
        data.status || 'pending'
      )
      .first<Master>();

    if (!res) throw new Error('Failed to create master in database');
    return res;
  }

  static readonly UPDATABLE_COLUMNS = new Set([
    'slug', 'name', 'region_id', 'city', 'category_primary', 'category_secondary',
    'price_start', 'contacts', 'avatar_key', 'description', 'about', 'experience_years',
    'rating', 'reviews_count', 'status', 'channel_subscribed', 'last_activity_check',
    'activity_check_state', 'work_conditions', 'availability',
  ]);

  async update(telegramId: number, updates: Partial<Master>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (!MastersRepository.UPDATABLE_COLUMNS.has(key)) {
        throw new Error(`Unknown masters column in update: ${key}`);
      }
      fields.push(`${key} = ?`);
      values.push(val);
    }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(telegramId);

    const sql = `UPDATE masters SET ${fields.join(', ')} WHERE telegram_id = ?`;
    await this.db.prepare(sql).bind(...values).run();
  }

  async delete(telegramId: number): Promise<void> {
    await this.db.batch([
      this.db.prepare('DELETE FROM admin_requests WHERE master_id IN (SELECT id FROM masters WHERE telegram_id = ?)').bind(telegramId),
      this.db.prepare('DELETE FROM bot_sessions WHERE telegram_id = ?').bind(telegramId),
      this.db.prepare('DELETE FROM client_subscriptions WHERE telegram_id = ?').bind(telegramId),
      this.db.prepare('DELETE FROM master_metrics WHERE master_id IN (SELECT id FROM masters WHERE telegram_id = ?)').bind(telegramId),
      this.db.prepare('DELETE FROM masters WHERE telegram_id = ?').bind(telegramId),
    ]);
  }

  async getActiveMastersForCron(): Promise<Master[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM masters WHERE status = "active"')
      .all<Master>();
    return results || [];
  }
}
