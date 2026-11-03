import { Api } from 'grammy';
import type { Env } from '../../index';
import type { BotCustomContext } from '../types';

const MAX_DELIVERY_ATTEMPTS = 5;

export async function flushNotifications(env: Env, api = new Api(env.TELEGRAM_BOT_TOKEN || '')) {
  await env.DB.prepare("UPDATE notification_outbox SET delivered=0,claimed_at=NULL WHERE delivered=2 AND claimed_at<datetime('now','-5 minutes')").run();
  const { results } = await env.DB.prepare(`SELECT * FROM notification_outbox WHERE delivered = 0 AND attempts < ${MAX_DELIVERY_ATTEMPTS} ORDER BY id LIMIT 40`).all<{ id: number; chat_id: number; text: string; reply_markup: string | null }>();
  for (const row of results) {
    const claimed = await env.DB.prepare('UPDATE notification_outbox SET delivered=2,claimed_at=CURRENT_TIMESTAMP WHERE id=? AND delivered=0 RETURNING id').bind(row.id).first();
    if (!claimed) continue;
    try {
      await api.sendMessage(row.chat_id, row.text, row.reply_markup ? { reply_markup: JSON.parse(row.reply_markup) } : {});
      await env.DB.prepare('UPDATE notification_outbox SET delivered = 1,claimed_at=NULL WHERE id = ?').bind(row.id).run();
    } catch (err) {
      console.error('Notification delivery failed', row.id, err);
      await env.DB.prepare(`UPDATE notification_outbox SET delivered=CASE WHEN attempts+1>=${MAX_DELIVERY_ATTEMPTS} THEN 3 ELSE 0 END, claimed_at=NULL, attempts=attempts+1 WHERE id=? AND delivered=2`).bind(row.id).run();
    }
  }
}

export async function scheduleNotificationFlush(ctx: BotCustomContext): Promise<void> {
  const flush = flushNotifications(ctx.env, ctx.api);
  if (ctx.waitUntil) {
    ctx.waitUntil(flush.catch((err) => console.error('Background notification flush failed:', err)));
    return;
  }
  await flush;
}
