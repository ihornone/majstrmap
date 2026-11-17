import { useState } from 'react';
import { Users, Eye, BarChart2, X } from 'lucide-react';
import type { SiteOverviewStats } from '@/lib/api';
import {
  COLOR_STOPS,
  ZERO_COUNT_COLOR,
  TOP_COUNT_COLOR,
} from './map-legend';

interface MapInfoPanelProps {
  stats: SiteOverviewStats | null;
  maxMasters: number;
  className?: string;
}

export function MapInfoPanel({ stats, maxMasters, className = '' }: MapInfoPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const bounds: number[] = [];
  let lastBound = 0;
  for (const stop of COLOR_STOPS) {
    const next = Math.max(Math.ceil(stop.threshold * maxMasters), lastBound + 1);
    bounds.push(next);
    lastBound = next;
  }
  const [b1 = 0, b2 = 0, b3 = 0, b4 = 0] = bounds;

  const buckets: Array<{ label: string; color: string }> = [
    { label: `1–${b1}`, color: COLOR_STOPS[0]?.color ?? '' },
    { label: `${b1 + 1}–${b2}`, color: COLOR_STOPS[1]?.color ?? '' },
    { label: `${b2 + 1}–${b3}`, color: COLOR_STOPS[2]?.color ?? '' },
    { label: `${b3 + 1}–${b4}`, color: COLOR_STOPS[3]?.color ?? '' },
    { label: `${b4 + 1}+`, color: TOP_COUNT_COLOR },
  ];

  return (
    <div className={`relative z-20 pointer-events-auto flex flex-col items-start ${className}`}>
      {/* Кнопка-тригер у лівому нижньому кутку */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center gap-2 bg-white/95 hover:bg-white border border-slate-200/90 hover:border-sky-300 rounded-full px-3.5 py-2 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer text-xs font-semibold text-slate-700 active:scale-95"
        aria-expanded={isOpen}
        aria-label="Статистика та легенда мапи"
      >
        {isOpen ? (
          <X className="w-4 h-4 text-slate-500" />
        ) : (
          <BarChart2 className="w-4 h-4 text-[#0ea5e9] transition-transform duration-200 group-hover:scale-110" />
        )}
        <span>{isOpen ? 'Сховати' : 'Статистика мапи'}</span>

        {/* Невеликий зелений маячок онлайну на кнопці */}
        {stats && (
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 ml-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-emerald-700">{stats.onlineCount}</span>
          </div>
        )}
      </button>

      {/* Спливаюче вікно статистики над кнопкою */}
      {isOpen && (
        <div
          className="absolute bottom-11 left-0 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3.5 shadow-xl flex flex-col gap-3 w-[290px] sm:w-[320px] animate-in fade-in slide-in-from-bottom-2 duration-200 origin-bottom-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Заголовок із кнопкою закриття */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-[#0ea5e9]" />
              Статистика MasterMap
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Живі лічильники */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {/* Майстрів */}
              <div className="bg-sky-50/80 border border-sky-100 rounded-xl p-2 flex flex-col items-center gap-0.5">
                <Users className="w-3.5 h-3.5 text-[#0ea5e9]" />
                <span className="text-[10px] text-slate-500 font-medium">Майстрів</span>
                <span className="text-sm font-bold text-slate-900">{stats.totalMasters}</span>
              </div>

              {/* Відвідувачів */}
              <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-2 flex flex-col items-center gap-0.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[10px] text-slate-500 font-medium">Гостей</span>
                <span className="text-sm font-bold text-slate-900">{stats.totalVisitors}</span>
              </div>

              {/* Онлайн */}
              <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-2 flex flex-col items-center gap-0.5">
                <div className="relative flex h-2 w-2 my-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Онлайн</span>
                <span className="text-sm font-bold text-emerald-700">{stats.onlineCount}</span>
              </div>
            </div>
          )}

          {/* Легенда кольорів */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-600">
              Щільність майстрів в областях:
            </span>

            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
              <span>0</span>
              <div className="flex items-center h-2.5 rounded-full overflow-hidden border border-slate-200 flex-1">
                <span
                  className="w-full h-full"
                  style={{ backgroundColor: ZERO_COUNT_COLOR }}
                  title="0 майстрів"
                />
                {buckets.map((bucket) => (
                  <span
                    key={bucket.label}
                    className="w-full h-full"
                    style={{ backgroundColor: bucket.color }}
                    title={`${bucket.label} майстрів`}
                  />
                ))}
              </div>
              <span className="font-bold text-[#0ea5e9]">{maxMasters > 0 ? maxMasters : '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
