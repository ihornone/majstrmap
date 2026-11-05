import { useState } from 'react';
import { recordMetric } from '@/lib/engagement';
import { fetchMasterContacts } from '@/lib/api';
import { getTurnstileToken } from '@/lib/turnstile';
import { Eye, Globe, Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CONTACT_KINDS, CONTACT_LABELS, contactUrl, contactValues, type MasterContacts } from '../../shared/contacts';

// Розкриті за сесію контакти: повторний показ — без нового Turnstile-токена.
const contactsCache = new Map<string, MasterContacts>();

/** Контакти, вже розкриті цією сесією (після успішного reveal). */
export function getCachedContacts(slug: string): MasterContacts | undefined {
  return contactsCache.get(slug);
}

function notifyRevealed(slug: string): void {
  window.dispatchEvent(new CustomEvent('majstrmap-contacts', { detail: slug }));
}

export function ContactButtons({ contacts, slug, className, masterId }: { contacts?: MasterContacts; slug?: string; className?: string; masterId?: number }) {
  const [revealed, setRevealed] = useState<MasterContacts | undefined>(() => (slug ? contactsCache.get(slug) : undefined));
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const reveal = async () => {
    if (!slug || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const token = await getTurnstileToken();
      const res = await fetchMasterContacts(slug, token);
      if (!res.ok) throw new Error(`contacts request failed: ${res.status}`);
      contactsCache.set(slug, res.data.contacts);
      notifyRevealed(slug);
      setRevealed(res.data.contacts);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const showContacts = contacts ?? revealed;

  // Контакти приховані на сервері: спершу «Показати контакти» (Turnstile-токен — непомітно,
  // хіба що Cloudflare вимагатиме інтеракції). Якщо контактів немає — кнопка зникає після розкриття.
  if (!showContacts && slug) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {failed ? (
          <button type="button" onClick={() => void reveal()}
            className="text-xs text-slate-500 underline underline-offset-2 cursor-pointer hover:text-slate-700">
            Не вдалося завантажити контакти. Спробувати ще раз
          </button>
        ) : (
          <Button type="button" variant="threed" size="default" className="h-11 max-w-full px-4 text-xs sm:text-sm"
            onClick={() => void reveal()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            <span>Показати контакти</span>
          </Button>
        )}
      </div>
    );
  }
  if (!showContacts) return null;

  const links = CONTACT_KINDS.flatMap(kind => contactValues(showContacts[kind]).flatMap(value => {
    const href = contactUrl(kind, value);
    return href ? [{kind, value, href}] : [];
  }));
  if (!links.length) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {links.map(({kind, value, href}) => (
        <Button key={`${kind}:${href}`} asChild variant={kind === 'phone' ? 'threed' : 'threedIcon'}
          size={kind === 'phone' ? 'default' : 'icon'}
          className={kind === 'phone' ? 'h-11 max-w-full px-4 text-xs sm:text-sm' : 'h-11 w-11 p-2 shrink-0'}>
          <a onClick={()=>{if(masterId)recordMetric(masterId,'contact',kind);}} href={href} title={`${CONTACT_LABELS[kind]}: ${value}`} aria-label={`${CONTACT_LABELS[kind]}: ${value}`}
            target={kind === 'phone' || kind === 'viber' ? undefined : '_blank'} rel="noopener noreferrer">
            {kind === 'phone' ? <><Phone className="w-4 h-4" /><span>{value}</span></> : kind === 'website' ? <Globe className="!w-6 !h-6 text-[#0ea5e9]" /> :
              <img src={`/${kind}.svg`} alt="" aria-hidden="true" className="w-6 h-6 object-contain" width={24} height={24} />}
          </a>
        </Button>
      ))}
    </div>
  );
}
