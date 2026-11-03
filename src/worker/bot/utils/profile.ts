import { availabilityLabel, validateAvailability, type Availability } from '../../../shared/master-tools';
import { parseWorkConditions, validateWorkConditions, workConditionRows, type WorkConditions } from '../../../shared/work-conditions';
import { parseContacts, validateContacts, contactValues, CONTACT_LABELS, type ContactKind, type MasterContacts } from '../../../shared/contacts';
import { REGION_OPTIONS } from '../../../shared/regions';
import { DEFAULT_PUBLIC_BASE_URL } from '../../config';

export interface ProfileDraft {
  name: string;
  region_id: string;
  city: string;
  category_primary: string;
  category_secondary: string | null;
  contacts: MasterContacts;
  experience_years: number;
  description: string;
  about: string;
  price_start?: number;
  avatar_key: string | null;
  work_conditions?: WorkConditions;
  availability?: Availability;
  services: Array<{ name: string; price: string }>;
}
export const profileFields = ['name', 'category_primary', 'category_secondary', 'region_id', 'city', 'contacts', 'experience_years', 'description', 'about', 'services', 'avatar_key', 'work_conditions'] as const;
export type ProfileField = typeof profileFields[number];
export const fieldLabels: Record<ProfileField, string> = {
  work_conditions: 'Умови роботи',
  name: 'Ім’я / назва', category_primary: 'Основна категорія', category_secondary: 'Додаткова категорія', region_id: 'Область', city: 'Місто', contacts: 'Контакти та соцмережі', experience_years: 'Стаж роботи', description: 'Короткий опис', about: 'Докладно про майстра', services: 'Послуги та ціни', avatar_key: 'Фото / логотип',
};
export const fieldPrompts: Record<ProfileField, string> = {
  work_conditions: 'Усі умови можна пропустити кнопкою «Не вказувати». Або дайте 7 відповідей по одній на рядок у порядку нижче (можна без назв полів) чи напишіть кожен рядок як «Назва: значення».\n\nВиїзд: місто / околиці / ні / не вказано\nРадіус: число в км (лише якщо обрали «околиці»; інакше не вказано)\nДні: пн, вт, ср, чт, пт, сб, нд\nГодини: 09:00-18:00 або за домовленістю\nАварійний: так / ні / не вказано\nАварійні години: цілодобово або 09:00-18:00 (лише якщо «Аварійний: так»; інакше не вказано)\nВиїзд коштує: безкоштовно / 150 / договірна (лише для виїзду в місто чи околиці)\n\nПриклад для роботи лише в місті:\nні\nне вказано\nпн, вт, ср, чт, пт\nза домовленістю\nні\nне вказано\nне вказано\n\nПри редагуванні цей блок замінюється повністю.',
  name: 'Введіть ваше ім’я або назву майстерні (2–60 символів).',
  category_primary: 'Оберіть основну категорію.', category_secondary: 'Оберіть додаткову категорію або «Без додаткової».',
  region_id: 'Оберіть область.', city: 'Введіть місто або населений пункт (2–50 символів).',
  contacts: 'Телефон і всі соцмережі добровільні. Можна пропустити цей крок.\nВведіть лише бажані контакти окремими рядками:\nТелефон: +380671234567\nViber: +380671234567\nFacebook: https://facebook.com/username\nInstagram: @username\nTelegram: @username\nWhatsApp: +380671234567\nSignal: посилання signal.me з додатка\nYouTube: посилання або @username\nThreads: посилання або @username\nСайт: https://example.com\n\nКілька номерів або акаунтів — повторіть назву контакту з нового рядка. Наприклад:\nТелефон: +380671234567\nТелефон: +380931234567\nViber: +380671234567\nViber: +380931234567\n\nTelegram автоматично не додається. Можна вказати інший акаунт або окремо обрати свій кнопкою.\n\nДодавайте лише наявні контакти. Цей список повністю замінить попередні контакти.',
  experience_years: 'Вкажіть стаж роботи в повних роках, від 0 до 80. Для початківця — 0.',
  description: 'Напишіть короткий опис своєї роботи (10–400 символів).',
  about: 'Розкажіть докладніше про досвід, підхід і гарантії (10–1500 символів).',
  services: 'Вкажіть від 1 до 10 послуг. Кожна — з нового рядка, назву й ціну розділіть знаком |\nНаприклад:\nРозробка сайтів | від 1000 ₴\nКонсультація | договірна',
  avatar_key: 'Надішліть фото або логотип. Або натисніть «Без фото»; при редагуванні можна залишити поточне.',
};
export function parseField(field: ProfileField, text: string): unknown {
  const value = text.trim();
  if (field === 'work_conditions') return parseWorkConditions(value);
  if (field === 'contacts') {
    const contacts = parseContacts(value);
    return contacts;
  }
  if (field === 'experience_years') {
    const max = 80;
    if (!/^\d+$/.test(value) || Number(value) > max) throw new Error(`Введіть ціле число від 0 до ${max}.`);
    return Number(value);
  }
  if (field === 'services') {
    const rows = value.split('\n').filter(Boolean).map(line => {
      const i = line.indexOf('|');
      if (i < 1) throw new Error('Відділіть назву послуги від ціни знаком |.');
      const name = line.slice(0, i).trim(), price = line.slice(i + 1).trim();
      if (!name || name.length > 120 || !price || price.length > 80) throw new Error('Назва послуги — до 120 символів, ціна — до 80.');
      return { name, price };
    });
    if (rows.length < 1 || rows.length > 10) throw new Error('Додайте від 1 до 10 послуг.');
    return rows;
  }
  const bounds: Partial<Record<ProfileField, [number, number]>> = { name: [2, 60], city: [2, 50], description: [10, 400], about: [10, 1500] };
  const bound = bounds[field];
  if (bound && (value.length < bound[0] || value.length > bound[1])) throw new Error(`Потрібно від ${bound[0]} до ${bound[1]} символів.`);
  return value;
}
export function validateDraft(d: ProfileDraft): void {
  for (const field of ['name','city','description','about','experience_years'] as const) parseField(field, String(d[field] ?? ''));
  if (!REGION_OPTIONS[d.region_id] || !d.category_primary) throw new Error('Оберіть область і категорію.');
  validateContacts(d.contacts);
  validateWorkConditions(d.work_conditions || {});
  validateAvailability(d.availability || {});
  parseField('services', (d.services || []).map(s => `${s.name}|${s.price}`).join('\n'));
}
export function profileSummary(d: ProfileDraft, telegramId: number, baseUrl: string = DEFAULT_PUBLIC_BASE_URL): string {
  return `Telegram ID: ${telegramId}\nІм’я: ${d.name}\nОбласть: ${REGION_OPTIONS[d.region_id] || d.region_id}\nМісто: ${d.city}\nКатегорія: ${d.category_primary}\nДодаткова: ${d.category_secondary || 'немає'}\nСтаж: ${d.experience_years} р.\nДоступність: ${availabilityLabel(d.availability) || 'Не вказана або строк минув'}\n\nКонтакти:\n${Object.entries(d.contacts).flatMap(([k,v]) => contactValues(v).map(value => `${CONTACT_LABELS[k as ContactKind]}: ${value}`)).join('\n') || 'Не вказані'}\n\nУмови роботи:\n${workConditionRows(d.work_conditions).map(([k,v])=>`${k}: ${v}`).join('\n')}\n\nОпис: ${d.description}\n\nПро майстра: ${d.about}\n\nПослуги:\n${d.services.map(s => `${s.name} — ${s.price}`).join('\n')}\n\nФото: ${d.avatar_key ? (/^https?:\/\//.test(d.avatar_key) ? d.avatar_key : `${baseUrl}/api/media/${encodeURI(d.avatar_key)}`) : 'немає'}`;
}
