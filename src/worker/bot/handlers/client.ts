import { Composer,InlineKeyboard } from 'grammy';
import type { BotCustomContext } from '../types';
import { packCallback,unpackCallback } from '../callbacks';
import { publicBaseUrl } from '../../config';
export const clientComposer=new Composer<BotCustomContext>();
const cb=(action:string,id?:string)=>packCallback({domain:'client',action,...(id?{id}:{})});
clientComposer.command('start',async(ctx,next)=>{
 const payload=ctx.match.trim();
 if(payload.startsWith('save_')){
  const m=await ctx.repos.masters.getBySlug(payload.slice(5));if(!m){await ctx.reply('Анкета недоступна.');return;}
  await ctx.reply(`Зберегти ${m.name} у вашому списку Telegram?`,{reply_markup:new InlineKeyboard().text('Зберегти',cb('save',String(m.id)))});return;
 }
 return next();
});
clientComposer.command('saved',async ctx=>{
 const rows=await ctx.repos.client.listSavedMasters(ctx.from!.id);
 if(!rows.length){await ctx.reply('Ще немає збережених майстрів. Скористайтеся кнопкою «Зберегти в Telegram» у профілі на сайті.');return;}
 for(const m of rows)await ctx.reply(`${m.name}\n${publicBaseUrl(ctx.env)}/master/${m.slug}`,{reply_markup:new InlineKeyboard().text('Прибрати зі збережених',cb('unsave',String(m.id)))});
});
clientComposer.callbackQuery(/^{"domain":"client","action":/,async ctx=>{
 await ctx.answerCallbackQuery();const data=unpackCallback(ctx.callbackQuery.data);if(!data)return;
 const userId=ctx.from.id,id=Number(data.id);
 if(data.action==='save'){
  await ctx.repos.client.saveMaster(userId,id);
  await ctx.reply('Збережено. Ваш список: /saved');return;
 }
 if(data.action==='unsave'){await ctx.repos.client.unsaveMaster(userId,id);await ctx.reply('Прибрано зі збережених.');return;}
 if(data.action==='remind'){
  const created=await ctx.repos.client.createServiceReminder(id,userId);
  await ctx.reply(created?'Увімкнено одне нагадування через місяць від сьогодні. Відмовитися можна через /reminders.':'Нагадування вже налаштовано або підтверджена співпраця не знайдена.');return;
 }
 if(data.action==='reminder_off'){
  await ctx.repos.client.deactivateServiceReminder(id,userId);
  await ctx.reply('Нагадування вимкнено.');return;
 }
});
clientComposer.command('reminders',async ctx=>{
 const rows=await ctx.repos.client.listServiceReminders(ctx.from!.id);
 if(!rows.length)await ctx.reply('Активних нагадувань немає.');
 for(const r of rows)await ctx.reply(`Нагадування після співпраці: ${r.due_at.slice(0,10)}`,{reply_markup:new InlineKeyboard().text('Вимкнути',cb('reminder_off',String(r.review_id)))});
});
