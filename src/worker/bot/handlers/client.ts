import { Composer,InlineKeyboard } from 'grammy';
import type { BotCustomContext } from '../types';
import { packCallback,unpackCallback } from '../callbacks';
import { REGION_OPTIONS } from '../../../shared/regions';
import { publicBaseUrl } from '../../config';
export const clientComposer=new Composer<BotCustomContext>();
const cb=(action:string,id?:string)=>packCallback({domain:'client',action,...(id?{id}:{})});
clientComposer.command('start',async(ctx,next)=>{
 const payload=ctx.match.trim();
 if(payload.startsWith('save_')){
  const m=await ctx.repos.masters.getBySlug(payload.slice(5));if(!m){await ctx.reply('Анкета недоступна.');return;}
  await ctx.reply(`Зберегти ${m.name} у вашому списку Telegram?`,{reply_markup:new InlineKeyboard().text('Зберегти',cb('save',String(m.id)))});return;
 }
 if(!payload.startsWith('follow_'))return next();
 const existing=await ctx.repos.sessions.get(ctx.from!.id);
 if(existing?.step.startsWith('profile_')){await ctx.reply('Завершіть або скасуйте поточну дію: /cancel');return;}
 const region=payload.slice(7);if(!REGION_OPTIONS[region]){await ctx.reply('Область не знайдено.');return;}
 const filters=await ctx.repos.masters.getRegionFilters(region);
 const categories=filters.categories as Array<{id:string;name:string}>;
 await ctx.repos.sessions.set(ctx.from!.id,'client_follow_category',{region,categories,cities:filters.cities});
 const kb=new InlineKeyboard().text('Усі категорії',cb('cat','all')).row();
 categories.forEach((c,i)=>kb.text(c.name,cb('cat',String(i))).row());
 await ctx.reply(`Оновлення майстрів: ${REGION_OPTIONS[region]}. Оберіть категорію. Підписку ще не увімкнено.`,{reply_markup:kb});
});
clientComposer.command('saved',async ctx=>{
 const rows=await ctx.repos.client.listSavedMasters(ctx.from!.id);
 if(!rows.length){await ctx.reply('Ще немає збережених майстрів. Скористайтеся кнопкою «Зберегти в Telegram» у профілі на сайті.');return;}
 for(const m of rows)await ctx.reply(`${m.name}\n${publicBaseUrl(ctx.env)}/master/${m.slug}`,{reply_markup:new InlineKeyboard().text('Прибрати зі збережених',cb('unsave',String(m.id)))});
});
clientComposer.command('subscriptions',async ctx=>{
 const rows=await ctx.repos.client.listSubscriptions(ctx.from!.id);
 if(!rows.length)await ctx.reply('Активних підписок немає. Підписатися можна на сторінці області на сайті.');
 for(const row of rows){const cat=row.category_id==='all'?'Усі категорії':(await ctx.repos.categories.getById(row.category_id))?.name||row.category_id;await ctx.reply(`${REGION_OPTIONS[row.region_id]} · ${row.city||'Усі міста'} · ${cat}\nНе частіше одного повідомлення на тиждень, лише якщо є нові майстри.`,{reply_markup:new InlineKeyboard().text('Відписатися',cb('unsubscribe',String(row.id)))});}
});
clientComposer.callbackQuery(/^{"domain":"client","action":/,async ctx=>{
 await ctx.answerCallbackQuery();const data=unpackCallback(ctx.callbackQuery.data);if(!data)return;
 const userId=ctx.from.id,id=Number(data.id);
 if(data.action==='save'){
  await ctx.repos.client.saveMaster(userId,id);
  await ctx.reply('Збережено. Ваш список: /saved');return;
 }
 if(data.action==='unsave'){await ctx.repos.client.unsaveMaster(userId,id);await ctx.reply('Прибрано зі збережених.');return;}
 if(data.action==='unsubscribe_all'){
  await ctx.repos.client.deactivateAllSubscriptions(userId);
  await ctx.reply('Усі щотижневі оновлення вимкнено.');return;
 }
 if(data.action==='unsubscribe'){
  await ctx.repos.client.deactivateSubscription(id,userId);
  await ctx.reply('Підписку вимкнено.');return;
 }
 if(data.action==='remind'){
  const created=await ctx.repos.client.createServiceReminder(id,userId);
  await ctx.reply(created?'Увімкнено одне нагадування через місяць від сьогодні. Відмовитися можна через /reminders.':'Нагадування вже налаштовано або підтверджена співпраця не знайдена.');return;
 }
 if(data.action==='reminder_off'){
  await ctx.repos.client.deactivateServiceReminder(id,userId);
  await ctx.reply('Нагадування вимкнено.');return;
 }
 const session=await ctx.repos.sessions.get(userId);if(!session)return;
 if(data.action==='cat'&&session.step==='client_follow_category'){
  const category=data.id==='all'?'all':session.data.categories[id]?.id;if(!category)return;
  const draft={...session.data,category};await ctx.repos.sessions.set(userId,'client_follow_city',draft);
  const kb=new InlineKeyboard().text('Усі міста області',cb('city','all')).row();session.data.cities.forEach((city:string,i:number)=>kb.text(city,cb('city',String(i))).row());
  await ctx.reply('Оберіть місто:',{reply_markup:kb});return;
 }
 if(data.action==='city'&&session.step==='client_follow_city'){
  const city=data.id==='all'?'':session.data.cities[id];if(city===undefined)return;
  await ctx.repos.sessions.set(userId,'client_follow_confirm',{...session.data,city});
  await ctx.reply(`Увімкнути повідомлення про нових майстрів?\n${REGION_OPTIONS[session.data.region]} · ${city||'Усі міста'}\nНе частіше одного разу на тиждень. Відписка — /subscriptions.`,{reply_markup:new InlineKeyboard().text('Так, підписатися',cb('sub')).text('Скасувати',cb('cancel'))});return;
 }
 if(data.action==='cancel'){await ctx.repos.sessions.clear(userId);await ctx.reply('Скасовано.');return;}
 if(data.action==='sub'&&session.step==='client_follow_confirm'){
  const d=session.data;await ctx.repos.client.upsertSubscription(userId,d.region,d.city,d.category);
  await ctx.repos.sessions.clear(userId);await ctx.reply('Підписку увімкнено. Повідомлятимемо лише про нових майстрів, не частіше одного разу на тиждень.');
 }
});
clientComposer.command('reminders',async ctx=>{
 const rows=await ctx.repos.client.listServiceReminders(ctx.from!.id);
 if(!rows.length)await ctx.reply('Активних нагадувань немає.');
 for(const r of rows)await ctx.reply(`Нагадування після співпраці: ${r.due_at.slice(0,10)}`,{reply_markup:new InlineKeyboard().text('Вимкнути',cb('reminder_off',String(r.review_id)))});
});
