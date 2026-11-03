import type { NotificationRow } from './notifications';
import { notificationStatement, guardedNotificationStatement } from './notifications';
import type { Review } from './types';

export type CreateReviewResult =
  | { ok: true; review: Review }
  | { ok: false; reason: 'duplicate' | 'self' | 'invalid_rating' | 'error' };

export class ReviewsRepository {
  constructor(private db: D1Database) {}

  async getByMasterId(masterId: number, limit = 50): Promise<Review[]> {
    const { results } = await this.db
      .prepare(`SELECT r.*, CASE WHEN c.client_confirmed=1 AND c.master_confirmed=1 THEN 1 ELSE 0 END AS collaboration_confirmed FROM reviews r LEFT JOIN review_collaborations c ON c.review_id=r.id WHERE r.master_id = ? AND r.status = 'approved' ORDER BY r.created_at DESC, r.id DESC LIMIT ?`)
      .bind(masterId, limit)
      .all<Review>();
    return results || [];
  }

  async getByClientAndMaster(masterId: number, clientTelegramId: number): Promise<Review | null> {
    return this.db
      .prepare('SELECT * FROM reviews WHERE master_id = ? AND client_telegram_id = ?')
      .bind(masterId, clientTelegramId)
      .first<Review>();
  }

  async getCollaborationCandidate(reviewId: number, clientId: number): Promise<(Review & { master_telegram_id: number }) | null> {
    return this.db
      .prepare(`SELECT r.*, m.telegram_id AS master_telegram_id FROM reviews r JOIN masters m ON m.id=r.master_id WHERE r.id=? AND r.client_telegram_id=? AND r.status='approved' AND m.telegram_id != ?`)
      .bind(reviewId, clientId, clientId)
      .first<Review & { master_telegram_id: number }>();
  }

  async insertClientCollaboration(reviewId: number, notification: NotificationRow): Promise<boolean> {
    const results = await this.db.batch([
      this.db.prepare('INSERT OR IGNORE INTO review_collaborations (review_id,client_confirmed) VALUES (?,1)').bind(reviewId),
      notificationStatement(this.db, notification),
    ]);
    return (results[0]?.meta.changes || 0) > 0;
  }

  async getCollaborationConfirmationCandidate(reviewId: number, masterTelegramId: number): Promise<Review | null> {
    return this.db
      .prepare(`SELECT r.* FROM reviews r JOIN masters m ON m.id=r.master_id WHERE r.id=? AND m.telegram_id=? AND r.client_telegram_id != ? AND r.status='approved'`)
      .bind(reviewId, masterTelegramId, masterTelegramId)
      .first<Review>();
  }

  async insertMasterCollaboration(reviewId: number, notification: NotificationRow): Promise<boolean> {
    const results = await this.db.batch([
      this.db.prepare("UPDATE review_collaborations SET master_confirmed=1,confirmed_at=CURRENT_TIMESTAMP WHERE review_id=? AND client_confirmed=1 AND master_confirmed=0").bind(reviewId),
      guardedNotificationStatement(
        this.db,
        notification,
        'EXISTS (SELECT 1 FROM review_collaborations WHERE review_id=? AND client_confirmed=1 AND master_confirmed=1)',
        [reviewId]
      ),
    ]);
    return (results[0]?.meta.changes || 0) > 0;
  }

  async createReview(
    data: {
      masterId: number;
      clientTelegramId: number;
      clientName: string;
      rating: number;
      text?: string | null;
      masterTelegramId: number;
    },
    notification: NotificationRow
  ): Promise<CreateReviewResult> {
    if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) return { ok: false, reason: 'invalid_rating' };
    if (data.clientTelegramId === data.masterTelegramId) return { ok: false, reason: 'self' };
    const existing = await this.getByClientAndMaster(data.masterId, data.clientTelegramId);
    if (existing) return { ok: false, reason: 'duplicate' };

    const insertReview = this.db
      .prepare(
        `INSERT INTO reviews (master_id, client_telegram_id, client_name, rating, text, status)
         VALUES (?, ?, ?, ?, ?, 'approved')
         RETURNING *`
      )
      .bind(
        data.masterId,
        data.clientTelegramId,
        data.clientName,
        data.rating,
        data.text || null
      );

    const updateMasterStats = this.db
      .prepare(
        `UPDATE masters
         SET rating = ROUND((
           SELECT AVG(rating) FROM reviews WHERE master_id = ? AND status = 'approved'
         ), 1),
         reviews_count = (
           SELECT COUNT(*) FROM reviews WHERE master_id = ? AND status = 'approved'
         )
         WHERE id = ?`
      )
      .bind(data.masterId, data.masterId, data.masterId);

    try {
      const [reviewRes] = await this.db.batch<Review>([insertReview, updateMasterStats, notificationStatement(this.db, notification)]);
      const review = reviewRes?.results?.[0];
      if (!review) return { ok: false, reason: 'error' };
      return { ok: true, review };
    } catch {
      if (await this.getByClientAndMaster(data.masterId, data.clientTelegramId)) return { ok: false, reason: 'duplicate' };
      return { ok: false, reason: 'error' };
    }
  }

  async updateReview(reviewId: number, masterId: number, clientTelegramId: number, rating: number, text?: string | null): Promise<boolean> {
    const review = await this.db
      .prepare("SELECT * FROM reviews WHERE id = ? AND master_id = ? AND client_telegram_id = ? AND status = 'approved' AND created_at >= datetime('now', '-24 hours')")
      .bind(reviewId, masterId, clientTelegramId)
      .first<Review>();

    if (!review) return false;

    const updateReviewStmt = this.db
      .prepare(
        "UPDATE reviews SET rating = ?, text = ?, updated_at = datetime('now') WHERE id = ? AND master_id = ? AND client_telegram_id = ? AND status = 'approved'"
      )
      .bind(rating, text || null, reviewId, masterId, clientTelegramId);

    const updateMasterStats = this.db
      .prepare(
        `UPDATE masters
         SET rating = ROUND((
           SELECT AVG(rating) FROM reviews WHERE master_id = ? AND status = 'approved'
         ), 1)
         WHERE id = ?`
      )
      .bind(masterId, masterId);

    await this.db.batch([updateReviewStmt, updateMasterStats]);
    return true;
  }
}
