export const CONTACT_LABELS = {
  phone: 'Телефон', viber: 'Viber', facebook: 'Facebook', instagram: 'Instagram',
  telegram: 'Telegram', whatsapp: 'WhatsApp', signal: 'Signal', youtube: 'YouTube', threads: 'Threads', website: 'Сайт',
} as const;
export type ContactKind = keyof typeof CONTACT_LABELS;
export type MasterContacts = Partial<Record<ContactKind, string | string[]>>;
export const CONTACT_KINDS = Object.keys(CONTACT_LABELS) as ContactKind[];

export function contactUrl(kind: ContactKind, value: string): string | null {
  if (!CONTACT_KINDS.includes(kind) || typeof value !== 'string') return null;
  const input = value.trim();
  if (!input) return null;
  if (kind === 'website') {
    try {
      if (/^[a-z][a-z0-9+.-]*:/i.test(input) && !/^https?:\/\//i.test(input)) return null;
      const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) return null;
      return url.href;
    } catch { return null; }
  }
  if (kind === 'phone' || kind === 'viber' || kind === 'whatsapp') {
    const digits = input.replace(/[\s()+.-]/g, '');
    if (!/^\d{7,15}$/.test(digits)) return null;
    if (kind === 'phone') return `tel:+${digits}`;
    if (kind === 'viber') return `viber://chat?number=%2B${digits}`;
    return `https://wa.me/${digits}`;
  }
  const hosts = {
    facebook: ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com'],
    instagram: ['instagram.com', 'www.instagram.com'], telegram: ['t.me', 'www.t.me'], signal: ['signal.me'],
    youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
    threads: ['threads.com', 'www.threads.com', 'threads.net', 'www.threads.net'],
  };
  if (/^(https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.com|instagram\.com|t\.me|signal\.me|youtube\.com|youtu\.be|threads\.com|threads\.net)\//i.test(input)) {
    try {
      const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      if (!hosts[kind].includes(url.hostname.toLowerCase()) || url.username || url.password || url.port) return null;
      url.protocol = 'https:';
      return url.href;
    } catch { return null; }
  }
  if (kind === 'signal') return null;
  const handle = input.replace(/^@/, '');
  if (!/^[\p{L}\p{N}._-]+$/u.test(handle)) return null;
  const host = kind === 'facebook' ? 'facebook.com' : kind === 'instagram' ? 'instagram.com' : kind === 'youtube' ? 'youtube.com' : kind === 'threads' ? 'threads.com' : 't.me';
  return `https://${host}/${kind === 'youtube' || kind === 'threads' ? '@' : ''}${encodeURIComponent(handle)}`;
}

export function parseContacts(text: string): MasterContacts {
  const contacts: MasterContacts = {};
  const labels: Record<string, ContactKind> = { phone: 'phone', телефон: 'phone', viber: 'viber', вайбер: 'viber', facebook: 'facebook', фейсбук: 'facebook', instagram: 'instagram', інстаграм: 'instagram', інстграм: 'instagram', telegram: 'telegram', телеграм: 'telegram', whatsapp: 'whatsapp', ватсап: 'whatsapp', signal: 'signal', сигнал: 'signal', youtube: 'youtube', ютуб: 'youtube', threads: 'threads', тредс: 'threads', website: 'website', site: 'website', сайт: 'website', вебсайт: 'website' };
  for (const line of text.split('\n').filter(s => s.trim())) {
    const match = line.match(/^\s*([^:]+):\s*(.+)$/);
    const kind = match ? labels[match[1]?.trim().toLowerCase() ?? ''] ?? undefined : 'phone';
    const value = match ? (match[2]?.trim() ?? '') : line.trim();
    if (!kind || !contactUrl(kind, value)) throw new Error('Перевірте назву мережі та формат контакту.');
    const values = contactValues(contacts[kind]);
    if (!values.some(previous => contactUrl(kind, previous) === contactUrl(kind, value))) values.push(value);
    contacts[kind] = values.length === 1 ? values[0] : values;
  }
  validateContacts(contacts);
  return contacts;
}


export function contactValues(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function validateContacts(contacts: MasterContacts): void {
  if (!contacts || typeof contacts !== 'object' || Array.isArray(contacts)) throw new Error('Перевірте контакти.');
  let count = 0;
  for (const [key, value] of Object.entries(contacts)) {
    const values = contactValues(value);
    if (!CONTACT_KINDS.includes(key as ContactKind) || !values.length || values.length > 10 || values.some(v => typeof v !== 'string' || v.length > 500 || !contactUrl(key as ContactKind, v))) {
      throw new Error('Перевірте контакти: до 10 контактів кожного типу, до 500 символів у посиланні.');
    }
    count += values.length;
  }
  if (count > 30) throw new Error('Можна додати до 30 контактів загалом.');
}

export function mergeContacts(current: MasterContacts, added: MasterContacts): MasterContacts {
  const result: MasterContacts = { ...current };
  for (const kind of CONTACT_KINDS) {
    if (!added[kind]) continue;
    const values = [...contactValues(current[kind]), ...contactValues(added[kind])];
    const unique = values.filter((value, i) => values.findIndex(v => contactUrl(kind, v) === contactUrl(kind, value)) === i);
    result[kind] = unique.length === 1 ? unique[0] : unique;
  }
  validateContacts(result);
  return result;
}
