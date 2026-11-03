import type { MasterService } from './types';

export class ServicesRepository {
  constructor(private db: D1Database) {}

  async getByMasterId(masterId: number): Promise<MasterService[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM services WHERE master_id = ? ORDER BY id ASC')
      .bind(masterId)
      .all<MasterService>();
    return results || [];
  }

  async addService(masterId: number, name: string, price: string): Promise<MasterService> {
    const res = await this.db
      .prepare('INSERT INTO services (master_id, name, price) VALUES (?, ?, ?) RETURNING *')
      .bind(masterId, name, price)
      .first<MasterService>();

    if (!res) throw new Error('Failed to insert service');
    return res;
  }

  async deleteService(serviceId: number, masterId: number): Promise<boolean> {
    const res = await this.db
      .prepare('DELETE FROM services WHERE id = ? AND master_id = ?')
      .bind(serviceId, masterId)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  async replaceServices(masterId: number, services: Array<{ name: string; price: string }>): Promise<void> {
    const statements = [
      this.db.prepare('DELETE FROM services WHERE master_id = ?').bind(masterId),
      ...services.map((s) =>
        this.db.prepare('INSERT INTO services (master_id, name, price) VALUES (?, ?, ?)').bind(masterId, s.name, s.price)
      ),
    ];
    await this.db.batch(statements);
  }
}
