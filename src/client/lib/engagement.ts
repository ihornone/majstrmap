import type { ContactKind } from '../../shared/contacts';
export function recordMetric(masterId:number,kind:'view'|'contact',contact?:ContactKind){
  try{
    let visitor=sessionStorage.getItem('majstrmap-visitor');
    if(!visitor){visitor=crypto.randomUUID();sessionStorage.setItem('majstrmap-visitor',visitor);}
    const body=JSON.stringify({masterId,visitor,kind,contact});
    if(navigator.sendBeacon)navigator.sendBeacon('/api/metrics',new Blob([body],{type:'application/json'}));
    else void fetch('/api/metrics',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
  }catch{ }
}
const savedKey=()=>'majstrmap-saved';
export function getSavedSlugs():string[]{try{const data=JSON.parse(localStorage.getItem(savedKey())||'[]');return Array.isArray(data)?data.filter((v):v is string=>typeof v==='string'&&/^[a-zA-Z0-9_-]+$/.test(v)).slice(0,100):[];}catch{return [];}}
export function toggleSaved(slug:string){const current=getSavedSlugs();const next=current.includes(slug)?current.filter(s=>s!==slug):[slug,...current].slice(0,100);localStorage.setItem(savedKey(),JSON.stringify(next));window.dispatchEvent(new Event('majstrmap-saved'));return next;}
