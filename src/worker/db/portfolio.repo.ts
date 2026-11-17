import type { MasterPortfolioItem } from './types';

export class PortfolioRepository {
  constructor(private db: D1Database) {}

  async getByMasterId(masterId: number, onlyApproved = false): Promise<MasterPortfolioItem[]> {
    const query = onlyApproved
      ? "SELECT * FROM master_portfolio WHERE master_id = ? AND status = 'approved' ORDER BY sort_order ASC, id ASC"
      : 'SELECT * FROM master_portfolio WHERE master_id = ? ORDER BY sort_order ASC, id ASC';
    const { results } = await this.db
      .prepare(query)
      .bind(masterId)
      .all<MasterPortfolioItem>();
    return results || [];
  }

  async getById(id: number): Promise<MasterPortfolioItem | null> {
    return this.db
      .prepare('SELECT * FROM master_portfolio WHERE id = ?')
      .bind(id)
      .first<MasterPortfolioItem>();
  }

  async updateStatus(id: number, status: 'approved' | 'rejected'): Promise<boolean> {
    const res = await this.db
      .prepare('UPDATE master_portfolio SET status = ? WHERE id = ?')
      .bind(status, id)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  async add(item: {
    master_id: number;
    title: string;
    image_key: string;
    description?: string;
    tag?: string;
    sort_order?: number;
    status?: 'pending' | 'approved';
  }): Promise<MasterPortfolioItem> {
    const res = await this.db
      .prepare(
        'INSERT INTO master_portfolio (master_id, title, image_key, description, tag, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        item.master_id,
        item.title,
        item.image_key,
        item.description || null,
        item.tag || null,
        item.sort_order ?? 0,
        item.status || 'pending'
      )
      .run();

    return {
      id: Number(res.meta.last_row_id),
      master_id: item.master_id,
      title: item.title,
      image_key: item.image_key,
      description: item.description || null,
      tag: item.tag || null,
      sort_order: item.sort_order ?? 0,
      status: item.status || 'pending',
      created_at: new Date().toISOString(),
    };
  }

  async delete(id: number, masterId: number): Promise<boolean> {
    const res = await this.db
      .prepare('DELETE FROM master_portfolio WHERE id = ? AND master_id = ?')
      .bind(id, masterId)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }
}
