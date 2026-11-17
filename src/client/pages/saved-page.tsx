import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { Navbar } from '@/components/navbar';
import { SaveMasterButton } from '@/components/save-share';
import { ContactButtons } from '@/components/contact-buttons';
import { MasterAvatar } from '@/components/avatar';
import { fetchMastersBySlugs, type ApiMaster } from '@/lib/api';
import { getSavedSlugs } from '@/lib/engagement';
import { minServicePrice } from '../../shared/pricing';

export function SavedPage() {
  useEffect(() => {
    document.title = 'Збережені майстри | MasterMap';
  }, []);

  const [slugs, setSlugs] = useState(getSavedSlugs);
  const [masters, setMasters] = useState<Array<ApiMaster | null>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const update = () => setSlugs(getSavedSlugs());
    window.addEventListener('majstrmap-saved', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('majstrmap-saved', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  useEffect(() => {
    if (!slugs.length) {
      setMasters([]);
      setLoadError(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchMastersBySlugs(slugs).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        const bySlug = new Map(res.data.masters.map((m) => [m.slug, m] as const));
        setMasters(slugs.map((s) => bySlug.get(s) ?? null));
      } else {
        setMasters([]);
        setLoadError(true);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slugs, reloadKey]);

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto py-8">
        <h1 className="text-3xl font-semibold mb-3 tracking-tight">Збережені майстри</h1>
        <p className="text-sm text-slate-500 mb-6">
          Анкети зберігаються локально у вашому браузері.
        </p>

        {loading ? (
          <p role="status" className="text-sm text-slate-500">Завантаження…</p>
        ) : loadError ? (
          <div role="alert" className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-start gap-3">
            <p className="text-sm font-semibold text-slate-800">
              Не вдалося завантажити збережені анкети.
            </p>
            <p className="text-xs text-slate-500">
              Перевірте з'єднання та спробуйте ще раз.
            </p>
            <button
              type="button"
              onClick={retry}
              className="rounded-xl bg-[#0ea5e9] hover:bg-[#0284c7] active:scale-[0.97] text-white text-xs font-bold px-3 py-2 transition-[background-color,transform] duration-120 cursor-pointer"
            >
              Спробувати ще раз
            </button>
          </div>
        ) : !slugs.length ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center flex flex-col items-center gap-2">
            <p className="text-sm text-slate-700">Ще нікого не збережено.</p>
            <Link className="text-sm font-semibold text-sky-700 hover:text-sky-800 underline" to="/">
              Знайти майстра на мапі
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {slugs.map((s, i) => {
              const m = masters[i];
              return (
                <article
                  key={s}
                  className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5 shadow-xs transition-colors hover:border-sky-300"
                >
                  {m ? (
                    <>
                      <div className="flex items-start gap-3">
                        <MasterAvatar name={m.name} avatarKey={m.avatar_key} size="md" />
                        <div className="min-w-0 flex-1">
                          <Link
                            className="text-base font-semibold text-slate-900 hover:text-[#0ea5e9] transition-colors truncate block"
                            to={`/master/${m.slug}`}
                          >
                            {m.name}
                          </Link>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {m.city} · {m.category_primary_name || m.category_primary}
                          </p>
                        </div>
                        <SaveMasterButton slug={s} compact />
                      </div>

                      <p className="text-xs font-medium text-slate-700">
                        {minServicePrice(m.services)
                          ? `Від ${minServicePrice(m.services)} ₴`
                          : 'Ціна за домовленістю'}
                      </p>

                      <ContactButtons masterId={m.id} slug={m.slug} />
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        Анкета недоступна або тимчасово прихована.
                      </p>
                      <SaveMasterButton slug={s} compact />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
