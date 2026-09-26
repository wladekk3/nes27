'use client';
import {tr} from "@/lib/i18n";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
export function ClickBurst({x,y,kind}:{x:number;y:number;kind:string}){return <span className={'click-burst '+kind} style={{left:x,top:y} as CSSProperties} aria-hidden="true">{tr(['click-sparks','click-dust'].includes(kind)?Array.from({length:9},(_,i)=><i key={i} style={{'--angle':i*40+'deg','--travel':22+i%3*9+'px'} as CSSProperties}/>):<i/>)}</span>;}
export function PersonalEffects({cursor,click}:{cursor?:string;click?:string}){
 const ref=useRef<HTMLDivElement>(null),[bursts,setBursts]=useState<Array<{id:number;x:number;y:number}>>([]);const seq=useRef(0);
 useEffect(()=>{document.documentElement.dataset.zoneCursor=cursor||'';return()=>{delete document.documentElement.dataset.zoneCursor;};},[cursor]);
 useEffect(()=>{if(cursor!=='ember-cursor'||!matchMedia('(pointer:fine)').matches)return;const move=(e:PointerEvent)=>{if(ref.current){ref.current.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;ref.current.style.opacity='1';}};window.addEventListener('pointermove',move);return()=>window.removeEventListener('pointermove',move);},[cursor]);
 useEffect(()=>{if(!click||matchMedia('(prefers-reduced-motion:reduce)').matches)return;const timers=new Set<ReturnType<typeof setTimeout>>();const handler=(e:MouseEvent)=>{if(!(e.target as Element).closest('button:not(:disabled),a,[role="button"]'))return;const id=++seq.current;setBursts(b=>[...b.slice(-5),{id,x:e.clientX,y:e.clientY}]);const t=setTimeout(()=>{setBursts(b=>b.filter(v=>v.id!==id));timers.delete(t);},650);timers.add(t);};document.addEventListener('click',handler);return()=>{document.removeEventListener('click',handler);timers.forEach(clearTimeout);};},[click]);
 return <>{tr(cursor==='ember-cursor'&&<div className="personal-cursor" ref={ref} aria-hidden="true"/>)}<div className="click-effects-layer">{tr(bursts.map(b=><ClickBurst key={b.id} {...b} kind={click!}/>))}</div></>;
}
