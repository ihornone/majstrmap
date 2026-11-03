import type { Category } from './types';

export class CategoriesRepository {
  constructor(private db: D1Database) {}

  async listApproved(): Promise<Category[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM categories WHERE approved = 1 ORDER BY is_custom ASC, name ASC')
      .all<Category>();
    return results || [];
  }

  async getById(id: string): Promise<Category | null> {
    return this.db
      .prepare('SELECT * FROM categories WHERE id = ?')
      .bind(id)
      .first<Category>();
  }

  async create(id: string, name: string, isCustom = false, approved = true): Promise<void> {
    await this.db
      .prepare(
        'INSERT OR IGNORE INTO categories (id, name, is_custom, approved) VALUES (?, ?, ?, ?)'
      )
      .bind(id, name, isCustom ? 1 : 0, approved ? 1 : 0)
      .run();
  }
}
