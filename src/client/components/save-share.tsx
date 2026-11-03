import { useEffect, useState } from 'react';
import { Heart, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { getSavedSlugs, toggleSaved } from '@/lib/engagement';
export function SaveMasterButton({slug,compact=false}:{slug:string;compact?:boolean}){
  const [saved,setSaved]=useState(()=>getSavedSlugs().includes(slug));const [error,setError]=useState('');
  useEffect(()=>{const update=()=>setSaved(getSavedSlugs().includes(slug));window.addEventListener('majstrmap-saved',update);window.addEventListener('storage',update);update();return()=>{window.removeEventListener('majstrmap-saved',update);window.removeEventListener('storage',update);};},[slug]);
  return <span onClick={e=>e.stopPropagation()}><Button variant="threedOutline" size={compact?'icon':'sm'} className={compact?'h-9 w-9 shrink-0':undefined} aria-label={compact?(saved?'Прибрати зі збережених':'Зберегти майстра'):undefined} title={saved?'Прибрати зі збережених':'Зберегти майстра'} aria-pressed={saved} onClick={()=>{try{setSaved(toggleSaved(slug).includes(slug));}catch{setError('Дозвольте збереження в браузері або збережіть у Telegram.');}}}><Heart className={saved?'fill-current':''}/>{!compact&&(saved?'Збережено':'Зберегти')}</Button>{error&&<span role="status" className="text-xs">{error}</span>}</span>;
}
export function ShareMasterButton({slug,name}:{slug:string;name:string}){
 const [status,setStatus]=useState('');
 return <><Button variant="threedOutline" size="sm" onClick={async()=>{
  const url=`${location.origin}/master/${slug}`;
  try{if(navigator.share)await navigator.share({title:`${name} — MajstrMap`,url});else{await navigator.clipboard.writeText(url);setStatus('Посилання скопійовано');}}catch(err){if((err as Error).name!=='AbortError')setStatus(url);}
 }}><Share2/>Поділитися</Button>{status&&<span className="text-xs break-all" role="status">{status}</span>}</>;
}
