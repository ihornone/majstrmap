import type { AdminRequest } from './types';
import type { ProfileDraft } from '../bot/utils/profile';
import type { NotificationRow } from './notifications';
import { notificationStatement, guardedNotificationStatement } from './notifications';

export class AdminRepository {
  constructor(private db: D1Database) {}
  async createRequest(type: AdminRequest['type'], masterId: number | null, payload: Record<string, any>): Promise<void> {
    await this.db.prepare('INSERT INTO admin_requests (type, master_id, payload) VALUES (?, ?, ?)').bind(type, masterId, JSON.stringify(payload)).run();
  }
  async proposeCategory(masterId: number | null, payload: { telegramId: number; name: string; categoryId: string; field: string; username?: string; firstName: string }): Promise<AdminRequest> {
    const req = await this.db.prepare("INSERT INTO admin_requests (type, master_id, payload) VALUES ('new_category', ?, ?) RETURNING *").bind(masterId,JSON.stringify(payload)).first<AdminRequest>();
    if (!req) throw new Error('Failed to submit category');
    return req;
  }
  async resolveCategory(req: AdminRequest, approved: boolean, payload: { telegramId: number; categoryId: string; name: string }, notification: NotificationRow): Promise<boolean> {
    const statements: D1PreparedStatement[] = [];
    const gate = "EXISTS (SELECT 1 FROM admin_requests WHERE id=? AND status='pending')";
    if (approved) statements.push(this.db.prepare(`INSERT OR IGNORE INTO categories (id,name,is_custom,approved)
      SELECT ?,?,1,1 WHERE ${gate}`).bind(payload.categoryId,payload.name,req.id));
    statements.push(guardedNotificationStatement(this.db, notification, gate, [req.id]));
    statements.push(this.db.prepare("UPDATE admin_requests SET status=? WHERE id=? AND status='pending'").bind(approved?'approved':'rejected',req.id));
    const result = await this.db.batch(statements);
    return (result.at(-1)!.meta.changes || 0)>0;
  }
  async getPendingRequests(): Promise<AdminRequest[]> {
    const { results } = await this.db.prepare('SELECT * FROM admin_requests WHERE status = "pending" ORDER BY created_at ASC').all<AdminRequest>();
    return results || [];
  }
  async getLatestProfileRequest(masterId: number) {
    return this.db.prepare("SELECT * FROM admin_requests WHERE master_id=? AND type IN ('new_profile','edit_profile') ORDER BY id DESC LIMIT 1").bind(masterId).first<AdminRequest>();
  }
  async getById(id: number) { return this.db.prepare('SELECT * FROM admin_requests WHERE id = ?').bind(id).first<AdminRequest>(); }
  async submitProfile(masterId: number, type: 'new_profile' | 'edit_profile', draft: ProfileDraft): Promise<AdminRequest> {
    const result = await this.db.batch<AdminRequest>([
      this.db.prepare("UPDATE admin_requests SET status = 'rejected' WHERE master_id = ? AND type IN ('new_profile','edit_profile') AND status = 'pending'").bind(masterId),
      this.db.prepare('INSERT INTO admin_requests (type, master_id, payload) VALUES (?, ?, ?) RETURNING *').bind(type, masterId, JSON.stringify(draft)),
    ]);
    const created = result[1]?.results[0];
    if (!created) throw new Error('Failed to submit profile');
    return created;
  }
  async resolveProfile(req: AdminRequest, approved: boolean, draft: ProfileDraft, notification: NotificationRow): Promise<boolean> {
    const statements: D1PreparedStatement[] = [];
    const gate = "EXISTS (SELECT 1 FROM admin_requests WHERE id = ? AND master_id = ? AND status = 'pending')";
    if (approved) {
      statements.push(this.db.prepare(`INSERT OR IGNORE INTO publication_events (master_id) SELECT id FROM masters WHERE id=? AND status='pending' AND ${gate}`).bind(req.master_id,req.id,req.master_id));
      statements.push(this.db.prepare(`UPDATE masters SET name=?, region_id=?, city=?, category_primary=?, category_secondary=?, contacts=?, avatar_key=?, description=?, about=?, experience_years=?, price_start=?, work_conditions=?, availability=?, channel_subscribed=1, status='active', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status != 'banned' AND ${gate}`)
        .bind(draft.name,draft.region_id,draft.city,draft.category_primary,draft.category_secondary,JSON.stringify(draft.contacts),draft.avatar_key,draft.description,draft.about,draft.experience_years,draft.price_start ?? 0,JSON.stringify(draft.work_conditions || {}),JSON.stringify(draft.availability || {}),req.master_id,req.id,req.master_id));
      statements.push(this.db.prepare(`DELETE FROM services WHERE master_id=? AND ${gate}`).bind(req.master_id,req.id,req.master_id));
      for (const s of draft.services) statements.push(this.db.prepare(`INSERT INTO services (master_id,name,price) SELECT ?,?,? WHERE ${gate}`).bind(req.master_id,s.name,s.price,req.id,req.master_id));
    }
    statements.push(guardedNotificationStatement(this.db, notification, gate, [req.id, req.master_id]));
    statements.push(this.db.prepare("UPDATE admin_requests SET status=? WHERE id=? AND status='pending'").bind(approved ? 'approved' : 'rejected',req.id));
    const result = await this.db.batch(statements);
    return (result[result.length-1]?.meta.changes || 0) > 0;
  }
  async enqueue(row: NotificationRow) {
    await notificationStatement(this.db, row).run();
  }
}
