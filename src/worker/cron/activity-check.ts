import type { Env } from '../index';
import { MastersRepository } from '../db/masters.repo';
import { activityCheckKeyboard } from '../bot/keyboards';
import { escapeHtml } from '../bot/utils/html';


export type TelegramSendResult = { ok: true } | { ok: false; status?: number; retryAfterSeconds?: number };

export type TelegramSend = (
  env: Env,
  chatId: number,
  text: string,
  replyMarkup: unknown
) => Promise<TelegramSendResult>;

export const telegramSend: TelegramSend = async (env, chatId, text, replyMarkup) => {
  if (!env.TELEGRAM_BOT_TOKEN) return { ok: false };
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: replyMarkup }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 429) {
      let retryAfterSeconds: number | undefined;
      try {
        const body = (await res.json()) as { parameters?: { retry_after?: number } };
        retryAfterSeconds = body.parameters?.retry_after;
      } catch {
      }
      console.warn(`[cron] sendMessage rate limited (chat ${chatId}, retry_after=${retryAfterSeconds ?? '?'})`);
      return { ok: false, status: 429, retryAfterSeconds };
    }
    console.error(`[cron] sendMessage failed (chat ${chatId}, status ${res.status})`);
    return { ok: false, status: res.status };
  } catch (err) {
    console.error(`[cron] sendMessage network failure (chat ${chatId}):`, err);
    return { ok: false };
  }
};

function parseTimestamp(value: string): number {
  const hasZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  return Date.parse(hasZone ? value : `${value.replace(' ', 'T')}Z`);
}

function ageInDays(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const ts = parseTimestamp(value);
  return Number.isNaN(ts) ? Number.NaN : (Date.now() - ts) / 86_400_000;
}

export async function runMonthlyActivityCheck(env: Env, send: TelegramSend = telegramSend): Promise<void> {
  const repo = new MastersRepository(env.DB);
  const activeMasters = await repo.getActiveMastersForCron();

  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log(`[CRON] No bot token configured. Checked ${activeMasters.length} active masters.`);
    return;
  }

  const now = new Date();

  for (const master of activeMasters) {
    try {
      const text =
        `👋 Вітаємо, <b>${escapeHtml(master.name)}</b>!\n\n` +
        `🇺🇦 Це щомісячна перевірка актуальності вашої анкети на <b>Мапі майстрів України</b>.\n` +
        `Чи продовжуєте ви приймати замовлення в м. ${escapeHtml(master.city)}?\n\n` +
        `Будь ласка, оберіть відповідь нижче:`;

      const res = await send(env, master.telegram_id, text, activityCheckKeyboard());
      if (!res.ok) continue;

      await repo.update(master.telegram_id, {
        last_activity_check: now.toISOString(),
        activity_check_state: 'notified_day_0',
      });
    } catch (err) {
      console.error(`[CRON] Failed to send activity check to ${master.telegram_id}:`, err);
    }
  }
}

export async function runActivityReminders(env: Env, send: TelegramSend = telegramSend): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  const repo = new MastersRepository(env.DB);
  const masters = await repo.getByActivityStates(['notified_day_0', 'reminded_day_3']);

  for (const master of masters) {
    try {
      const age = ageInDays(master.last_activity_check);
      if (Number.isNaN(age)) continue;

      if (master.activity_check_state === 'notified_day_0' && age >= 3) {
        const text =
          `⏰ <b>${escapeHtml(master.name)}</b>, ви ще не підтвердили активність анкети.\n\n` +
          `Якщо продовжуєте приймати замовлення в м. ${escapeHtml(master.city)} — натисніть «✅ Працюю».\n` +
          `Якщо відповіді не буде, анкету буде тимчасово приховано з мапи.`;
        const res = await send(env, master.telegram_id, text, activityCheckKeyboard());
        if (!res.ok) continue;  
        await repo.update(master.telegram_id, { activity_check_state: 'reminded_day_3' });
      } else if (master.activity_check_state === 'reminded_day_3' && age >= 7) {
        await repo.update(master.telegram_id, {
          status: 'inactive',
          activity_check_state: 'inactive',
        });
      }
    } catch (err) {
      console.error(`[CRON] Activity reminder failed for master ${master.telegram_id}:`, err);
    }
  }
}
