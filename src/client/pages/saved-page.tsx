import { useEffect,useState,useCallback } from 'react';
import { Link } from 'react-router';
import { Navbar } from '@/components/navbar';
import { SaveMasterButton } from '@/components/save-share';
import { ContactButtons } from '@/components/contact-buttons';
import { fetchMastersBySlugs,type ApiMaster } from '@/lib/api';
import { getSavedSlugs } from '@/lib/engagement';
import { minServicePrice } from '../../shared/pricing';
export function SavedPage(){
 useEffect(()=>{document.title='Збережені майстри | MajstrMap';},[]);
 const [slugs,setSlugs]=useState(getSavedSlugs);
 const [masters,setMasters]=useState<Array<ApiMaster|null>>([]);
 const [loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState(false);
 const [reloadKey,setReloadKey]=useState(0);
 const retry=useCallback(()=>setReloadKey(k=>k+1),[]);
 useEffect(()=>{const update=()=>setSlugs(getSavedSlugs());window.addEventListener('majstrmap-saved',update);window.addEventListener('storage',update);return()=>{window.removeEventListener('majstrmap-saved',update);window.removeEventListener('storage',update);};},[]);
 useEffect(()=>{
  if(!slugs.length){setMasters([]);setLoadError(false);setLoading(false);return;}
  let cancelled=false;setLoading(true);setLoadError(false);
  fetchMastersBySlugs(slugs).then(res=>{
   if(cancelled)return;
   if(res.ok){
    const bySlug=new Map(res.data.masters.map(m=>[m.slug,m] as const));
    setMasters(slugs.map(s=>bySlug.get(s)??null));
   }else{setMasters([]);setLoadError(true);}
   setLoading(false);
  });
  return()=>{cancelled=true;};
 },[slugs,reloadKey]);
 return <div className="min-h-screen p-4 sm:p-6 bg-slate-50"><Navbar/><main className="max-w-5xl mx-auto py-8"><h1 className="text-3xl font-semibold mb-3">Збережені майстри</h1><p className="text-sm text-slate-500 mb-6">Зберігаються в цьому браузері. </p>{loading?<p role="status">Завантаження…</p>:loadError?<div role="alert" className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-start gap-3"><p className="text-sm font-semibold text-slate-800">Не вдалося завантажити збережені анкети.</p><p className="text-xs text-slate-500">Перевірте з'єднання та спробуйте ще раз.</p><button type="button" onClick={retry} className="rounded-xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold px-3 py-2 transition-colors cursor-pointer">Спробувати ще раз</button></div>:!slugs.length?<p>Ще нікого не збережено. <Link className="text-sky-700 underline" to="/">Знайти майстра</Link></p>:<div className="grid sm:grid-cols-2 gap-4">{slugs.map((s,i)=>{const m=masters[i];return <article key={s} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">{m?<><Link className="text-lg font-semibold text-sky-700" to={`/master/${m.slug}`}>{m.name}</Link><p className="text-sm">{m.city} · {m.category_primary_name||m.category_primary}</p><p className="text-sm">{minServicePrice(m.services)?`Від ${minServicePrice(m.services)} ₴`:'За домовленістю'}</p><ContactButtons masterId={m.id} slug={m.slug}/></>:<p>Анкета недоступна або тимчасово прихована.</p>}<SaveMasterButton slug={s}/></article>;})}</div>}</main></div>;
}
