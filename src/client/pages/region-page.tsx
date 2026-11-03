import { BoundedMapTooltip, type MapHover } from '@/components/bounded-map-tooltip';
import { SaveMasterButton } from '@/components/save-share';
import { availabilityLabel } from '../../shared/master-tools';
import { WorkConditionBadges } from '@/components/work-conditions';
import { EMERGENCY_CATEGORIES } from '../../shared/work-conditions';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router';
import { REGIONS_DATA } from '@/data/regions';
import { REGION_CITIES } from '@/data/cities';
import { fetchMasters, fetchRegionFilters, getAvatarUrl, type ApiMaster, type ApiCategory } from '@/lib/api';
import { BOT_URL, botUrl } from '@/lib/links';
import { placeMastersWithoutCollision, parseSvgPathToPoints, type PlacedMaster } from '@/lib/marker-placement';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { ContactButtons } from '@/components/contact-buttons';
import { MasterAvatar } from '@/components/avatar';
import { Map as RegionMap } from '@/components/shadcnmaps/map';
import { MapControls } from '@/components/shadcnmaps/map-controls';
import type { MapData } from '@/components/shadcnmaps/types';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Star,
  MapPin,
  SlidersHorizontal,
  ChevronRight,
  UserPlus,
} from 'lucide-react';

type MasterWithCoords = ApiMaster & { x: number; y: number };

const SORT_KEYS = ['rating', 'reviews', 'newest'] as const;
type SortKey = (typeof SORT_KEYS)[number];

const REGION_ZOOM_CONFIG = {
  minZoom: 0.8,
  maxZoom: 8,
  zoomStep: 0.35,
  panStep: 50,
};

const AVATAR_COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#14b8a6', '#8b5cf6', '#2563eb'];

function initialsAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? '#0ea5e9';
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const second = parts[1] ?? '';
  return (first.charAt(0) + second.charAt(0)).toUpperCase();
}

function parseRegionViewBox(viewBox: string, path: string): { x: number; y: number; width: number; height: number } {
  const [x = NaN, y = NaN, width = NaN, height = NaN] = viewBox.split(/\s+/).map(Number);
  if ([x, y, width, height].every((n) => Number.isFinite(n))) {
    return { x, y, width, height };
  }
  const points = parseSvgPathToPoints(path);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(1, Math.max(...xs) - minX), height: Math.max(1, Math.max(...ys) - minY) };
}

export function RegionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get('category') || 'all';
  const selectedCity = searchParams.get('city') || 'all';
  const visits = searchParams.get('visits') === '1';
  const sunday = searchParams.get('sunday') === '1';
  const emergency = searchParams.get('emergency') === '1';
  const [emergencyCategories,setEmergencyCategories] = useState<string[]>([]);
  const sortParam = searchParams.get('sort');
  const sortBy: SortKey = SORT_KEYS.includes(sortParam as SortKey) ? (sortParam as SortKey) : 'rating';

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [apiMasters, setApiMasters] = useState<MasterWithCoords[]>([]);
  const [cityNames, setCityNames] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersError, setFiltersError] = useState(false);
  const [mastersError, setMastersError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const retryFetches = useCallback(() => setReloadKey((k) => k + 1), []);

  const mapPanelRef=useRef<HTMLDivElement>(null);
  const [mapHover,setMapHover]=useState<MapHover|null>(null);
  const hoverRafRef=useRef<number|null>(null);
  const hoverTargetRef=useRef<MapHover|null>(null);
  const scheduleMapHover=useCallback((next: MapHover|null)=>{
    hoverTargetRef.current=next;
    if(hoverRafRef.current!==null)return;
    hoverRafRef.current=requestAnimationFrame(()=>{
      hoverRafRef.current=null;
      setMapHover(hoverTargetRef.current);
    });
  },[]);
  useEffect(()=>()=>{ if(hoverRafRef.current!==null)cancelAnimationFrame(hoverRafRef.current); },[]);

  const region = id ? REGIONS_DATA[id] : null;
  const regionCities = useMemo(() => id ? REGION_CITIES[id] || [] : [], [id]);

  const updateFilters = useCallback(
    (newParams: { category?: string; city?: string; sort?: string; visits?: boolean; sunday?: boolean; emergency?: boolean }) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (newParams.category !== undefined) {
          if (newParams.category === 'all') next.delete('category');
          else next.set('category', newParams.category);
        }
        if (newParams.city !== undefined) {
          if (newParams.city === 'all') next.delete('city');
          else next.set('city', newParams.city);
        }
        if (newParams.sort !== undefined) {
          if (newParams.sort === 'rating') next.delete('sort');
          else next.set('sort', newParams.sort);
        }
        for(const key of ['visits','sunday','emergency'] as const) if(newParams[key] !== undefined){if(newParams[key])next.set(key,'1');else next.delete(key);}
        return next;
      });
    },
    [setSearchParams]
  );

  useEffect(() => {
    let cancelled = false;
    setCategories([]);
    setCityNames([]);
    setEmergencyCategories([]);
    setFiltersError(false);
    if (id) fetchRegionFilters(id).then((res) => {
      if (cancelled) return;
      if (!res.ok) { setFiltersError(true); return; }
      setCategories(res.data.categories);
      setCityNames(res.data.cities);
      setEmergencyCategories(res.data.emergencyCategories);
    });
    return () => { cancelled = true; };
  }, [id, reloadKey]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setApiMasters([]);
    setTotal(0);
    setMastersError(false);

    const withCoordsFromCity = (masters: ApiMaster[]): MasterWithCoords[] => {
      const cityIndex = new Map<string, number>();
      const cityCoords = new Map(regionCities.map((c) => [c.name, c]));

      return masters.map((m) => {
        const city = cityCoords.get(m.city);
        const idx = cityIndex.get(m.city) ?? 0;
        cityIndex.set(m.city, idx + 1);

        const baseX = city ? city.x : region?.labelX ?? 0;
        const baseY = city ? city.y : region?.labelY ?? 0;

        const angle = idx * 2.399963;
        const dist = idx === 0 ? 0 : 3.5 * Math.sqrt(idx);

        return {
          ...m,
          x: baseX + Math.cos(angle) * dist,
          y: baseY + Math.sin(angle) * dist,
        };
      });
    };

    fetchMasters({
      region: id,
      category: selectedCategory,
      city: selectedCity,
      sort: sortBy, visits, sunday, emergency,
    }).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setApiMasters([]);
        setTotal(0);
        setMastersError(true);
        setLoading(false);
        return;
      }
      setApiMasters(withCoordsFromCity(res.data.masters));
      setTotal(res.data.total);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, selectedCategory, selectedCity, sortBy, visits, sunday, emergency, region, regionCities, reloadKey]);

  useEffect(() => {
    if (region) {
      document.title = `${region.name} — Майстри на мапі | MajstrMap`;
    } else {
      document.title = 'Регіон не знайдено | MajstrMap';
    }
  }, [region]);

  const singleRegionMapData = useMemo<MapData | null>(() => {
    if (!region) return null;
    return {
      id: region.id,
      name: region.name,
      viewBox: region.viewBox,
      regions: [
        {
          id: region.id,
          name: region.name,
          abbreviation: region.shortName,
          path: region.path,
          labelX: region.labelX,
          labelY: region.labelY,
          style: {
            fill: '#0ea5e9',
          },
        },
      ],
    };
  }, [region]);

  const markerPlacement = useMemo(() => {
    if (!region || apiMasters.length === 0) {
      return { placed: [] as PlacedMaster<MasterWithCoords>[], radius: 4 };
    }

    const viewBox = parseRegionViewBox(region.viewBox, region.path);

    return placeMastersWithoutCollision(apiMasters, region.path, viewBox);
  }, [region, apiMasters]);

  if (!region || !singleRegionMapData) {
    return (
      <div className="w-full h-screen bg-slate-50 text-slate-900 flex flex-col justify-between items-center p-4">
        <Navbar />
        <div className="text-center flex flex-col items-center gap-4 my-auto">
          <h1 className="text-2xl font-semibold">Регіон не знайдено</h1>
          <Button variant="threed" size="default" onClick={() => navigate('/')} className="text-xs">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            До всієї мапи України
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-slate-50 text-slate-900 flex flex-col p-4 sm:p-5 lg:p-6 gap-4">
      { }
      <Navbar isFloating={false} />

      { }
      <main className="w-full flex-1 flex flex-col lg:flex-row gap-5 items-stretch min-h-0 lg:overflow-hidden">
        { }
        <div ref={mapPanelRef} onWheel={()=>scheduleMapHover(null)} onPointerDown={()=>scheduleMapHover(null)} onPointerLeave={()=>scheduleMapHover(null)} className="w-full lg:w-[60%] relative flex items-center justify-center select-none h-[340px] sm:h-[420px] lg:h-full min-h-[300px] overflow-hidden no-scrollbar">
          <RegionMap
            data={singleRegionMapData}
            enableZoom={true}
            zoomConfig={REGION_ZOOM_CONFIG}
            controls={<MapControls position="bottom-right" className="bottom-4 right-4" />}
            showLabels={true}
            className="w-full h-full region-map-static"
          >
            { }
            <g data-slot="masters-markers-layer">
              {markerPlacement.placed.map(({ master: m, x, y }) => {
                const r = markerPlacement.radius;
                const avatarUrl = getAvatarUrl(m.avatar_key);

                return (
                  <g
                    key={m.slug}
                    role="button"
                    tabIndex={0}
                    aria-label={`${m.name} — ${m.city}`}
                    className="cursor-pointer outline-none focus-visible:stroke-sky-700"
                    onClick={() => navigate(`/master/${m.slug}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/master/${m.slug}`);
                      }
                    }}
                    onPointerMove={e=>{
                      if(e.pointerType!=='mouse')return;
                      const rect=mapPanelRef.current?.getBoundingClientRect();
                      if(rect)scheduleMapHover({name:m.name,city:m.city,x:e.clientX-rect.left,y:e.clientY-rect.top});
                    }}
                    onPointerLeave={()=>scheduleMapHover(null)}
                  >
                    { }
                    <title>{m.name}</title>

                    { }
                    <circle
                      cx={x}
                      cy={y}
                      r={r + Math.min(0.9, r * 0.15)}
                      className="fill-white drop-shadow-none"
                    />

                    {avatarUrl ? (
                      <>
                        <defs>
                          <clipPath id={`clip-master-${m.slug}`}>
                            <circle cx={x} cy={y} r={r} />
                          </clipPath>
                        </defs>
                        { }
                        <image
                          href={avatarUrl}
                          x={x - r}
                          y={y - r}
                          width={r * 2}
                          height={r * 2}
                          clipPath={`url(#clip-master-${m.slug})`}
                          preserveAspectRatio="xMidYMid slice"
                        />
                      </>
                    ) : (
                      <>
                        { }
                        <circle cx={x} cy={y} r={r} fill={initialsAvatarColor(m.name)} />
                        <text
                          x={x}
                          y={y}
                          dy={r * 0.36}
                          textAnchor="middle"
                          className="fill-white font-bold pointer-events-none select-none"
                          style={{ fontSize: r * 0.82 }}
                        >
                          {getInitials(m.name)}
                        </text>
                      </>
                    )}

                  </g>
                );
              })}
            </g>
          </RegionMap>
          {mapHover&&<BoundedMapTooltip hover={mapHover} containerRef={mapPanelRef}/>}

          { }
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-xl shadow-none text-[11px] font-semibold text-slate-700 pointer-events-none">
            💡 Клікніть по аватару майстра, щоб відкрити його картку
          </div>
        </div>

        { }
        <div className="w-full lg:w-[40%] flex flex-col gap-3 min-h-0 lg:h-full lg:overflow-hidden">
          { }
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-none flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#0ea5e9]" />
                Фільтри спеціалістів
              </span>
              <span className="text-slate-500 font-semibold">
                Знайдено: <strong className="text-slate-900">{total}</strong>
              </span>
            </div>

            { }
            {filtersError && (
              <div role="alert" className="flex items-center justify-between gap-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <span>Не вдалося завантажити категорії та міста.</span>
                <button type="button" onClick={retryFetches} className="underline text-sky-700 cursor-pointer shrink-0">
                  Оновити
                </button>
              </div>
            )}

            { }
            <Select
              value={selectedCategory}
              onValueChange={(val) => updateFilters({ category: val, emergency: (val==='all'||EMERGENCY_CATEGORIES.includes(val)||emergencyCategories.includes(val))?emergency:false })}
            >
              <SelectTrigger className="w-full h-9 text-xs font-bold rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Оберіть категорію" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі категорії</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            { }
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={selectedCity}
                onValueChange={(val) => updateFilters({ city: val })}
              >
                <SelectTrigger className="w-full h-9 text-xs font-bold rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Місто" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі міста</SelectItem>
                  {cityNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(val) => updateFilters({ sort: val })}
              >
                <SelectTrigger className="w-full h-9 text-xs font-bold rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Сортування" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">За рейтингом</SelectItem>
                  <SelectItem value="reviews">За відгуками</SelectItem>
                  <SelectItem value="newest">Найновіші</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs pt-1">
              {([['visits','З виїздом',visits],['sunday','У неділю',sunday],...((selectedCategory==='all'||EMERGENCY_CATEGORIES.includes(selectedCategory)||emergencyCategories.includes(selectedCategory))?[['emergency','Аварійний виклик',emergency]]:[])] as Array<['visits'|'sunday'|'emergency',string,boolean]>).map(([key,label,checked])=><label key={key} className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="accent-sky-500" checked={checked} onChange={e=>updateFilters({[key]:e.target.checked})} />{label}</label>)}
            </div>
            <a className="text-xs text-sky-700 underline" href={botUrl(`follow_${id}`)} target="_blank" rel="noreferrer">Повідомляти про нових майстрів у Telegram</a>
          </div>

          { }
          <div className="flex-1 lg:overflow-y-auto flex flex-col gap-3 pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                Завантаження спеціалістів...
              </div>
            ) : mastersError ? (
              <div role="alert" className="bg-white border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center gap-3">
                <p className="text-sm font-bold text-slate-800">
                  Не вдалося завантажити спеціалістів.
                </p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Сервер недоступний або перевищено час очікування. Перевірте з'єднання та спробуйте ще раз.
                </p>
                <Button
                  variant="threed"
                  size="sm"
                  onClick={retryFetches}
                  className="text-xs font-bold mt-1"
                >
                  Спробувати ще раз
                </Button>
              </div>
            ) : apiMasters.length === 0 ? (
              /* Порожній стан за ТЗ: Пояснення і кнопка реєстрації */
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center gap-3">
                <p className="text-sm font-bold text-slate-800">
                  У цьому місті чи категорії поки немає майстрів.
                </p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Ви майстер з цієї області? Зареєструйтеся безкоштовно через Telegram-бота та станьте першим!
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <Button
                    variant="threed"
                    size="sm"
                    onClick={() => window.open(BOT_URL, '_blank')}
                    className="text-xs font-semibold gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Зареєструватися</span>
                  </Button>
                  <Button
                    variant="threedOutline"
                    size="sm"
                    onClick={() => updateFilters({ category: 'all', city: 'all', visits:false,sunday:false,emergency:false })}
                    className="text-xs font-bold"
                  >
                    Скинути фільтри
                  </Button>
                </div>
              </div>
            ) : (
              apiMasters.map((m) => {
                const c = m.contacts || {};
                return (
                  <Link
                    key={m.id}
                    to={`/master/${m.slug}`}
                    className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2 shadow-none cursor-pointer shrink-0 hover:border-sky-300 transition-colors"
                  >
                    {/* Верх картки з фото/аватаркою */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <MasterAvatar name={m.name} avatarKey={m.avatar_key} size="md" />
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                            <span>{m.name}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </h3>
                          <p className="text-xs font-bold text-[#0ea5e9] mt-0.5">
                            {m.category_primary_name || m.category_primary}
                          </p>
                        </div>
                      </div>

                      {/* Рейтинг */}
                      {m.reviews_count > 0 ? (
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-xs font-semibold shrink-0">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{m.rating.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({m.reviews_count})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Ще немає відгуків</span>
                      )}
                    </div>

                    {/* Опис */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {m.description}
                    </p>

                    {/* Інфо: місто, досвід, ціна «від» */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-[#0ea5e9]" />
                        {m.city}
                      </span>
                      <span>•</span>
                      <span>Досвід: <strong>{m.experience_years} р.</strong></span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-sky-700">{m.price_min?`Від ${m.price_min} ₴`:'Ціна за домовленістю'}</p>
                      <SaveMasterButton slug={m.slug} compact />
                    </div>
                    {availabilityLabel(m.availability)&&<span className="text-xs text-sky-800">{availabilityLabel(m.availability)}</span>}
                    <WorkConditionBadges conditions={m.work_conditions} />
                    {/* Кнопки прямого зв'язку */}
                    {Object.values(c).some(Boolean) && <div
                      className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ContactButtons masterId={m.id} contacts={c} />
                    </div>}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
