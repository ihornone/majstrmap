import { useEffect, useState } from 'react';
import { Heart, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { getSavedSlugs, toggleSaved } from '@/lib/engagement';

export function SaveMasterButton({
  slug,
  compact = false,
}: {
  slug: string;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(() => getSavedSlugs().includes(slug));

  useEffect(() => {
    const update = () => setSaved(getSavedSlugs().includes(slug));
    window.addEventListener('majstrmap-saved', update);
    window.addEventListener('storage', update);
    update();
    return () => {
      window.removeEventListener('majstrmap-saved', update);
      window.removeEventListener('storage', update);
    };
  }, [slug]);

  const handleToggle = () => {
    try {
      const updated = toggleSaved(slug);
      const isNowSaved = updated.includes(slug);
      setSaved(isNowSaved);
      if (isNowSaved) {
        toast.success('Майстра збережено');
      } else {
        toast.info('Майстра вилучено зі збережених');
      }
    } catch {
      toast.error('Дозвольте збереження в браузері або збережіть у Telegram.');
    }
  };

  return (
    <span onClick={(e) => e.stopPropagation()}>
      <Button
        variant="threedOutline"
        size={compact ? 'icon' : 'sm'}
        className={compact ? 'h-9 w-9 shrink-0' : undefined}
        aria-label={compact ? (saved ? 'Прибрати зі збережених' : 'Зберегти майстра') : undefined}
        title={saved ? 'Прибрати зі збережених' : 'Зберегти майстра'}
        aria-pressed={saved}
        onClick={handleToggle}
      >
        <Heart className={saved ? 'fill-current text-rose-500' : ''} />
        {!compact && (saved ? 'Збережено' : 'Зберегти')}
      </Button>
    </span>
  );
}

export function ShareMasterButton({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const handleShare = async () => {
    const url = `${location.origin}/master/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} — MajstrMap`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Посилання скопійовано в буфер');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.info(`Посилання: ${url}`);
      }
    }
  };

  return (
    <Button variant="threedOutline" size="sm" onClick={handleShare}>
      <Share2 className="w-4 h-4 mr-1 text-[#0ea5e9]" />
      <span>Поділитися</span>
    </Button>
  );
}
