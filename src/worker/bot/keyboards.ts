import { InlineKeyboard, Keyboard } from 'grammy';
import { packCallback } from './callbacks';

export function masterQuickReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text('🖼 Портфоліо').primary()
    .text('👤 Моя картка')
    .row()
    .text('📊 Статистика')
    .text('⚡ Доступність').success()
    .resized();
}

export function masterMainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🖼 Моє портфоліо', packCallback({ domain: 'port', action: 'menu' })).primary()
    .text('👤 Моя картка', packCallback({ domain: 'master', action: 'view_card' }))
    .row()
    .text('📊 Статистика', packCallback({ domain: 'master', action: 'stats' }))
    .text('⚡ Доступність', packCallback({ domain: 'master', action: 'available' })).success()
    .row()
    .text('🛠 Мої послуги', packCallback({ domain: 'master', action: 'services_menu' }))
    .text('✏️ Редагувати профіль', packCallback({ domain: 'master', action: 'edit_menu' }))
    .row()
    .text('📞 Контакти та соцмережі', packCallback({ domain: 'master', action: 'edit_contacts' }))
    .row()
    .text('📑 Зміна категорії', packCallback({ domain: 'master', action: 'req_category' }))
    .text('🗑 Видалити анкету', packCallback({ domain: 'master', action: 'delete_confirm' })).danger();
}

export function ratingKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (let stars = 1; stars <= 5; stars++) {
    kb.text(
      '⭐'.repeat(stars),
      packCallback({ domain: 'review', action: 'set_rating', val: stars })
    );
    if (stars === 3) kb.row();
  }
  return kb;
}

export function subscribeCheckKeyboard(channelUsername: string): InlineKeyboard {
  const cleanUsername = channelUsername.replace('@', '');
  return new InlineKeyboard()
    .url('📢 Підписатися на канал', `https://t.me/${cleanUsername}`).primary()
    .row()
    .text('✅ Я підписався, перевірити!', packCallback({ domain: 'reg', action: 'check_sub' })).success();
}

export function activityCheckKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Працюю', packCallback({ domain: 'cron', action: 'confirm_active' })).success()
    .text('⏸ Більше не працюю', packCallback({ domain: 'cron', action: 'pause_work' })).danger();
}
