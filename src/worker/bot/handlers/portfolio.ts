import { Composer, InlineKeyboard } from 'grammy';
import type { BotCustomContext } from '../types';
import { packCallback, unpackCallback } from '../callbacks';
import { saveAvatarFromTelegram } from '../../services/media';
import { publicBaseUrl } from '../../config';

export const portfolioComposer = new Composer<BotCustomContext>();

const MAX_PORTFOLIO_ITEMS = 12;

export async function showPortfolioMenu(ctx: BotCustomContext, masterId: number, editMessage = false): Promise<void> {
  const master = await ctx.repos.masters.getById(masterId);
  if (!master) return;

  const items = await ctx.repos.portfolio.getByMasterId(masterId);
  const cardUrl = `${publicBaseUrl(ctx.env)}/master/${master.slug}`;

  let text = `🖼 <b>Ваше портфоліо робіт</b>\n\n`;
  text += `Завантажено робіт: <b>${items.length} / ${MAX_PORTFOLIO_ITEMS}</b>\n`;
  text += `Фото відображаються у вашій картці на сайті:\n🔗 ${cardUrl}\n\n`;

  if (items.length === 0) {
    text += `У вас поки немає завантажених робіт.\n`;
    text += `Натисніть <b>«➕ Додати роботу»</b> нижче та надішліть фото з коротким описом виконаної роботи.`;
  } else {
    text += `<b>Список робіт:</b>\n`;
    items.forEach((item, idx) => {
      const statusIcon = item.status === 'approved' ? '🟢' : item.status === 'rejected' ? '🔴' : '🟡';
      const statusNote = item.status === 'approved' ? '' : item.status === 'rejected' ? ' (відхилено)' : ' (на модерації)';
      text += `${idx + 1}. ${statusIcon} <b>${item.title}</b>${statusNote}${item.description ? ` — <i>${item.description}</i>` : ''}\n`;
    });
    text += `\nВи можете видалити будь-яку роботу або додати нову:`;
  }

  const kb = new InlineKeyboard();

  if (items.length < MAX_PORTFOLIO_ITEMS) {
    kb.text('➕ Додати роботу в портфоліо', packCallback({ domain: 'port', action: 'add_prompt' })).success().row();
  }

  items.forEach((item, idx) => {
    kb.text(`❌ Видалити #${idx + 1}`, packCallback({ domain: 'port', action: 'del_item', id: String(item.id) })).danger();
    if ((idx + 1) % 2 === 0) kb.row();
  });

  if (items.length % 2 !== 0) kb.row();

  kb.text('🔙 Головне меню', packCallback({ domain: 'master', action: 'main_menu' }));

  if (editMessage && ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb, link_preview_options: { is_disabled: true } });
      return;
    } catch {
    }
  }

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: kb,
    link_preview_options: { is_disabled: true },
  });
}

portfolioComposer.callbackQuery(/^{"domain":"port","action":"menu"/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) {
    await ctx.reply('Анкету не знайдено. Скористайтесь /start.');
    return;
  }
  await showPortfolioMenu(ctx, master.id, true);
});

portfolioComposer.callbackQuery(/^{"domain":"port","action":"add_prompt"/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) return;

  const items = await ctx.repos.portfolio.getByMasterId(master.id);
  if (items.length >= MAX_PORTFOLIO_ITEMS) {
    await ctx.reply(`Досягнуто ліміт робіт (${MAX_PORTFOLIO_ITEMS}). Видаліть застарілі роботи, щоб додати нові.`);
    return;
  }

  await ctx.repos.sessions.set(ctx.from.id, 'portfolio_upload', { masterId: master.id });

  const cancelKb = new InlineKeyboard().text('❌ Скасувати', packCallback({ domain: 'port', action: 'menu' })).danger();

  await ctx.reply(
    `📸 <b>Надішліть фото виконаної роботи</b>\n\n` +
    `💡 <b>Порада:</b> додайте до фото короткий підпис (наприклад: <i>«Встановлення кухні під ключ, Львів»</i> або <i>«Заміна стояків опалення»</i>). ` +
    `Цей підпис стане назвою роботи в галереї.\n\n` +
    `⚠️ <b>Безпека (Zero Geo-Leak):</b> Метадані (EXIF, координати GPS) стираються автоматично під час збереження. ` +
    `Заборонено надсилати фото з адресними табличками, номерами авто чи військовими об'єктами.`,
    { parse_mode: 'HTML', reply_markup: cancelKb }
  );
});

portfolioComposer.callbackQuery(/^{"domain":"port","action":"del_item"/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const data = unpackCallback(ctx.callbackQuery.data);
  const itemId = Number(data?.id);
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master || !itemId) return;

  await ctx.repos.portfolio.delete(itemId, master.id);
  await ctx.answerCallbackQuery({ text: 'Роботу видалено' });
  await showPortfolioMenu(ctx, master.id, true);
});

portfolioComposer.on(':photo', async (ctx, next) => {
  if (!ctx.from || !ctx.message) return next();
  const session = await ctx.repos.sessions.get(ctx.from.id);
  if (session?.step !== 'portfolio_upload') {
    return next();
  }

  const masterId = session.data?.masterId;
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master || master.id !== masterId) {
    await ctx.repos.sessions.clear(ctx.from.id);
    return next();
  }

  const photos = ctx.message.photo;
  const photo = photos[photos.length - 1];
  if (!photo) {
    await ctx.reply('Не вдалося отримати фото. Спробуйте ще раз.');
    return;
  }

  const statusMsg = await ctx.reply('⏳ Зберігаємо фото в безпечне сховище R2...');

  try {
    const imageKey = await saveAvatarFromTelegram(
      ctx.env.BUCKET,
      ctx.env.TELEGRAM_BOT_TOKEN!,
      photo.file_id,
      `portfolio/${master.id}`
    );

    const caption = ctx.message.caption?.trim();
    let title = 'Виконана робота';
    let description = '';

    if (caption) {
      const lines = caption.split('\n').map((l) => l.trim()).filter(Boolean);
      title = (lines[0] || 'Виконана робота').slice(0, 80);
      if (lines.length > 1) {
        description = lines.slice(1).join(' ').slice(0, 300);
      }
    }

    const newItem = await ctx.repos.portfolio.add({
      master_id: master.id,
      title,
      description: description || undefined,
      image_key: imageKey,
      sort_order: Date.now(),
      status: 'pending',
    });

    // Створюємо заявку на модерацію для адміна
    await ctx.repos.admin.createRequest('portfolio_item', master.id, {
      portfolioId: newItem.id,
      masterId: master.id,
      masterName: master.name,
      title,
      description: description || '',
      imageKey,
    });

    await ctx.repos.sessions.clear(ctx.from.id);

    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch {}

    await ctx.reply(
      `🟡 <b>Фото відправлено на модерацію!</b>\n\n` +
      `Назва: <b>${title}</b>\n` +
      `З міркувань безпеки (Zero Geo-Leak) модератор перевірить відсутність військових об'єктів та точних адрес. ` +
      `Одразу після перевірки робота з'явиться у вашій галереї на сайті.`,
      {
        parse_mode: 'HTML',
      }
    );

    await showPortfolioMenu(ctx, master.id, false);
  } catch (err) {
    console.error('[portfolio] Failed to save portfolio photo:', err);
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch {}
    await ctx.reply('⚠️ Не вдалося зберегти фото. Будь ласка, спробуйте ще раз або перевірте розмір файлу.');
  }
});
