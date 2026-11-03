import type { Env } from '../index';
import { InlineKeyboard } from 'grammy';
import { packCallback } from '../bot/callbacks';
import { notificationStatement } from '../db/notifications';
import { publicBaseUrl } from '../config';

export async function runClientNotifications(env: Env): Promise<void> {
  const users = await env.DB.prepare("SELECT telegram_id FROM client_subscriptions WHERE active=1 GROUP BY telegram_id HAVING MAX(last_sent)<=datetime('now','-7 days') LIMIT 100").all<{ telegram_id: number }>();
  const matches = users.results.length
    ? await env.DB.prepare(
        `SELECT cs.telegram_id, cs.last_sent, m.id, m.name, m.slug
         FROM client_subscriptions cs
         JOIN masters m
           ON m.status = 'active'
          AND m.region_id = cs.region_id
          AND (cs.city = '' OR m.city = cs.city)
          AND (cs.category_id = 'all' OR m.category_primary = cs.category_id OR m.category_secondary = cs.category_id)
         JOIN publication_events p
           ON p.master_id = m.id AND p.published_at > cs.last_sent
         WHERE cs.active = 1
           AND cs.telegram_id IN (SELECT telegram_id FROM client_subscriptions WHERE active = 1 GROUP BY telegram_id HAVING MAX(last_sent) <= datetime('now', '-7 days'))
         ORDER BY p.published_at DESC
         LIMIT 2000`
      ).all<{ telegram_id: number; last_sent: string; id: number; name: string; slug: string }>()
    : { results: [] as Array<{ telegram_id: number; last_sent: string; id: number; name: string; slug: string }> };

  const byUser = new Map<number, { last_sent: string; masters: Map<number, { name: string; slug: string }> }>();
  for (const row of matches.results) {
    let entry = byUser.get(row.telegram_id);
    if (!entry) {
      entry = { last_sent: row.last_sent, masters: new Map() };
      byUser.set(row.telegram_id, entry);
    }
    if (row.last_sent > entry.last_sent) entry.last_sent = row.last_sent;
    if (entry.masters.size < 10) entry.masters.set(row.id, { name: row.name, slug: row.slug });
  }

  const base = publicBaseUrl(env);
  for (const [telegramId, entry] of byUser) {
    if (!entry.masters.size) continue;
    const text = `Нові майстри за вашими підписками:\n\n${[...entry.masters.values()].map((m) => `${m.name}\n${base}/master/${m.slug}`).join('\n\n')}\n\nКерування підписками: /subscriptions`;
    const markup = new InlineKeyboard().text('Відписатися від усіх оновлень', packCallback({ domain: 'client', action: 'unsubscribe_all' }));
    await env.DB.batch([
      env.DB.prepare("UPDATE notification_outbox SET delivered=1 WHERE delivered=0 AND chat_id=? AND event_key LIKE ?").bind(telegramId, `weekly-user:${telegramId}:%`),
      notificationStatement(env.DB, { event_key: `weekly-user:${telegramId}:${entry.last_sent}`, recipient_telegram_id: telegramId, text, reply_markup_json: JSON.stringify(markup) }),
      env.DB.prepare('UPDATE client_subscriptions SET last_sent=CURRENT_TIMESTAMP WHERE telegram_id=? AND active=1').bind(telegramId),
    ]);
  }
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
