import { Users, Eye } from 'lucide-react';
import type { SiteOverviewStats } from '@/lib/api';

interface LiveStatsBadgeProps {
  stats: SiteOverviewStats | null;
  className?: string;
}

export function LiveStatsBadge({ stats, className = '' }: LiveStatsBadgeProps) {
  if (!stats) return null;

  return (
    <div
      className={`inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm text-xs text-slate-750 font-medium ${className}`}
      aria-label="Статистика платформи MasterMap"
    >
      {/* Кількість майстрів */}
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <Users className="w-3.5 h-3.5" />
        </div>
        <span>
          Майстрів: <strong className="text-slate-900 font-bold">{stats.totalMasters.toLocaleString('uk-UA')}</strong>
        </span>
      </div>

      <span className="text-slate-300 hidden xs:inline select-none">|</span>

      {/* Всього людей зайшло на сайт */}
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Eye className="w-3.5 h-3.5" />
        </div>
        <span>
          Відвідувачів: <strong className="text-slate-900 font-bold">{stats.totalVisitors.toLocaleString('uk-UA')}</strong>
        </span>
      </div>

      <span className="text-slate-300 hidden sm:inline select-none">|</span>

      {/* Онлайн зараз із зеленим пульсуючим маячком */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex h-2 w-2 items-center justify-center ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </div>
        <span>
          Онлайн: <strong className="text-emerald-700 font-bold">{stats.onlineCount.toLocaleString('uk-UA')}</strong>
        </span>
      </div>
    </div>
  );
}
