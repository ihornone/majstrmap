import { Composer, InlineKeyboard } from 'grammy';
import type { BotCustomContext } from '../types';
import { unpackCallback, packCallback } from '../callbacks';
import { scheduleNotificationFlush } from '../utils/notifications';
export const reviewComposer=new Composer<BotCustomContext>();
reviewComposer.callbackQuery(/^{"domain":"review","action":"(collab_request|collab_confirm)"/,async ctx=>{
  await ctx.answerCallbackQuery();
  const data=unpackCallback(ctx.callbackQuery.data), id=Number(data?.id);
  if(!Number.isInteger(id)||id<1)return;
  let changed=false;
  if(data?.action==='collab_request'){
    const review=await ctx.repos.reviews.getCollaborationCandidate(id,ctx.from.id);
    if(review){
      const markup=new InlineKeyboard().text('Так, ми співпрацювали',packCallback({domain:'review',action:'collab_confirm',id:String(id)}));
      changed=await ctx.repos.reviews.insertClientCollaboration(id,{
        event_key:`collab-request:${id}`,
        recipient_telegram_id:review.master_telegram_id,
        text:`Клієнт ${review.client_name} підтвердив виконання замовлення.\nОцінка: ${review.rating}/5\n${review.text || 'Без тексту'}\n\nВи співпрацювали з цим клієнтом? Підтвердження добровільне й не впливає на публікацію відгуку.`,
        reply_markup_json:JSON.stringify(markup),
      });
    }
  } else {
    const review=await ctx.repos.reviews.getCollaborationConfirmationCandidate(id,ctx.from.id);
    if(review){
      const markup=new InlineKeyboard().text('Нагадати через місяць',packCallback({domain:'client',action:'remind',id:String(id)}));
      changed=await ctx.repos.reviews.insertMasterCollaboration(id,{
        event_key:`collab-confirmed:${id}`,
        recipient_telegram_id:review.client_telegram_id,
        text:'✅ Майстер також підтвердив співпрацю. Біля вашого відгуку з’явилася позначка «Угода підтверджена». За бажанням увімкніть одноразове нагадування через місяць.',
        reply_markup_json:JSON.stringify(markup),
      });
    }
  }
  await ctx.reply(changed ? (data?.action==='collab_request'?'Ваше підтвердження збережено. Запит надіслано майстру. Позначка з’явиться лише після підтвердження обома сторонами.':'Співпрацю підтверджено обома сторонами.') : 'Підтвердження недоступне або вже виконане. Підтвердити можуть лише клієнт і його майстер.');
  if(changed)await scheduleNotificationFlush(ctx);
});
reviewComposer.callbackQuery(/^{"domain":"review","action":"set_rating"/,async ctx=>{
  await ctx.answerCallbackQuery();
  const session=await ctx.repos.sessions.get(ctx.from.id);
  if(!session||session.step!=='review_rating'){await ctx.reply('Почніть відгук заново за посиланням майстра.');return;}
  const rating=Number(unpackCallback(ctx.callbackQuery.data)?.val);
  if(!Number.isInteger(rating)||rating<1||rating>5)return;
  await ctx.repos.sessions.set(ctx.from.id,'review_text',{...session.data,rating});
  await ctx.editMessageText(`Оцінка: ${rating}/5\n\nНапишіть відгук про майстра ${session.data.masterName} (до 2000 символів) або пропустіть текст.`,{reply_markup:new InlineKeyboard().text('Без тексту',packCallback({domain:'review',action:'skip_text'}))});
});
reviewComposer.callbackQuery(/^{"domain":"review","action":"skip_text"/,async ctx=>{
  await ctx.answerCallbackQuery();const session=await ctx.repos.sessions.get(ctx.from.id);
  if(session?.step==='review_text')await completeReview(ctx,session.data,null);
});
reviewComposer.on('message:text',async(ctx,next)=>{
  if(ctx.message.text.startsWith('/'))return next();
  const session=await ctx.repos.sessions.get(ctx.from.id);
  if(session?.step!=='review_text')return next();
  const text=ctx.message.text.trim();
  if(!text||text.length>2000){await ctx.reply('Відгук має містити від 1 до 2000 символів.');return;}
  await completeReview(ctx,session.data,text);
});
async function completeReview(ctx:BotCustomContext,data:Record<string,any>,text:string|null){
  const userId=ctx.from!.id;
  const master=await ctx.repos.masters.getBySlug(data.masterSlug);
  if(!master||master.id!==data.masterId){await ctx.reply('Анкета більше недоступна.');return;}
  if(master.telegram_id===userId){await ctx.repos.sessions.clear(userId);await ctx.reply('⚠️ Ви не можете залишити відгук самому собі.');return;}
  const clientName=ctx.from!.first_name||'Клієнт';
  const notification={
    event_key:`review:${master.id}:${userId}`,
    recipient_telegram_id:master.telegram_id,
    text:`⭐ Новий відгук про вас від ${clientName}\nОцінка: ${data.rating}/5\n\n${text || 'Відгук без тексту.'}`,
  };
  const result=await ctx.repos.reviews.createReview({masterId:master.id,masterTelegramId:master.telegram_id,clientTelegramId:userId,clientName,rating:data.rating,text},notification);
  if(!result.ok){
    if(result.reason==='duplicate'){await ctx.repos.sessions.clear(userId);await ctx.reply('Ви вже залишили відгук цьому майстру. Іншим майстрам можна залишати окремі відгуки.');return;}
    if(result.reason==='self'){await ctx.repos.sessions.clear(userId);await ctx.reply('⚠️ Ви не можете залишити відгук самому собі.');return;}
    await ctx.reply('Не вдалося зберегти відгук. Спробуйте ще раз.');return;
  }
  await ctx.repos.sessions.clear(userId);
  await ctx.reply(`Дякуємо! Відгук про ${master.name} опубліковано. Оцінка: ${data.rating}/5.\n\nЗа бажанням підтвердьте, що замовлення виконано. Для позначки «Угода підтверджена» потрібне також підтвердження майстра.`,master.telegram_id!==userId?{reply_markup:new InlineKeyboard().text('Підтвердити співпрацю',packCallback({domain:'review',action:'collab_request',id:String(result.review.id)}))}:{});
  await scheduleNotificationFlush(ctx);
}
