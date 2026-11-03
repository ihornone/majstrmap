import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ZERO_COUNT_COLOR = '#e2e8f0';
export const TOP_COUNT_COLOR = '#0ea5e9';
export const COLOR_STOPS: ReadonlyArray<{ threshold: number; color: string }> = [
  { threshold: 0.18, color: '#e0f2fe' },
  { threshold: 0.38, color: '#bae6fd' },
  { threshold: 0.65, color: '#7dd3fc' },
  { threshold: 0.85, color: '#38bdf8' },
];

interface MapLegendProps {
  className?: string;
  maxMasters: number;
}

export function MapLegend({ className, maxMasters }: MapLegendProps) {
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
    <div
      data-slot="map-legend"
      className={cn(
        'absolute z-20 pointer-events-auto bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-none flex flex-col gap-1.5',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
        <Users className="w-3.5 h-3.5 text-[#0ea5e9]" />
        <span>Кількість майстрів на мапі</span>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
        <span>0</span>
        <div className="flex items-center h-2.5 rounded-full overflow-hidden border border-slate-200">
          <span
            className="w-4 sm:w-5 h-full"
            style={{ backgroundColor: ZERO_COUNT_COLOR }}
            title="0 майстрів"
          />
          {buckets.map((bucket) => (
            <span
              key={bucket.label}
              className="w-4 sm:w-5 h-full"
              style={{ backgroundColor: bucket.color }}
              title={`${bucket.label} майстрів`}
            />
          ))}
        </div>
        <span className="font-bold text-[#0ea5e9]">{maxMasters > 0 ? maxMasters : '—'}</span>
      </div>
    </div>
  );
}
