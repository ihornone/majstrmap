import { Composer, InlineKeyboard } from 'grammy';
import type { BotCustomContext } from '../types';
import { masterMainMenuKeyboard, ratingKeyboard } from '../keyboards';
import { packCallback } from '../callbacks';
import { publicBaseUrl } from '../../config';

export const startComposer = new Composer<BotCustomContext>();

async function hasActiveProfileSession(ctx: BotCustomContext, userId: number): Promise<boolean> {
  const session = await ctx.repos.sessions.get(userId);
  return Boolean(session?.step.startsWith('profile_'));
}

startComposer.command('start', async (ctx) => {
  const text = ctx.message?.text || '';
  const parts = text.split(' ');
  const payload = parts[1] || '';
  const userId = ctx.from?.id;
  if (!userId) return;

  if (payload.startsWith('review_')) {
    const masterSlug = payload.replace('review_', '').trim();
    const master = await ctx.repos.masters.getBySlug(masterSlug);

    if (!master) {
      await ctx.reply(
        '⚠️ Майстра не знайдено або посилання застаріло.\nПеревірте посилання на сайті та спробуйте ще раз.',
        {}
      );
      return;
    }

    if (master.telegram_id === userId) {
      await ctx.reply('⚠️ Ви не можете залишити відгук самому собі.');
      return;
    }

    if (await hasActiveProfileSession(ctx, userId)) {
      await ctx.reply('Завершіть або скасуйте поточну дію: /cancel');
      return;
    }

    const existing = await ctx.repos.reviews.getByClientAndMaster(master.id, userId);
    if (existing) {
      await ctx.reply(
        `⭐️ Ви вже залишили відгук для майстра ${master.name}!\nВаша оцінка: ${'⭐'.repeat(existing.rating)}${existing.text ? `\n"${existing.text}"` : ''}`,
        master.telegram_id !== userId ? {reply_markup:new InlineKeyboard().text('Підтвердити співпрацю',packCallback({domain:'review',action:'collab_request',id:String(existing.id)}))} : {}
      );
      return;
    }

    await ctx.repos.sessions.set(userId, 'review_rating', {
      masterId: master.id,
      masterSlug: master.slug,
      masterName: master.name,
    });

    await ctx.reply(
      `⭐️ Залишити відгук для майстра ${master.name}\n\nОцініть роботу від 1 до 5 зірок. Один користувач може залишити лише один відгук кожному майстру.`,
      { reply_markup: ratingKeyboard() }
    );
    return;
  }

  const existingMaster = await ctx.repos.masters.getByTelegramId(userId);
  if (existingMaster) {
    if (existingMaster.status === 'inactive') {
      await ctx.reply(
        `👋 Вітаємо, ${existingMaster.name}!\n` +
        `Вашу анкету було тимчасово приховано з мапи через тривалу відсутність підтвердження активності.\n\n` +
        `Ви можете реактивувати її зараз:`,
        {
          reply_markup: new InlineKeyboard().text('🔄 Реактивувати анкету', packCallback({ domain: 'master', action: 'reactivate' })),
        }
      );
      return;
    }
    await ctx.reply(
      `👋 Вітаємо, ${existingMaster.name}!\n` +
      `Ви зареєстровані на Мапі майстрів України як ${existingMaster.city} (${existingMaster.status === 'active' ? '🟢 Опубліковано' : '🟡 Приховано'}).\n\n` +
      `Оберіть дію в меню:`,
      {
        reply_markup: masterMainMenuKeyboard(),
      }
    );
    return;
  }

  const welcomeKb = new InlineKeyboard()
    .text('🚀 Зареєструватися майстром', packCallback({ domain: 'reg', action: 'start' }))
    .row()
    .url('🗺 Відкрити мапу на сайті', publicBaseUrl(ctx.env));

  await ctx.reply(
    `🇺🇦 Мапа майстрів України\n\n` +
    `Це відкритий каталог спеціалістів: замовники обирають область, місто та напрямок, ` +
    `бачать вашу картку і зв'язуються напряму (телефон, Telegram, Viber, WhatsApp тощо).\n\n` +
    `✅ Без посередників та комісій\n` +
    `✅ Безкоштовна реєстрація за 2 хвилини\n` +
    `✅ Прямий зв'язок з клієнтами\n\n` +
    `Бажаєте додати свою анкету на мапу?`,
    {
      reply_markup: welcomeKb,
    }
  );
});

startComposer.command('cancel', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = await ctx.repos.sessions.get(userId);
  await ctx.repos.sessions.clear(userId);
  await ctx.reply(session ? 'Поточну дію скасовано.' : 'Активної дії немає — скасовувати нічого.');
});
