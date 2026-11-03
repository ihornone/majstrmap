import { useLayoutEffect,useRef,useState,type RefObject } from 'react';
export interface MapHover { name:string;city:string;x:number;y:number; }
export function BoundedMapTooltip({hover,containerRef}:{hover:MapHover;containerRef:RefObject<HTMLDivElement|null>}){
 const ref=useRef<HTMLDivElement>(null);
 const [box,setBox]=useState({width:0,height:0,panelWidth:0,panelHeight:0});
 useLayoutEffect(()=>{
  const panel=containerRef.current,tooltip=ref.current;if(!panel||!tooltip)return;
  const measure=()=>{
   const next={width:tooltip.offsetWidth,height:tooltip.offsetHeight,panelWidth:panel.clientWidth,panelHeight:panel.clientHeight};
   setBox(prev=>Object.keys(next).every(key=>prev[key as keyof typeof next]===next[key as keyof typeof next])?prev:next);
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(panel);observer.observe(tooltip);return()=>observer.disconnect();
 },[containerRef,hover.name,hover.city]);
 const width=Math.min(box.width,Math.max(0,box.panelWidth-16));
 const height=Math.min(box.height,Math.max(0,box.panelHeight-16));
 const left=Math.max(8,Math.min(hover.x+12,box.panelWidth-width-8));
 const preferredTop=hover.y-height-12>=8?hover.y-height-12:hover.y+12;
 const top=Math.max(8,Math.min(preferredTop,box.panelHeight-height-8));
 return <div ref={ref} role="tooltip" data-slot="master-hover-tooltip" className="absolute z-40 pointer-events-none bg-slate-900 text-white rounded-lg px-3 py-2 text-xs leading-snug break-words overflow-hidden" style={{left,top,maxWidth:box.panelWidth?Math.min(280,Math.max(16,box.panelWidth-16)):280,maxHeight:box.panelHeight?Math.max(16,box.panelHeight-16):undefined,visibility:box.panelWidth?'visible':'hidden'}}><div className="font-semibold line-clamp-2">{hover.name}</div><div className="text-slate-300 line-clamp-2">{hover.city}</div></div>;
}
