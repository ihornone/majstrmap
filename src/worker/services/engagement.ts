import type { Env } from '../index';
import { InlineKeyboard } from 'grammy';
import { packCallback } from '../bot/callbacks';
import { notificationStatement } from '../db/notifications';
import { publicBaseUrl } from '../config';

export async function runClientNotifications(env: Env): Promise<void> {
  const base = publicBaseUrl(env);
  const reminders = await env.DB.prepare(`SELECT r.review_id,r.telegram_id,m.name,m.slug FROM service_reminders r JOIN reviews v ON v.id=r.review_id JOIN masters m ON m.id=v.master_id WHERE r.active=1 AND r.sent=0 AND r.due_at<=CURRENT_TIMESTAMP AND m.status='active' LIMIT 100`).all<{ review_id: number; telegram_id: number; name: string; slug: string }>();
  for (const r of reminders.results) {
    const markup = new InlineKeyboard().url('Відкрити майстра', `${base}/master/${r.slug}`).row().text('Вимкнути нагадування', packCallback({ domain: 'client', action: 'reminder_off', id: String(r.review_id) }));
    await env.DB.batch([
      notificationStatement(env.DB, { event_key: `service-reminder:${r.review_id}`, recipient_telegram_id: r.telegram_id, text: `Минув місяць після підтвердженої співпраці з ${r.name}. Чи все працює добре? Якщо потрібна допомога, ось картка майстра. Це одноразове нагадування, на яке ви погодилися.`, reply_markup_json: JSON.stringify(markup) }),
      env.DB.prepare('UPDATE service_reminders SET sent=1 WHERE review_id=? AND active=1').bind(r.review_id),
    ]);
  }
  if (new Date().getUTCHours() === 3) {
    await env.DB.prepare("DELETE FROM master_metrics WHERE day<date('now','-90 days')").run();
  }
}
