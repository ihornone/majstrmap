import { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { RefreshCcw } from 'lucide-react';
import { UkraineMap } from '@/components/shadcnmaps/maps/ukraine';
import { MapControls } from '@/components/shadcnmaps/map-controls';
import type { RegionOverride } from '@/components/shadcnmaps/types';
import { Navbar } from '@/components/navbar';
import { BottomBar } from '@/components/bottom-bar';
import { ProjectFooterSection } from '@/components/project-footer-section';
import { COLOR_STOPS, ZERO_COUNT_COLOR, TOP_COUNT_COLOR } from '@/components/map-legend';
import { MapInfoPanel } from '@/components/map-info-panel';
import { REGIONS_DATA } from '@/data/regions';
import { fetchRegionStats, fetchSiteOverviewStats, type SiteOverviewStats } from '@/lib/api';
import { sendHeartbeat } from '@/lib/engagement';

const HOME_ZOOM_CONFIG = {
  minZoom: 0.8,
  maxZoom: 6,
  zoomStep: 0.3,
  panStep: 50,
};

function calculateRegionColor(count: number, maxCount: number): string {
  if (count === 0) return ZERO_COUNT_COLOR;

  const ratio = Math.min(1, Math.max(0.08, count / maxCount));

  for (const stop of COLOR_STOPS) {
    if (ratio <= stop.threshold) return stop.color;
  }
  return TOP_COUNT_COLOR;
}

export function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [siteOverview, setSiteOverview] = useState<SiteOverviewStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Відправка heartbeat при відкритті сторінки та кожні 60 секунд для онлайн-лічильника
  useEffect(() => {
    sendHeartbeat();
    const interval = setInterval(() => {
      sendHeartbeat();
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Отримання глобальної статистики (майстри, відвідувачі, онлайн)
  useEffect(() => {
    let cancelled = false;
    const loadOverview = () => {
      fetchSiteOverviewStats().then((res) => {
        if (!cancelled && res.ok) {
          setSiteOverview(res.data);
        }
      });
    };

    loadOverview();
    const timer = setInterval(loadOverview, 30_000); // оновлення кожні 30с
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatsError(false);
    fetchRegionStats().then((res) => {
      if (cancelled) return;
      if (res.ok) setStats(res.data);
      else setStatsError(true);
    });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const retryStats = useCallback(() => setReloadKey((k) => k + 1), []);

  const regionsWithCounts = useMemo(() => {
    return Object.entries(REGIONS_DATA).map(([id, info]) => {
      const liveCount = stats[id];
      const count = typeof liveCount === 'number' ? liveCount : 0;
      return {
        ...info,
        count,
      };
    });
  }, [stats]);

  const maxMasters = useMemo(() => {
    return Math.max(...regionsWithCounts.map((r) => r.count), 1);
  }, [regionsWithCounts]);

  const scrollToContent = () => {
    const el = document.getElementById('project-info');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToMap = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const regionOverrides = useMemo<RegionOverride[]>(() => {
    return regionsWithCounts.map((r) => {
      const color = calculateRegionColor(r.count, maxMasters);
      return {
        id: r.id,
        style: {
          fill: color,
        },
      };
    });
  }, [regionsWithCounts, maxMasters]);

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900">
      { }
      <section className="relative w-full h-screen overflow-hidden flex items-center justify-center no-scrollbar">
        <Navbar isFloating={true} onAddMaster={scrollToContent} />

        { }
        <UkraineMap
          enableZoom={true}
          zoomConfig={HOME_ZOOM_CONFIG}
          controls={<MapControls position="bottom-right" />}
          showLabels={true}
          regions={regionOverrides}
          onRegionClick={(event) => {
            navigate(`/region/${event.region.id}`);
          }}
          className="w-full h-full max-h-screen max-w-full"
        />

        {/* Лівий нижній кут: Єдина гармонійна панель статистики та легенди */}
        <div className="absolute bottom-14 left-4 sm:left-6 z-20 pointer-events-auto">
          <MapInfoPanel stats={siteOverview} maxMasters={maxMasters} />
        </div>

        {statsError && (
          <div
            role="alert"
            className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-30 max-w-[min(92vw,26rem)] bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg flex flex-col items-center gap-2 text-center"
          >
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              Не вдалося завантажити кількість майстрів на мапі.
            </p>
            <p className="text-[11px] text-slate-500">Перевірте з'єднання та спробуйте ще раз.</p>
            <button
              type="button"
              onClick={retryStats}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold px-3 py-2 transition-colors cursor-pointer"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Спробувати ще раз
            </button>
          </div>
        )}

        {/* Плашка, що динамічно змінює текст та дію при скролі */}
        <BottomBar
          onScrollDown={scrollToContent}
          onScrollUp={scrollToMap}
          className="absolute bottom-0 inset-x-0"
        />
      </section>

      {/* ДРУГИЙ ЕКРАН: Опис проєкту, CTA та Футер */}
      <ProjectFooterSection />
    </div>
  );
}
