import { profileCompleteness, todayKyiv, validateAvailability } from '../../../shared/master-tools';
import { unpackCallback } from '../callbacks';
import { Composer, InlineKeyboard } from 'grammy';
import { parseContacts } from '../../../shared/contacts';
import type { BotCustomContext } from '../types';
import { packCallback } from '../callbacks';
import { masterMainMenuKeyboard } from '../keyboards';
import { beginProfileEdit, stageContacts } from './registration';
import { showPortfolioMenu } from './portfolio';
import { profileSummary } from '../utils/profile';
import { checkSubscription } from '../utils/subscription';
import { publicBaseUrl } from '../../config';

export const masterComposer = new Composer<BotCustomContext>();

masterComposer.hears('🖼 Портфоліо', async (ctx) => {
  if (!ctx.from) return;
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) {
    await ctx.reply('Анкету не знайдено. Скористайтесь /start.');
    return;
  }
  await showPortfolioMenu(ctx, master.id, false);
});

masterComposer.command('portfolio', async (ctx) => {
  if (!ctx.from) return;
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) {
    await ctx.reply('Анкету не знайдено. Скористайтесь /start.');
    return;
  }
  await showPortfolioMenu(ctx, master.id, false);
});

masterComposer.command('card', async (ctx) => {
  if (!ctx.from) return;
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) {
    await ctx.reply('Анкету не знайдено. Скористайтесь /start.');
    return;
  }
  const services = await ctx.repos.services.getByMasterId(master.id);
  const summary = profileSummary(
    {
      ...master,
      contacts: JSON.parse(master.contacts),
      work_conditions: JSON.parse(master.work_conditions || '{}'),
      availability: JSON.parse(master.availability || '{}'),
      category_secondary: master.category_secondary || null,
      avatar_key: master.avatar_key || null,
      about: master.about || master.description,
      services,
    },
    ctx.from.id,
    publicBaseUrl(ctx.env)
  );
  for (let i = 0; i < summary.length; i += 3500) await ctx.reply(summary.slice(i, i + 3500));
  await ctx.reply(
    `Статус: ${master.status === 'active' ? '🟢 Опубліковано' : '🟡 Не опубліковано'}\n` +
      `${master.reviews_count ? `Рейтинг: ${master.rating}, відгуків: ${master.reviews_count}` : 'Ще немає відгуків'}\n\n` +
      `🔗 ${publicBaseUrl(ctx.env)}/master/${master.slug}`,
    { reply_markup: masterMainMenuKeyboard() }
  );
});

masterComposer.command('stats', async (ctx) => {
  if (!ctx.from) return;
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) return;
  const counts = await ctx.repos.masters.getMetricsCounts(master.id);
  await ctx.reply(
    `📊 <b>Ваша статистика за останні 30 днів:</b>\n\n` +
      `👀 Переглядів картки: <b>${counts.view || 0}</b>\n` +
      `📞 Кліків на контакти: <b>${counts.contact || 0}</b>\n\n` +
      `🔗 Ваша картка: ${publicBaseUrl(ctx.env)}/master/${master.slug}`,
    { parse_mode: 'HTML', reply_markup: masterMainMenuKeyboard() }
  );
});

masterComposer.command('status', async (ctx) => {
  if (!ctx.from) return;
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) return;
  await ctx.reply(
    '⚡ <b>Оберіть ваш поточний статус зайнятості:</b>\n\nВін миттєво відображатиметься для клієнтів на сайті.',
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🟢 Зараз вільний', packCallback({ domain: 'master', action: 'free' }))
        .row()
        .text('🟡 Зайнятий сьогодні', packCallback({ domain: 'master', action: 'busy' }))
        .row()
        .text('📅 Приймаю з конкретної дати', packCallback({ domain: 'master', action: 'date' })),
    }
  );
});

masterComposer.hears('👤 Моя картка', async (ctx) => {
  if (!ctx.from) return;
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) {
    await ctx.reply('Анкету не знайдено. Скористайтесь /start.');
    return;
  }
  const services = await ctx.repos.services.getByMasterId(master.id);
  const summary = profileSummary(
    {
      ...master,
      contacts: JSON.parse(master.contacts),
      work_conditions: JSON.parse(master.work_conditions || '{}'),
      availability: JSON.parse(master.availability || '{}'),
      category_secondary: master.category_secondary || null,
      avatar_key: master.avatar_key || null,
      about: master.about || master.description,
      services,
    },
    ctx.from.id,
    publicBaseUrl(ctx.env)
  );
  for (let i = 0; i < summary.length; i += 3500) await ctx.reply(summary.slice(i, i + 3500));
  await ctx.reply(
    `Статус: ${master.status === 'active' ? '🟢 Опубліковано' : '🟡 Не опубліковано'}\n` +
      `${master.reviews_count ? `Рейтинг: ${master.rating}, відгуків: ${master.reviews_count}` : 'Ще немає відгуків'}\n\n` +
      `🔗 ${publicBaseUrl(ctx.env)}/master/${master.slug}`,
    { reply_markup: masterMainMenuKeyboard() }
  );
});

masterComposer.hears('📊 Статистика', async (ctx) => {
  if (!ctx.from) return;
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) return;
  const counts = await ctx.repos.masters.getMetricsCounts(master.id);
  await ctx.reply(
    `📊 <b>Ваша статистика за останні 30 днів:</b>\n\n` +
      `👀 Переглядів картки: <b>${counts.view || 0}</b>\n` +
      `📞 Кліків на контакти: <b>${counts.contact || 0}</b>\n\n` +
      `🔗 Ваша картка: ${publicBaseUrl(ctx.env)}/master/${master.slug}`,
    { parse_mode: 'HTML', reply_markup: masterMainMenuKeyboard() }
  );
});

masterComposer.hears('⚡ Доступність', async (ctx) => {
  if (!ctx.from) return;
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) return;
  await ctx.reply(
    '⚡ <b>Оберіть ваш поточний статус зайнятості:</b>\n\nВін миттєво відображатиметься для клієнтів на сайті.',
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🟢 Зараз вільний', packCallback({ domain: 'master', action: 'free' }))
        .row()
        .text('🟡 Зайнятий сьогодні', packCallback({ domain: 'master', action: 'busy' }))
        .row()
        .text('📅 Приймаю з конкретної дати', packCallback({ domain: 'master', action: 'date' })),
    }
  );
});
masterComposer.callbackQuery(/^{"domain":"master","action":"view_card"/,async ctx=>{
  await ctx.answerCallbackQuery();
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) { await ctx.reply('Анкету не знайдено. Скористайтесь /start.'); return; }
  const services = await ctx.repos.services.getByMasterId(master.id);
  const completeness=profileCompleteness({...master,contacts:JSON.parse(master.contacts),work_conditions:JSON.parse(master.work_conditions || '{}'),services});
  await ctx.reply(`Анкета заповнена на ${completeness.percent}%\n${completeness.tips.join('\n')}\n${completeness.reviewTip}`);
  const summary = profileSummary({...master, contacts:JSON.parse(master.contacts), work_conditions:JSON.parse(master.work_conditions || '{}'), availability:JSON.parse(master.availability || '{}'), category_secondary:master.category_secondary||null, avatar_key:master.avatar_key||null, about:master.about||master.description, services},ctx.from.id,publicBaseUrl(ctx.env));
  for(let i=0;i<summary.length;i+=3500) await ctx.reply(summary.slice(i,i+3500));
  await ctx.reply(`Статус: ${master.status === 'active' ? 'Опубліковано' : 'Не опубліковано'}\n${master.reviews_count ? `Рейтинг: ${master.rating}, відгуків: ${master.reviews_count}` : 'Ще немає відгуків'}\n\n${publicBaseUrl(ctx.env)}/master/${master.slug}`,{reply_markup:masterMainMenuKeyboard()});
});
masterComposer.callbackQuery(/^{"domain":"master","action":"(edit_menu|edit_contacts|services_menu|req_category|add_service|del_service)"/,async ctx=>{
  await ctx.answerCallbackQuery();
  const action = JSON.parse(ctx.callbackQuery.data).action;
  await beginProfileEdit(ctx,action==='edit_contacts'?'contacts': ['services_menu','add_service','del_service'].includes(action)?'services': action==='req_category'?'category_primary':undefined);
});
masterComposer.callbackQuery(/^{"domain":"master","action":"gen_code"/,async ctx=>{
  await ctx.answerCallbackQuery();
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if(master) await ctx.reply(`Код угоди більше не потрібний. Посилання для відгуку:\nhttps://t.me/${ctx.me.username}?start=review_${master.slug}`);
});
masterComposer.callbackQuery(/^{"domain":"master","action":"main_menu"/,async ctx=>{
  await ctx.answerCallbackQuery(); await ctx.repos.sessions.clear(ctx.from.id);
  await ctx.reply('Меню майстра',{reply_markup:masterMainMenuKeyboard()});
});
masterComposer.callbackQuery(/^{"domain":"master","action":"reactivate"/,async ctx=>{
  await ctx.answerCallbackQuery();
  const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (!master) { await ctx.reply('Анкету не знайдено. Скористайтесь /start.'); return; }
  if (master.status === 'banned') { await ctx.reply('Анкету заблоковано. Зверніться до модератора.'); return; }
  if (master.status === 'pending') { await ctx.reply('Анкета ще на модерації — реактивувати поки нічого.'); return; }
  if (master.status === 'active') { await ctx.reply('Ваша анкета вже активна на мапі.'); return; }
  const subscription = await checkSubscription(ctx.api, ctx.me, ctx.env, ctx.from.id);
  if (subscription !== 'subscribed') {
    await ctx.reply(subscription === 'missing'
      ? 'Щоб реактивувати анкету, підпишіться на канал проєкту та натисніть кнопку ще раз.'
      : 'Не вдалося перевірити підписку. Спробуйте пізніше; якщо помилка повторюється, бот має бути адміністратором каналу.');
    return;
  }
  await ctx.repos.masters.update(ctx.from.id, {
    status: 'active',
    activity_check_state: 'resolved',
    last_activity_check: new Date().toISOString(),
  });
  await ctx.reply('✅ Анкету реактивовано — ви знову на мапі майстрів.');
});
masterComposer.command('contacts',async ctx=>{
  if (!ctx.match.trim()) { await beginProfileEdit(ctx,'contacts'); return; }
  try { await stageContacts(ctx,parseContacts(ctx.match)); }
  catch { await ctx.reply('Перевірте формат контактів. Приклад:\n/contacts\nInstagram: @username\nFacebook: https://facebook.com/username'); }
});
masterComposer.callbackQuery(/^{"domain":"master","action":"delete_confirm"/,async ctx=>{
  await ctx.answerCallbackQuery();
  await ctx.reply('Видалити анкету? Цю дію неможливо скасувати.',{reply_markup:new InlineKeyboard().text('Так, видалити',packCallback({domain:'master',action:'delete_do'})).row().text('Ні',packCallback({domain:'master',action:'main_menu'}))});
});
masterComposer.callbackQuery(/^{"domain":"master","action":"delete_do"/,async ctx=>{
  await ctx.answerCallbackQuery();
  await ctx.repos.masters.delete(ctx.from.id); await ctx.repos.sessions.clear(ctx.from.id);
  await ctx.reply('Анкету видалено.');
});

masterComposer.callbackQuery(/^{"domain":"master","action":"(stats|available|free|busy|date)"/,async ctx=>{
 await ctx.answerCallbackQuery();const master=await ctx.repos.masters.getByTelegramId(ctx.from.id);if(!master)return;
 const action=unpackCallback(ctx.callbackQuery.data)?.action;
 if(action==='stats'){
  const counts=await ctx.repos.masters.getMetricsCounts(master.id);
  await ctx.reply(`За останні 30 днів:\nПерегляди профілю: ${counts.view||0}\nНатискання контактів: ${counts.contact||0}\n\nЦе анонімні події з браузера, а не підтверджені повідомлення чи замовлення. Повторні дії одного сеансу за день не дублюються.\n\nВаше портфоліо: ${publicBaseUrl(ctx.env)}/master/${master.slug}`);return;
 }
 if(action==='available'){
  await ctx.reply('⚡ <b>Оберіть ваш статус зайнятості:</b>\n\nСтатус оновлюється миттєво на сайті без очікування модерації.',{
    parse_mode: 'HTML',
    reply_markup:new InlineKeyboard()
      .text('🟢 Зараз вільний',packCallback({domain:'master',action:'free'})).success()
      .row()
      .text('🟡 Зайнятий сьогодні',packCallback({domain:'master',action:'busy'}))
      .row()
      .text('📅 Приймаю з дати',packCallback({domain:'master',action:'date'}))
  });return;
 }
 if(action==='date'){
  await ctx.repos.sessions.set(ctx.from.id,'availability_date',{});await ctx.reply('Вкажіть дату: РРРР-ММ-ДД, наприклад 2026-11-20.');return;
 }
 const availability = { state: (action === 'free' ? 'free' : 'busy_today') as 'free' | 'busy_today', date: todayKyiv() };
 await ctx.repos.masters.update(ctx.from.id, { availability: JSON.stringify(availability) });
 await ctx.reply(`✅ <b>Статус успішно оновлено!</b>\nПоточний статус: ${action === 'free' ? '🟢 Зараз вільний' : '🟡 Зайнятий сьогодні'}\n\nВін вже активний на сайті.`, { parse_mode: 'HTML' });
});
masterComposer.on('message:text',async(ctx,next)=>{
 const session=await ctx.repos.sessions.get(ctx.from.id);if(session?.step!=='availability_date'||ctx.message.text.startsWith('/'))return next();
 const availability={state:'from_date' as const,date:ctx.message.text.trim()};
 try{validateAvailability(availability);if(availability.date<todayKyiv())throw new Error('Вкажіть сьогоднішню або майбутню дату.');}catch(err){await ctx.reply((err as Error).message);return;}
 await ctx.repos.masters.update(ctx.from.id, { availability: JSON.stringify(availability) });
 await ctx.repos.sessions.clear(ctx.from.id);
 await ctx.reply(`✅ <b>Статус успішно оновлено!</b>\nПрийом замовлень з дати: <b>${availability.date}</b>\n\nВін вже активний на сайті.`, { parse_mode: 'HTML' });
});
