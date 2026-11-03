import { SaveMasterButton, ShareMasterButton } from '@/components/save-share';
import { recordMetric } from '@/lib/engagement';
import { availabilityLabel } from '../../shared/master-tools';
import { WorkConditionBadges, WorkConditionsDetails } from '@/components/work-conditions';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { REGIONS_DATA } from '@/data/regions';
import { fetchMasterBySlug, type ApiMaster } from '@/lib/api';
import { botUrl } from '@/lib/links';
import { Navbar } from '@/components/navbar';
import { ContactButtons } from '@/components/contact-buttons';
import { Button } from '@/components/ui/button';
import { MasterAvatar } from '@/components/avatar';
import {
  ArrowLeft,
  RefreshCcw,
  Star,
  MapPin,
  Briefcase,
  MessageSquare,
  PlusCircle,
} from 'lucide-react';

type LoadFailure = 'not-found' | 'error';

export function MasterPage() {
  const { id: slug } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [master, setMaster] = useState<ApiMaster | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const contactBlock=useRef<HTMLDivElement>(null);
  const [showStickyContacts,setShowStickyContacts]=useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(()=>{
    const node=contactBlock.current;
    if(!node)return;
    const observer=new IntersectionObserver((entries)=>setShowStickyContacts(!(entries[0]?.isIntersecting ?? true)));
    observer.observe(node);return()=>observer.disconnect();
  },[master?.id]);

  useEffect(() => {
    if (!slug) {
      setMaster(null);
      setFailure('error');
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailure(null);

    let cancelled = false;
    setMaster(null);
    setShowAllReviews(false);
    fetchMasterBySlug(slug).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setMaster(res.data);
        recordMetric(res.data.id,'view');
      } else {
        setMaster(null);
        setFailure(res.status === 404 ? 'not-found' : 'error');
      }
      setLoading(false);
    });

    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => { cancelled = true; };
  }, [slug, reloadKey]);

  const retryLoad = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (loading) return;
    if (master) {
      document.title = `${master.name} — ${master.category_primary_name || master.category_primary} у м. ${master.city} | MajstrMap`;
    } else {
      document.title = failure === 'error'
        ? 'Помилка завантаження | MajstrMap'
        : 'Майстра не знайдено | MajstrMap';
    }
  }, [master, loading, failure]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Завантаження картки майстра...</p>
      </div>
    );
  }

  if (!master) {
    return failure === 'error' ? (
      <div className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between items-center relative">
        <Navbar isFloating={true} />
        <div className="text-center flex flex-col items-center gap-4 my-auto pt-24" role="alert">
          <h1 className="text-2xl font-semibold">Не вдалося завантажити анкету</h1>
          <p className="text-sm text-slate-500">
            Сервер недоступний або перевищено час очікування. Перевірте з'єднання та спробуйте ще раз.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="threed" size="default" onClick={retryLoad} className="text-xs">
              <RefreshCcw className="w-4 h-4 mr-1.5" />
              Спробувати ще раз
            </Button>
            <Button variant="threedOutline" size="default" onClick={() => navigate('/')} className="text-xs">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              До всієї мапи України
            </Button>
          </div>
        </div>
      </div>
    ) : (
      <div className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between items-center relative">
        <Navbar isFloating={true} />
        <div className="text-center flex flex-col items-center gap-4 my-auto pt-24">
          <h1 className="text-2xl font-semibold">Анкету майстра не знайдено</h1>
          <p className="text-sm text-slate-500">
            Можливо, посилання застаріло або анкету було змінено.
          </p>
          <Button
            variant="threed"
            size="default"
            onClick={() => navigate('/')}
            className="text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            До всієї мапи України
          </Button>
        </div>
      </div>
    );
  }

  const region = REGIONS_DATA[master.region_id];
  const contacts = master.contacts || {};
  const services = master.services || [];
  const reviews = master.reviews || [];

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const botReviewUrl = botUrl(`review_${master.slug}`);

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col relative pb-52 sm:pb-12">
      { }
      <Navbar isFloating={true} />

      <main className="w-full flex-1 pt-24 sm:pt-28 px-4 sm:px-6 flex flex-col lg:flex-row gap-6 items-start">
        { }
        <div className="w-full lg:w-[65%] flex flex-col gap-6">
          { }
          <div className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-8 shadow-none grid grid-cols-[64px_minmax(0,1fr)] sm:grid-cols-[112px_minmax(0,1fr)] gap-x-4 sm:gap-x-8 gap-y-4">
            { }
            <div className="relative shrink-0 self-start sm:row-span-2">
              <MasterAvatar
                name={master.name}
                avatarKey={master.avatar_key}
                size="xl"
                className="w-16 h-16 sm:w-28 sm:h-28 border-2 sm:border-4 ring-2 ring-[#0ea5e9] text-lg sm:text-2xl"
              />
            </div>

            <div className="min-w-0 self-center sm:self-start">
              <h1 className="text-xl sm:text-3xl font-semibold text-slate-900 tracking-tight leading-tight break-words">{master.name}</h1>
              <p className="text-sm sm:text-base font-bold text-[#0ea5e9] mt-1.5 break-words">
                {master.category_primary_name || master.category_primary}
                {master.category_secondary ? ` • ${master.category_secondary}` : ''}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 sm:col-start-2 min-w-0 flex flex-col items-start text-left gap-3 w-full">
              { }
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-600">
                {master.reviews_count > 0 ? (
                  <div className="flex items-center gap-1 font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{master.rating.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">({master.reviews_count} відгуків)</span>
                  </div>
                ) : (
                  <span className="text-slate-500">Ще немає відгуків</span>
                )}
                <span className="hidden sm:inline">•</span>
                <div className="flex items-start gap-1 font-medium basis-full sm:basis-auto order-3 sm:order-none min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-[#0ea5e9] shrink-0" />
                  <span>
                    {master.city}
                    {region ? `, ${region.name}` : ''}
                  </span>
                </div>
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center gap-1 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Досвід {master.experience_years} р.</span>
                </div>
              </div>

              { }
              <p className="text-sm text-slate-600 leading-relaxed break-words">
                {master.description}
              </p>

              {availabilityLabel(master.availability)&&<span className="rounded-full bg-sky-50 px-2 py-1 text-xs text-sky-800">{availabilityLabel(master.availability)}</span>}
              <WorkConditionBadges conditions={master.work_conditions} />
              <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-wrap sm:w-auto [&_button]:w-full sm:[&_button]:w-auto [&_button]:px-2 sm:[&_button]:px-4 [&_button]:text-xs"><SaveMasterButton slug={master.slug}/><ShareMasterButton slug={master.slug} name={master.name}/></div>
              { }
              <div ref={contactBlock} className="w-full"><ContactButtons masterId={master.id} contacts={contacts} className="pt-1 w-full justify-start" /></div>
            </div>
          </div>

          { }
          <div className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-8 shadow-none flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#0ea5e9]" />
                Відгуки замовників ({master.reviews_count})
              </h2>

              <Button
                variant="threedOutline"
                size="sm"
                onClick={() => window.open(botReviewUrl, '_blank')}
                className="text-xs font-bold gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#0ea5e9] shrink-0" />
                <span>Залишити відгук</span>
              </Button>
            </div>

            {reviews.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center text-xs text-slate-500">
                У цього майстра поки немає відгуків. Замовляли послугу?{' '}
                <a
                  href={botReviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0ea5e9] underline font-bold"
                >
                  Залиште перший відгук
                </a>{' '}
                через Telegram-бота!
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {visibleReviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2 border border-slate-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{r.client_name}</span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: Math.min(5, Math.max(0, Math.round(r.rating))) }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                        <span>{r.created_at ? r.created_at.slice(0, 10) : ''}</span>
                      </div>
                    </div>
                    {r.collaboration_confirmed===1 && <span className="text-xs text-emerald-700" title="Клієнт і майстер підтвердили співпрацю. Це не незалежна перевірка якості.">✓ Угода підтверджена</span>}
                    {r.text && <p className="text-xs text-slate-600 leading-relaxed">{r.text}</p>}
                  </div>
                ))}

                {reviews.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllReviews((prev) => !prev)}
                    className="text-xs font-bold text-[#0ea5e9] hover:bg-sky-50 mt-1 self-center"
                  >
                    {showAllReviews
                      ? 'Згорнути відгуки'
                      : `Показати всі відгуки (${reviews.length})`}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        { }
        <div className="w-full lg:w-[35%] flex flex-col gap-6">
          { }
          {master.about && (
            <div className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-8 shadow-none flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#0ea5e9]" />
                Про майстра та підхід
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {master.about}
              </p>
            </div>
          )}

          <section className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-8 flex flex-col gap-4"><h2 className="text-lg font-semibold">Умови роботи</h2><WorkConditionsDetails conditions={master.work_conditions} /></section>
          { }
          <div className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-8 shadow-none flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Прайс-лист послуг
              </h2>
            </div>

            {services.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Ціни уточнюйте за телефоном або в Telegram.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100">
                {services.map((s) => (
                  <div key={s.id} className="py-3 flex items-baseline gap-2 text-sm">
                    <span className="font-medium text-slate-800 min-w-0 break-words">{s.name}</span>
                    <span aria-hidden="true" className="flex-1 min-w-4 border-b border-dotted border-slate-400" />
                    <span className="font-semibold text-[#0ea5e9] shrink-0">{s.price}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      { }
      {showStickyContacts && Object.values(contacts).some(Boolean) && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 z-40 shadow-lg max-h-[min(40vh,11rem)] overflow-y-auto">
          <ContactButtons masterId={master.id} contacts={contacts} />
        </div>
      )}
    </div>
  );
}
