import { mergeContacts, CONTACT_KINDS, CONTACT_LABELS, contactUrl, contactValues, type ContactKind } from '../../../shared/contacts';
import { Composer, InlineKeyboard } from 'grammy';
import type { BotCustomContext } from '../types';
import { unpackCallback, packCallback } from '../callbacks';
import { masterMainMenuKeyboard, subscribeCheckKeyboard } from '../keyboards';
import { slugify } from '../utils/slugify';
import { saveAvatarFromTelegram } from '../../services/media';
import { checkSubscription } from '../utils/subscription';
import { scheduleNotificationFlush } from '../utils/notifications';
import { channelUsername, publicBaseUrl } from '../../config';
import { REGION_OPTIONS } from '../../../shared/regions';
import { fieldLabels, fieldPrompts, profileFields, parseField, validateDraft, profileSummary, type ProfileDraft, type ProfileField } from '../utils/profile';

export const registrationComposer = new Composer<BotCustomContext>();
const cb = (action: string, id?: string) => packCallback({ domain: 'reg', action, ...(id ? { id } : {}) });

async function showPrompt(ctx: BotCustomContext, step: string, data: Record<string, any>, text: string, reply_markup: InlineKeyboard) {
  const previousId = Number(data.promptMessageId);
  if (Number.isInteger(previousId) && previousId > 0) {
    try {
      await ctx.api.deleteMessage(ctx.from!.id, previousId);
    } catch {
    }
  }
  const message = await ctx.reply(text, { reply_markup });
  data.promptMessageId = message.message_id;
  await ctx.repos.sessions.set(ctx.from!.id, step, data);
}

async function existingDraft(ctx: BotCustomContext): Promise<ProfileDraft | null> {
  const master = await ctx.repos.masters.getByTelegramId(ctx.from!.id);
  if (!master) return null;
  const latest = await ctx.repos.admin.getLatestProfileRequest(master.id);
  if (latest && (latest.status === 'pending' || master.status === 'pending')) return JSON.parse(latest.payload);
  return { ...master, contacts: JSON.parse(master.contacts), work_conditions: JSON.parse(master.work_conditions || '{}'), availability: JSON.parse(master.availability || '{}'), about: master.about || master.description, avatar_key: master.avatar_key || null, category_secondary: master.category_secondary || null, services: (await ctx.repos.services.getByMasterId(master.id)).map(s => ({ name: s.name, price: s.price })) };
}

async function askField(ctx: BotCustomContext, field: ProfileField, data: Record<string, any>) {
  if (field === 'contacts') delete data.explicitTelegram;
  const kb = new InlineKeyboard();
  if (field === 'category_primary' || field === 'category_secondary') {
    for (const cat of await ctx.repos.categories.listApproved()) kb.text(cat.name, cb('pick', cat.id)).row();
    kb.text('➕ Запропонувати свою категорію', cb('custom_cat')).row();
    if (field === 'category_secondary') kb.text('Без додаткової', cb('pick', '-')).row();
  } else if (field === 'work_conditions') {
    kb.text('Не вказувати', cb('skip_work')).row();
    if(data.edit) kb.text('Залишити поточні', cb('keep_work')).row();
  } else if (field === 'contacts') {
    if (ctx.from?.username) kb.text('Додати мій Telegram', cb('my_telegram')).row();
    if (data.edit) kb.text('Залишити поточні контакти', cb('keep_contacts')).row();
    for (const kind of CONTACT_KINDS) kb.text(CONTACT_LABELS[kind], cb('contact_kind', kind)).row();
    kb.text('Без контактів', cb('skip_contacts')).row();
  } else if (field === 'region_id') {
    let n = 0;
    for (const [id, name] of Object.entries(REGION_OPTIONS)) { kb.text(name, cb('pick', id)); if (++n % 2 === 0) kb.row(); }
    kb.row();
  } else if (field === 'avatar_key') {
    if (data.draft.avatar_key) kb.text('Залишити поточне', cb('keep_photo')).row();
    kb.text('Без фото', cb('no_photo')).row();
  }
  kb.text('❌ Скасувати', cb('cancel'));
  const prompt = field === 'contacts' ? 'Оберіть кнопкою тип контакту. Потім надішліть лише номер, @ім’я або посилання. Додавайте стільки контактів, скільки потрібно.' : fieldPrompts[field];
  await showPrompt(ctx, `profile_${field}`, data, `${fieldLabels[field]}${data.edit ? '' : ` — крок ${profileFields.indexOf(field)+1} з ${profileFields.length}`}\n\n${prompt}`, kb);
}

function contactValueKeyboard() {
  const kb = new InlineKeyboard();
  CONTACT_KINDS.forEach((kind, index) => {
    kb.text(`➕ ${CONTACT_LABELS[kind]}`, cb('contact_kind', kind));
    if (index % 2 === 1) kb.row();
  });
  if (CONTACT_KINDS.length % 2) kb.row();
  return kb.text('✅ Готово з контактами', cb('contacts_done')).row().text('❌ Скасувати', cb('cancel'));
}

function contactsProgress(contacts: ProfileDraft['contacts']): string {
  const added = CONTACT_KINDS.flatMap(kind => contactValues(contacts?.[kind]).map(value => `${CONTACT_LABELS[kind]}: ${value}`));
  return added.length ? `\n\nВже додані контакти:\n${added.map(value => `• ${value}`).join('\n')}` : '\n\nПоки контактів не додано.';
}

async function showEditMenu(ctx: BotCustomContext, draft: ProfileDraft) {
  const session = await ctx.repos.sessions.get(ctx.from!.id);
  const data = { edit: true, draft, ...(session?.data.promptMessageId ? { promptMessageId: session.data.promptMessageId } : {}) };
  const kb = new InlineKeyboard();
  for (const field of profileFields) kb.text(fieldLabels[field], cb('field', field)).row();
  kb.text('📨 Надіслати на модерацію', cb('submit')).row().text('❌ Скасувати', cb('cancel'));
  await showPrompt(ctx, 'profile_menu', data, 'Редагуйте потрібні поля. Після завершення натисніть «Надіслати на модерацію». До схвалення на сайті залишаться попередні дані.', kb);
}

export async function beginProfileEdit(ctx: BotCustomContext, field?: ProfileField) {
  const master = await ctx.repos.masters.getByTelegramId(ctx.from!.id);
  if (!master || master.status === 'banned') { await ctx.reply('Анкета недоступна для редагування.'); return; }
  const draft = await existingDraft(ctx);
  if (!draft) return;
  if (field) await askField(ctx, field, { edit: true, draft });
  else await showEditMenu(ctx, draft);
}

async function advance(ctx: BotCustomContext, field: ProfileField, data: Record<string, any>) {
  if (data.edit) { await showEditMenu(ctx, data.draft); return; }
  const next = profileFields[profileFields.indexOf(field)+1];
  if (next) { await askField(ctx,next,data); return; }
  await showSubmit(ctx, data);
}
async function showSubmit(ctx: BotCustomContext, data: Record<string, any>) {
  try {
    validateDraft(data.draft);
  } catch (err) {
    await ctx.repos.sessions.clear(ctx.from!.id);
    await ctx.reply(`Дані анкети пошкоджено (${(err as Error).message}). Почніть спочатку: /start`);
    return;
  }
  const summary = profileSummary(data.draft,ctx.from!.id,publicBaseUrl(ctx.env));
  for (let i=0;i<summary.length;i+=3500) await ctx.reply(summary.slice(i,i+3500));
  await showPrompt(ctx, 'profile_submit', data, 'Перевірте дані. Анкету та кожну зміну має схвалити модератор.', new InlineKeyboard().text('📨 Надіслати на модерацію',cb('submit')).row().text('✏️ Редагувати дані',cb('draft_edit')).row().text('❌ Скасувати',cb('cancel')));
}

registrationComposer.callbackQuery(/^{"domain":"reg","action":"start"/, async ctx => {
  await ctx.answerCallbackQuery();
  const existingMaster = await ctx.repos.masters.getByTelegramId(ctx.from.id);
  if (existingMaster) { await beginProfileEdit(ctx); return; }
  const activeSession = await ctx.repos.sessions.get(ctx.from.id);
  if (activeSession?.step.startsWith('profile_')) { await ctx.reply('Завершіть або скасуйте поточну дію: /cancel'); return; }
  await askField(ctx,'name',{ edit:false, draft:{ category_secondary:null, avatar_key:null } });
});
registrationComposer.callbackQuery(/^{"domain":"reg","action":"cancel"/, async ctx => {
  await ctx.answerCallbackQuery(); await ctx.repos.sessions.clear(ctx.from.id);
  try { await ctx.deleteMessage(); } catch {   }
  await ctx.reply('Зміни скасовано. Опубліковані дані не змінено.', {reply_markup:masterMainMenuKeyboard()});
});
registrationComposer.callbackQuery(/^{"domain":"reg","action":"(field|draft_edit)"/, async ctx => {
  await ctx.answerCallbackQuery();
  const session = await ctx.repos.sessions.get(ctx.from.id);
  if (!session || !session.step.startsWith('profile_')) return;
  const data = unpackCallback(ctx.callbackQuery.data);
  if (data?.action === 'draft_edit') { await showEditMenu(ctx,session.data.draft); return; }
  const field = data?.id as ProfileField;
  if (profileFields.includes(field)) await askField(ctx,field,{...session.data,edit:true});
});
registrationComposer.callbackQuery(/^{"domain":"reg","action":"(skip_work|keep_work)"/, async ctx => {
  await ctx.answerCallbackQuery();
  const session=await ctx.repos.sessions.get(ctx.from.id);
  if(!session||session.step!=='profile_work_conditions')return;
  if(unpackCallback(ctx.callbackQuery.data)?.action==='skip_work')session.data.draft.work_conditions={};
  await advance(ctx,'work_conditions',session.data);
});

registrationComposer.callbackQuery(/^{"domain":"reg","action":"(my_telegram|skip_contacts|keep_contacts)"/, async ctx => {
  await ctx.answerCallbackQuery();
  const session = await ctx.repos.sessions.get(ctx.from.id);
  if (!session || session.step !== 'profile_contacts') return;
  const action = unpackCallback(ctx.callbackQuery.data)?.action;
  if (action === 'my_telegram') {
    if (!ctx.from.username) { await ctx.reply('У вашому Telegram немає username. Вкажіть інший акаунт вручну або пропустіть контакти.'); return; }
    session.data.draft.contacts = mergeContacts(session.data.draft.contacts || {}, {telegram:`@${ctx.from.username}`});
    session.data.explicitTelegram = true;
    await showPrompt(ctx,'profile_contacts',session.data,`✅ Додано Telegram @${ctx.from.username}. Можете додати інші контакти або завершити крок.${contactsProgress(session.data.draft.contacts)}`,contactValueKeyboard());
    return;
  }
  if (action === 'skip_contacts') session.data.draft.contacts = {};
  else session.data.draft.contacts ||= {};
  await advance(ctx,'contacts',session.data);
});

registrationComposer.callbackQuery(/^\{"domain":"reg","action":"contact_kind"/, async ctx => {
  await ctx.answerCallbackQuery();
  const session = await ctx.repos.sessions.get(ctx.from.id);
  const parsed = unpackCallback(ctx.callbackQuery.data);
  const kind = parsed?.id as ContactKind | undefined;
  if (!session || session.step !== 'profile_contacts' || !kind || !CONTACT_KINDS.includes(kind)) return;
  session.data.contactKind = kind;
  const examples: Record<ContactKind, string> = { phone: '+380671234567', viber: '+380671234567', facebook: '@username або посилання', instagram: '@username', telegram: '@username', whatsapp: '+380671234567', signal: 'посилання signal.me', youtube: '@username або посилання', threads: '@username або посилання', website: 'https://example.com' };
  await showPrompt(ctx, 'profile_contact_value', session.data, `${CONTACT_LABELS[kind]}: надішліть лише значення. Наприклад: ${examples[kind]}${contactsProgress(session.data.draft.contacts)}`, new InlineKeyboard().text('⬅️ Назад до контактів', cb('contacts_back')).row().text('❌ Скасувати', cb('cancel')));
});

registrationComposer.callbackQuery(/^\{"domain":"reg","action":"(contacts_done|contacts_back)"/, async ctx => {
  await ctx.answerCallbackQuery();
  const session = await ctx.repos.sessions.get(ctx.from.id);
  const action = unpackCallback(ctx.callbackQuery.data)?.action;
  if (!session || !['profile_contacts','profile_contact_value'].includes(session.step)) return;
  if (action === 'contacts_back') {
    delete session.data.contactKind;
    await showPrompt(ctx, 'profile_contacts', session.data, `Оберіть тип наступного контакту або завершіть цей крок.${contactsProgress(session.data.draft.contacts)}`, contactValueKeyboard());
    return;
  }
  if (session.step !== 'profile_contacts') return;
  await advance(ctx, 'contacts', session.data);
});

registrationComposer.callbackQuery(/^{"domain":"reg","action":"custom_cat"/, async ctx => {
  await ctx.answerCallbackQuery();
  const session = await ctx.repos.sessions.get(ctx.from.id);
  if (!session || !['profile_category_primary','profile_category_secondary'].includes(session.step)) return;
  await ctx.repos.sessions.set(ctx.from.id,'profile_custom_category',{...session.data,categoryField:session.step.replace('profile_','')});
  await ctx.reply('Введіть назву своєї категорії (3–60 символів). Вона стане доступною лише після схвалення модератора.',{reply_markup:new InlineKeyboard().text('⬅️ До списку категорій',cb('category_back'))});
});
registrationComposer.callbackQuery(/^{"domain":"reg","action":"(category_resume|category_back)"/, async ctx => {
  await ctx.answerCallbackQuery();
  const session = await ctx.repos.sessions.get(ctx.from.id);
  const action = unpackCallback(ctx.callbackQuery.data);
  if (!session || !['profile_custom_category','profile_category_wait'].includes(session.step)) { await ctx.reply('Відкрийте /start та оберіть категорію в новій або відредагованій анкеті.'); return; }
  const field = session.data.categoryField as ProfileField;
  if (field !== 'category_primary' && field !== 'category_secondary') return;
  if (action?.action === 'category_resume') {
    const req = await ctx.repos.admin.getById(Number(action.id));
    if (!req || req.type !== 'new_category') return;
    const payload = JSON.parse(req.payload);
    if (payload.telegramId !== ctx.from.id || req.id !== session.data.categoryRequestId) { await ctx.reply('Ця заявка не відповідає поточній чернетці.'); return; }
    if (req.status === 'approved') {
      const category = await ctx.repos.categories.getById(payload.categoryId);
      if (!category?.approved) { await ctx.reply('Категорія більше недоступна.'); return; }
      session.data.draft[field] = category.id;
      await advance(ctx,field,session.data); return;
    }
    if (req.status === 'pending') { await ctx.reply('Категорія ще на модерації.'); return; }
  }
  await askField(ctx,field,session.data);
});

registrationComposer.callbackQuery(/^{"domain":"reg","action":"pick"/, async ctx => {
  await ctx.answerCallbackQuery();
  const session = await ctx.repos.sessions.get(ctx.from.id);
  if (!session) return;
  const field = session.step.replace('profile_','') as ProfileField;
  const id = unpackCallback(ctx.callbackQuery.data)?.id;
  if (!id) return;
  if (field === 'region_id') { if (!REGION_OPTIONS[id]) return; }
  else if (field === 'category_primary' || field === 'category_secondary') {
    if (id !== '-' && !(await ctx.repos.categories.listApproved()).some(c => c.id === id)) return;
    if (field === 'category_primary' && id === '-') return;
  } else return;
  session.data.draft[field] = id === '-' ? null : id;
  await advance(ctx,field,session.data);
});
registrationComposer.callbackQuery(/^{"domain":"reg","action":"(no_photo|keep_photo)"/, async ctx => {
  await ctx.answerCallbackQuery();
  const session = await ctx.repos.sessions.get(ctx.from.id);
  if (!session || session.step !== 'profile_avatar_key') return;
  if (unpackCallback(ctx.callbackQuery.data)?.action === 'no_photo') session.data.draft.avatar_key = null;
  await advance(ctx,'avatar_key',session.data);
});

registrationComposer.callbackQuery(/^{"domain":"reg","action":"(submit|check_sub)"/, async ctx => {
  const userId = ctx.from.id;
  const earlySession = await ctx.repos.sessions.get(userId);
  const submittingAt = earlySession?.data.submitting_at;
  if (typeof submittingAt === 'string' && !Number.isNaN(Date.parse(submittingAt)) && Date.now() - Date.parse(submittingAt) < 60_000) {
    await ctx.answerCallbackQuery({ text: 'Обробляється...' });
    return;
  }
  await ctx.answerCallbackQuery();
  const session = earlySession;
  if (!session || !['profile_submit','profile_menu','profile_subscribe'].includes(session.step)) { await ctx.reply('Форму оновлено. Відкрийте /start, щоб продовжити.'); return; }
  const draft = session.data.draft as ProfileDraft;
  try { validateDraft(draft); } catch(err) { await ctx.reply(`Перевірте анкету: ${(err as Error).message}`); await showEditMenu(ctx,draft); return; }
  const categories = await ctx.repos.categories.listApproved();
  if (![draft.category_primary,draft.category_secondary].filter(Boolean).every(id => categories.some(c=>c.id===id))) { await ctx.reply('Оберіть чинну категорію.'); return; }
  session.data.submitting_at = new Date().toISOString();
  await ctx.repos.sessions.set(userId, session.step, session.data);
  const subscription = await checkSubscription(ctx.api,ctx.me,ctx.env,userId);
  if (subscription !== 'subscribed') {
    delete session.data.submitting_at;  
    await ctx.repos.sessions.set(userId,'profile_subscribe',session.data);
    await ctx.reply(subscription === 'missing' ? 'Підпишіться на канал і повторіть перевірку.' : 'Не вдалося перевірити підписку. Бот має бути адміністратором каналу. Анкету збережено як чернетку; повторіть перевірку пізніше.', {reply_markup:subscribeCheckKeyboard(channelUsername(ctx.env))});
    return;
  }
  let master = await ctx.repos.masters.getByTelegramId(userId);
  if (master?.status === 'banned') { await ctx.reply('Анкету заблоковано. Зверніться до модератора.'); return; }
  if (!master) {
    master = await ctx.repos.masters.create({ ...draft, telegram_id:userId, slug:`${slugify(`${draft.name}-${draft.city}`).slice(0,42)}-${crypto.randomUUID().slice(0,6)}`, contacts:JSON.stringify(draft.contacts), status:'pending', channel_subscribed:1 });
  }
  const type = master.status === 'pending' ? 'new_profile' : 'edit_profile';
  const req = await ctx.repos.admin.submitProfile(master.id,type,draft);
  const summary = `📋 ${type === 'new_profile' ? 'Нова анкета' : 'Зміни анкети'} #${req.id}\nМайстер ID: ${master.id}\n\n${profileSummary(draft,userId,publicBaseUrl(ctx.env))}`;
  const markup = new InlineKeyboard().text('✅ Схвалити',packCallback({domain:'admin',action:'approve',id:String(req.id)})).text('❌ Відхилити',packCallback({domain:'admin',action:'reject',id:String(req.id)}));
  for (const adminId of (ctx.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number).filter(Boolean)) {
    for (let i=0;i<summary.length;i+=3500) await ctx.repos.admin.enqueue({event_key:`request:${req.id}:${adminId}:${i}`,recipient_telegram_id:adminId,text:summary.slice(i,i+3500),reply_markup_json:i+3500>=summary.length?JSON.stringify(markup):null});
  }
  await ctx.repos.sessions.clear(userId);
  await ctx.reply('✅ Анкету передано модератору. Публікація відбудеться після схвалення. Рішення надійде сюди.',{reply_markup:masterMainMenuKeyboard()});
  await scheduleNotificationFlush(ctx);
});

registrationComposer.on('message:text', async (ctx,next) => {
  if (ctx.message.text.startsWith('/')) return next();
  const session = await ctx.repos.sessions.get(ctx.from.id);
  if (!session || !session.step.startsWith('profile_')) return next();
  if (session.step === 'profile_contact_value') {
    const kind = session.data.contactKind as ContactKind;
    const value = ctx.message.text.trim();
    if (!kind || !CONTACT_KINDS.includes(kind) || !contactUrl(kind, value)) { await ctx.reply(`⚠️ Перевірте формат ${CONTACT_LABELS[kind] || 'контакту'} та надішліть значення ще раз.`); return; }
    try { session.data.draft.contacts = mergeContacts(session.data.draft.contacts || {}, { [kind]: value }); }
    catch (err) { await ctx.reply(`⚠️ ${(err as Error).message}`); return; }
    delete session.data.contactKind;
    await showPrompt(ctx, 'profile_contacts', session.data, `✅ ${CONTACT_LABELS[kind]} додано. Можете вибрати ще один тип або завершити.${contactsProgress(session.data.draft.contacts)}`, contactValueKeyboard());
    return;
  }
  if (session.step === 'profile_custom_category') {
    const name = ctx.message.text.trim().replace(/\s+/g,' ');
    if (name.length < 3 || name.length > 60) { await ctx.reply('Назва має містити від 3 до 60 символів.'); return; }
    const normalized = name.normalize('NFKC').toLocaleLowerCase('uk');
    const existing = (await ctx.repos.categories.listApproved()).find(c => c.name.normalize('NFKC').toLocaleLowerCase('uk').replace(/\s+/g,' ') === normalized);
    if (existing) {
      session.data.draft[session.data.categoryField] = existing.id;
      await ctx.reply('Така категорія вже є у списку. Її обрано для анкети.');
      await advance(ctx,session.data.categoryField,session.data); return;
    }
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalized));
    const categoryId = 'custom-' + Array.from(new Uint8Array(digest)).slice(0,10).map(b=>b.toString(16).padStart(2,'0')).join('');
    const master = await ctx.repos.masters.getByTelegramId(ctx.from.id);
    const req = await ctx.repos.admin.proposeCategory(master?.id || null,{telegramId:ctx.from.id,name,categoryId,field:session.data.categoryField,username:ctx.from.username,firstName:ctx.from.first_name});
    await ctx.repos.sessions.set(ctx.from.id,'profile_category_wait',{...session.data,categoryRequestId:req.id});
    const markup = new InlineKeyboard().text('✅ Схвалити',packCallback({domain:'admin',action:'approve',id:String(req.id)})).text('❌ Відхилити',packCallback({domain:'admin',action:'reject',id:String(req.id)}));
    for (const adminId of (ctx.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number).filter(Boolean)) {
      await ctx.repos.admin.enqueue({event_key:`category:${req.id}:${adminId}`,recipient_telegram_id:adminId,text:`➕ Нова категорія #${req.id}\nНазва: ${name}\nВід: ${ctx.from.first_name} ${ctx.from.username ? '@'+ctx.from.username : ''}\nTelegram ID: ${ctx.from.id}\nПоле анкети: ${fieldLabels[session.data.categoryField as ProfileField]}`,reply_markup_json:JSON.stringify(markup)});
    }
    await ctx.reply('Категорію передано на модерацію. Повідомимо рішення сюди. Чернетку анкети збережено.',{reply_markup:new InlineKeyboard().text('⬅️ Обрати іншу категорію',cb('category_back'))});
    await scheduleNotificationFlush(ctx); return;
  }
  const field = session.step.replace('profile_','') as ProfileField;
  if (!profileFields.includes(field) || ['category_primary','category_secondary','region_id','avatar_key'].includes(field)) { await ctx.reply('Скористайтеся кнопками поточного кроку або /start.'); return; }
  try {
    const value = parseField(field,ctx.message.text);
    session.data.draft[field] = field === 'contacts' && session.data.explicitTelegram ? {...session.data.draft.contacts,...value as object} : value;
  }
  catch(err) { await ctx.reply(`⚠️ ${(err as Error).message}\n\n${fieldPrompts[field]}`); return; }
  await advance(ctx,field,session.data);
});
registrationComposer.on('message:photo',async(ctx,next)=>{
  const session = await ctx.repos.sessions.get(ctx.from.id);
  if (!session || session.step !== 'profile_avatar_key') return next();
  const mediaGroupId = ctx.message.media_group_id;
  if (mediaGroupId && session.data.lastMediaGroupId === mediaGroupId) return;
  if (mediaGroupId) session.data.lastMediaGroupId = mediaGroupId;
  try {
    const photo = ctx.message.photo.at(-1)!;
    session.data.draft.avatar_key = await saveAvatarFromTelegram(ctx.env.BUCKET,ctx.env.TELEGRAM_BOT_TOKEN!,photo.file_id);
    await advance(ctx,'avatar_key',session.data);
  } catch { await ctx.reply('Фото не вдалося зберегти. Спробуйте ще раз.'); }
});

export async function stageContacts(ctx: BotCustomContext, contacts: ProfileDraft['contacts']) {
  const master = await ctx.repos.masters.getByTelegramId(ctx.from!.id);
  if (!master || master.status === 'banned') { await ctx.reply('Анкета недоступна.'); return; }
  const draft = await existingDraft(ctx);
  if (!draft) return;
  draft.contacts = mergeContacts(draft.contacts,contacts);
  await showEditMenu(ctx,draft);
}

export async function stageAvailability(ctx: BotCustomContext, availability: import('../../../shared/master-tools').Availability) {
  const master=await ctx.repos.masters.getByTelegramId(ctx.from!.id);
  if(!master||master.status==='banned'){await ctx.reply('Анкета недоступна.');return;}
  const draft=await existingDraft(ctx);if(!draft)return;
  draft.availability=availability;
  await showEditMenu(ctx,draft);
}
