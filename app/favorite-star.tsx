'use client';
import {useEffect,useState} from 'react';
import {Star} from 'lucide-react';
import {tr} from '@/lib/i18n';
const cache=new Map<string,Promise<any>>();
if(typeof window!=='undefined')window.addEventListener('s27-account-changed',()=>{cache.clear();window.dispatchEvent(new Event('s27-favorites-changed'));});
export function readFavorites(kind:string){if(!cache.has(kind))cache.set(kind,fetch(kind==='card'?'/api/community':'/api/member-profile').then(async r=>{if(!r.ok)throw Error('Unavailable');return r.json();}).catch(e=>{cache.delete(kind);throw e;}));return cache.get(kind)!;}
export function FavoriteStar({id,kind,enabled=true}:{id:string;kind:'card'|'product';enabled?:boolean}){
 const [selected,setSelected]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let live=true;async function refresh(){try{const d=await readFavorites(kind);if(live)setSelected((kind==='card'?d.locks:d.extras?.wishlist||[]).includes(id));}catch{}}if(enabled)void refresh();window.addEventListener('s27-favorites-changed',refresh);return()=>{live=false;window.removeEventListener('s27-favorites-changed',refresh);};},[id,kind,enabled]);
 if(!enabled)return null;
 return <><button type="button" className="favorite-star" aria-label={tr(selected?'Убрать из избранного':'В избранное')} aria-pressed={selected} disabled={busy} title={tr(error||(selected?'Убрать из избранного':'В избранное'))} onClick={async e=>{e.stopPropagation();setBusy(true);setError('');try{const r=await fetch(kind==='card'?'/api/community':'/api/member-profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(kind==='card'?{action:'lock',slug:id,locked:!selected}:{action:'wish',itemId:id,wanted:!selected})});if(!r.ok)throw Error((await r.json()).error);cache.delete(kind);setSelected(!selected);window.dispatchEvent(new Event('s27-favorites-changed'));window.dispatchEvent(new Event('s27-community-changed'));}catch(e){setError(e instanceof Error?e.message:'Ошибка');}finally{setBusy(false);}}}><Star fill={selected?'currentColor':'none'}/></button>{error&&<span className="favorite-error" role="alert">{tr(error)}</span>}</>;
}
