import { Composer, InlineKeyboard } from 'grammy';
import type { BotCustomContext } from '../types';
import { unpackCallback, packCallback } from '../callbacks';
import { profileSummary, validateDraft } from '../utils/profile';
import { checkSubscription } from '../utils/subscription';
import { scheduleNotificationFlush } from '../utils/notifications';
import { publicBaseUrl } from '../../config';

export const adminComposer = new Composer<BotCustomContext>();
const isAdmin=(ctx:BotCustomContext)=>(ctx.env.ADMIN_TELEGRAM_IDS||'').split(',').map(s=>s.trim()).includes(String(ctx.from?.id));
adminComposer.command('admin',async ctx=>{
  if(!isAdmin(ctx)){await ctx.reply('Немає доступу.');return;}
  const requests = await ctx.repos.admin.getPendingRequests();
  await ctx.reply(requests.length ? `Заявок на модерацію: ${requests.length}` : 'Немає заявок на модерацію.');
  for(const req of requests){
    const master = req.master_id ? await ctx.repos.masters.getById(req.master_id):null;
    const payload = JSON.parse(req.payload);
    const summary = `Заявка #${req.id} — ${req.type}\n\n` + (req.type==='new_profile'||req.type==='edit_profile' ? profileSummary(payload,master?.telegram_id||0,publicBaseUrl(ctx.env)) : JSON.stringify(payload,null,2));
    for(let i=0;i<summary.length;i+=3500) await ctx.reply(summary.slice(i,i+3500),i+3500>=summary.length ? {reply_markup:new InlineKeyboard().text('✅ Схвалити',packCallback({domain:'admin',action:'approve',id:String(req.id)})).text('❌ Відхилити',packCallback({domain:'admin',action:'reject',id:String(req.id)}))}:{});
  }
  await scheduleNotificationFlush(ctx);
});
adminComposer.callbackQuery(/^{"domain":"admin","action":"(approve|reject)"/,async ctx=>{
  await ctx.answerCallbackQuery();
  if(!isAdmin(ctx)){await ctx.reply('Немає прав.');return;}
  const data=unpackCallback(ctx.callbackQuery.data);
  const req=await ctx.repos.admin.getById(Number(data?.id));
  if(!req||req.status!=='pending'){await ctx.reply('Заявку вже розглянуто або замінено новішою.');return;}
  if (req.type === 'new_category') {
    const payload = JSON.parse(req.payload);
    if (!payload.telegramId || !/^custom-[a-f0-9]{20}$/.test(payload.categoryId || '') || typeof payload.name !== 'string' || payload.name.length < 3 || payload.name.length > 60) { await ctx.reply('Некоректна або застаріла заявка категорії.'); return; }
    const approved = data?.action === 'approve';
    const markup = new InlineKeyboard().text(approved ? 'Продовжити анкету' : 'Обрати категорію',packCallback({domain:'reg',action:'category_resume',id:String(req.id)}));
    const changed = await ctx.repos.admin.resolveCategory(req,approved,payload,{
      event_key:`category-decision:${req.id}`,
      recipient_telegram_id:payload.telegramId,
      text:`${approved ? '✅ Схвалено' : '❌ Відхилено'} категорію «${payload.name}». ${approved ? 'Продовжіть заповнення анкети кнопкою нижче.' : 'Оберіть іншу категорію або запропонуйте нову.'}`,
      reply_markup_json:JSON.stringify(markup),
    });
    if (!changed) { await ctx.reply('Заявку вже розглянуто.'); return; }
    await ctx.editMessageText((ctx.callbackQuery.message?.text || `Категорія #${req.id}`)+`\n\n${approved?'✅ Категорію схвалено':'❌ Категорію відхилено'}`);
    await scheduleNotificationFlush(ctx); return;
  }
  if(req.type!=='new_profile'&&req.type!=='edit_profile'){await ctx.reply('Це стара заявка. Майстер має подати зміни через редагування профілю.');return;}
  const master=req.master_id!=null?await ctx.repos.masters.getById(req.master_id):null;
  if(!master){await ctx.reply('Майстра вже видалено.');return;}
  const approved=data?.action==='approve';
  const draft=JSON.parse(req.payload);
  if(approved){
    if(master.status==='banned'){await ctx.reply('Майстра заблоковано.');return;}
    try{validateDraft(draft);}catch(err){await ctx.reply(`Анкета неповна: ${(err as Error).message}`);return;}
    const categories=await ctx.repos.categories.listApproved();
    if(![draft.category_primary,draft.category_secondary].filter(Boolean).every(id=>categories.some(c=>c.id===id))){await ctx.reply('Категорія більше недоступна. Відхиліть заявку для виправлення.');return;}
    const subscription=await checkSubscription(ctx.api,ctx.me,ctx.env,master.telegram_id);
    if(subscription!=='subscribed'){await ctx.reply(subscription==='missing'?'Майстер не підписаний на канал. Публікацію не виконано.':'Не вдалося перевірити підписку. Перевірте права адміністратора бота в каналі. Публікацію не виконано.');return;}
  }
  const changed=await ctx.repos.admin.resolveProfile(req,approved,draft,{
    event_key:`decision:${req.id}`,
    recipient_telegram_id:master.telegram_id,
    text:approved ? `✅ Вашу ${req.type === 'new_profile' ? 'анкету' : 'зміну анкети'} схвалено й опубліковано.\n${draft.name}` : `❌ Модератор відхилив ${req.type === 'new_profile' ? 'вашу анкету' : 'зміни анкети'}. Ви можете відредагувати дані й подати їх повторно через /start.`,
  });
  if(!changed){await ctx.reply('Заявку вже розглянуто або замінено.');return;}
  await ctx.editMessageText((ctx.callbackQuery.message?.text||`Заявка #${req.id}`)+`\n\nРішення: ${approved?'✅ Схвалено й опубліковано':'❌ Відхилено'}`);
  await scheduleNotificationFlush(ctx);
});
