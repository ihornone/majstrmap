import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { BOT_URL, CHANNEL_URL, PORTFOLIO_URL } from '@/lib/links';
import { Send } from 'lucide-react';

interface ProjectFooterSectionProps {
  id?: string;
  telegramChannelName?: string;
  creatorName?: string;
}

export function ProjectFooterSection({
  id = 'project-info',
  telegramChannelName = '@ihornone_official',
  creatorName = 'ihornone',
}: ProjectFooterSectionProps) {
  return (
    <section
      id={id}
      className="w-full bg-white px-4 sm:px-8 lg:px-12 pt-10 pb-16 sm:pb-20 flex flex-col gap-8"
    >
      { }
      <div className="text-left w-full flex flex-col items-start gap-2.5">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
          Інтерактивна мапа майстрів України
        </h2>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-4xl">
          Ваші клієнти шукають майстра поруч. Додайте себе на мапу, і вони знайдуть вас тут. Реєстрація безкоштовна, все через Telegram-бота. Після публікації картки ви отримуватимете статистику переглядів і звернень.
        </p>
      </div>

      { }
      <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6 py-6 border-y border-slate-200">
        <div className="flex flex-col gap-1.5 max-w-2xl text-left">
          <h3 className="text-xl sm:text-2xl font-semibold text-slate-900">
            Ви майстер?
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Додайте себе на мапу за 2 хвилини. Реєстрація безкоштовна, все через Telegram-бота. Клієнти з вашого міста знайдуть вас тут.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
          <Button
            variant="threed"
            size="default"
            onClick={() => window.open(BOT_URL, '_blank')}
            className="text-sm px-6 h-11"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Додати себе на мапу
          </Button>
          <p className="text-xs text-slate-500">
            Потрібна підписка на канал{' '}
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[#0ea5e9] underline font-semibold"
            >
              {telegramChannelName}
            </a>
            . Без оплат.
          </p>
        </div>
      </div>

      { }
      <footer className="w-full pt-2 flex flex-col gap-4 text-xs text-slate-600">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          { }
          <p className="text-sm text-slate-800 shrink-0">
            Проєкт створив <strong className="text-slate-900 font-bold">{creatorName}</strong>.
          </p>

          { }
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 font-medium">
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#0ea5e9] transition-colors underline font-semibold"
            >
              Telegram-канал
            </a>
            <span className="text-slate-400">·</span>
            <a
              href={BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#0ea5e9] transition-colors underline font-semibold"
            >
              Telegram-бот
            </a>
            <span className="text-slate-400">·</span>
            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#0ea5e9] transition-colors underline font-semibold"
            >
              Портфоліо
            </a>
          </div>

          { }
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-2.5 shrink-0">
            <Link
              to="/terms"
              className="hover:text-[#0ea5e9] transition-colors underline font-semibold"
            >
              Правила
            </Link>
            <span className="text-slate-400">·</span>
            <Link
              to="/privacy"
              className="hover:text-[#0ea5e9] transition-colors underline font-semibold"
            >
              Політика конфіденційності
            </Link>
            <span className="text-slate-400">·</span>
            <a href="mailto:support@majstrmap.ua" className="hover:text-[#0ea5e9] transition-colors">
              Контакти
            </a>
          </div>
        </div>

        { }
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
          <p className="text-center sm:text-left">
            Дані майстрів використовуються тільки для роботи картки. Ви можете видалити свою анкету в будь-який час через бота.
          </p>

          <div className="flex items-center gap-4 shrink-0">
            <p className="font-semibold">
              © 2026 MajstrMap. Усі права захищені.
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}
