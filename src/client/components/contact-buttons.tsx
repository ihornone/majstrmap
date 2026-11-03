import { recordMetric } from '@/lib/engagement';
import { Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CONTACT_KINDS, CONTACT_LABELS, contactUrl, contactValues, type MasterContacts } from '../../shared/contacts';

export function ContactButtons({ contacts, className, masterId }: { contacts: MasterContacts; className?: string; masterId?: number }) {
  const links = CONTACT_KINDS.flatMap(kind => contactValues(contacts[kind]).flatMap(value => {
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
