import { Bot, webhookCallback } from 'grammy';
import type { Env } from '../index';
import type { BotCustomContext } from './types';
import { MastersRepository } from '../db/masters.repo';
import { ServicesRepository } from '../db/services.repo';
import { ReviewsRepository } from '../db/reviews.repo';
import { CategoriesRepository } from '../db/categories.repo';
import { SessionsRepository } from '../db/sessions.repo';
import { AdminRepository } from '../db/admin.repo';
import { ClientRepository } from '../db/client.repo';

import { clientComposer } from './handlers/client';
import { startComposer } from './handlers/start';
import { registrationComposer } from './handlers/registration';
import { masterComposer } from './handlers/master';
import { reviewComposer } from './handlers/review';
import { adminComposer } from './handlers/admin';
import { unpackCallback } from './callbacks';

let cachedBotInfo: Bot<BotCustomContext>['botInfo'] | undefined;

export function createBot(env: Env, waitUntil?: (promise: Promise<unknown>) => void): Bot<BotCustomContext> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set. Встановіть секрет: wrangler secret put TELEGRAM_BOT_TOKEN');
  }

  const bot = new Bot<BotCustomContext>(token);

  bot.use(async (ctx, next) => {
    ctx.env = env;
    if (waitUntil) ctx.waitUntil = waitUntil;
    ctx.repos = {
      masters: new MastersRepository(env.DB),
      services: new ServicesRepository(env.DB),
      reviews: new ReviewsRepository(env.DB),
      categories: new CategoriesRepository(env.DB),
      sessions: new SessionsRepository(env.DB),
      admin: new AdminRepository(env.DB),
      client: new ClientRepository(env.DB),
    };
    await next();
  });

  bot.use(async (ctx, next) => {
    if (ctx.callbackQuery?.data?.startsWith('{"d":')) {
      const decoded = unpackCallback(ctx.callbackQuery.data);
      if (decoded) ctx.callbackQuery.data = JSON.stringify(decoded);
    }
    await next();
  });

  bot.callbackQuery(/^{"domain":"cron","action":"(confirm_active|pause_work)"/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const data = unpackCallback(ctx.callbackQuery.data);
    const userId = ctx.from.id;
    const master = await ctx.repos.masters.getByTelegramId(userId);

    if (!master || master.status === 'pending' || master.status === 'banned') return;

    if (data?.action === 'confirm_active') {
      await ctx.repos.masters.update(userId, {
        status: 'active',
        last_activity_check: new Date().toISOString(),
        activity_check_state: 'confirmed',
      });
      await ctx.editMessageText('✅ <b>Чудово! Вашу анкету підтверджено, вона активна на мапі.</b>', {
        parse_mode: 'HTML',
      });
    } else {
      await ctx.repos.masters.update(userId, {
        status: 'inactive',
        activity_check_state: 'paused_by_user',
      });
      await ctx.editMessageText(
        '⏸ <b>Вашу картку тимчасово приховано з мапи.</b>\nВи можете повернутися в будь-який час, надіславши команду /start.',
        { parse_mode: 'HTML' }
      );
    }
  });

  bot.use(clientComposer);
  bot.use(startComposer);
  bot.use(registrationComposer);
  bot.use(masterComposer);
  bot.use(reviewComposer);
  bot.use(adminComposer);

  bot.catch((err) => {
    console.error('Unhandled Telegram bot error:', err);
    try {
      void err.ctx.reply('⚠️ Сталась помилка. Спробуйте ще раз.').catch(() => {
      });
    } catch {
    }
  });

  return bot;
}

export async function handleTelegramWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    if (env.ENVIRONMENT === 'production') {
      console.error('[webhook] TELEGRAM_WEBHOOK_SECRET is not set in production; rejecting update.');
      return new Response('Service unavailable', { status: 503 });
    }
    console.warn('[webhook] TELEGRAM_WEBHOOK_SECRET is not set; accepting unauthenticated update (non-production).');
  } else {
    const secret = request.headers.get('x-telegram-bot-api-secret-token');
    if (!secret || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Unauthorized secret token', { status: 401 });
    }
  }

  const bot = createBot(env, (promise) => ctx.waitUntil(promise));
  if (cachedBotInfo) {
    bot.botInfo = cachedBotInfo;
  } else {
    await bot.init();
    cachedBotInfo = bot.botInfo;
  }
  const handleUpdate = webhookCallback(bot, 'cloudflare-mod');
  return handleUpdate(request);
}
