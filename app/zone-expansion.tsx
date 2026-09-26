'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useLanguage} from './language';
import {collectionRewards,seasonLore,seasonCards} from '@/lib/collection-rewards';
import {upgradeChance,upgradeTarget} from '@/lib/upgrader';
import {pool} from '@/lib/economy';
import {cardTitle,cardLore} from '@/lib/card-language';
import {playCharge,playReveal,stopRevealAudio} from '@/lib/zone-soundtrack';
type Card={slug:string;name:string;rarity:string;image:string;quote?:string;tirazh:number|null};
type Props={cards:Card[];account:any;onAccount:(a:any)=>void};
export function CollectionRewards({cards,account,onAccount}:Props){
 const {locale}=useLanguage(),en=locale==='en', [claims,setClaims]=useState<string[]>([]),[ready,setReady]=useState(false),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
 async function load(){setReady(false);try{const r=await fetch('/api/collection-rewards');if(!r.ok)throw Error();const d=await r.json();setClaims(d.claims.map((c:any)=>c.set_id));setReady(true);}catch{setMessage(en?'Could not load claims. Retry.':'Не удалось загрузить награды. Повторите.');}}
 useEffect(()=>{setClaims([]);void load();},[account?.discord_id]);
 const owned=Object.fromEntries((account?.cards||[]).map((c:any)=>[c.card_slug,c.count]));
 async function claim(id:string){setBusy(id);setMessage('');try{const r=await fetch('/api/collection-rewards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({setId:id})});const d=await r.json();if(!r.ok)throw Error(d.error);onAccount(d.profile);await load();setMessage(en?'Caches credited. Your prize request has been sent to the manager.':'Тайники начислены. Заявка на приз отправлена менеджеру.');}catch(e){setMessage(String(e instanceof Error?e.message:e));}finally{setBusy('');}}
 return <section className="expansion-panel"><h1>{en?'COLLECTION REWARDS':'НАГРАДЫ ЗА КОЛЛЕКЦИИ'}</h1><p>{en?'Claim each reward once. Your cards stay in your collection. Caches are credited immediately; the manager handles prizes and roles.':'Каждая награда — один раз. Карты остаются у вас. Тайники начисляются сразу; призы и роли выдаёт менеджер.'}</p>{message&&<p role="status">{message}</p>}{!ready&&<Button onClick={load}>{en?'Retry':'Обновить'}</Button>}<div className="reward-grid">{collectionRewards.map(s=>{const count=s.cards.filter(c=>Number(owned[c])>0).length,claimed=claims.includes(s.id);return <article key={s.id}><small>{en?'COLLECTION':'КОЛЛЕКЦИЯ'}</small><h2>{en?s.en:s.name}</h2><b className="set-count">{count}<span> / {s.cards.length}</span></b><progress value={count} max={s.cards.length}/><p>{en?s.prizeEn:s.prize}</p>{s.coupons>0&&<strong>+{s.coupons} {en?'caches':'тайников'}</strong>}<details><summary>{en?'Required cards':'Нужные карты'}</summary><ul>{s.cards.map(slug=>{const c=cards.find(c=>c.slug===slug);return <li key={slug}>{owned[slug]?'✓':'○'} {c?cardTitle(c,locale):slug}{c?.tirazh!=null?` · #${c.tirazh}`:''}</li>;})}</ul></details><Button disabled={!account||!ready||!!busy||claimed||count<s.cards.length} onClick={()=>claim(s.id)}>{claimed?(en?'CLAIM SUBMITTED':'ЗАЯВКА ОТПРАВЛЕНА'):!account?(en?'SIGN IN FIRST':'ВОЙДИТЕ В ПРОФИЛЬ'):s.coupons?(en?'CLAIM REWARD':'ЗАБРАТЬ НАГРАДУ'):(en?'CONTACT MANAGER':'ЗАПРОСИТЬ ПРИЗ')}</Button></article>;})}</div></section>;
}
export {UpgradeStation} from './upgrade-station';
export function LoreLibrary({cards}:{cards:Card[]}){const {locale}=useLanguage(),en=locale==='en';const [category,setCategory]=useState('all');return <section className="expansion-panel lore-library"><h1>{en?'THE ZONE ARCHIVE':'ЛОР ЗОНЫ'}</h1><p>{en?'The fictional expedition of Shadow of Chernobyl and the themed chapters of the NE S27 community. Classified dossiers unlock only after you obtain them.':'Художественная история экспедиции Shadow of Chernobyl и тематические главы сообщества NE S27. Засекреченные досье открываются только после получения.'}</p><div className="upgrade-filters">{[['all',en?'All dossiers':'Все досье'],['lore',en?'Season lore':'Лор сезона'],['season',en?'Server chapters':'Главы сервера']].map(([id,label])=><Button key={id} variant="outline" aria-pressed={category===id} onClick={()=>setCategory(id)}>{label}</Button>)}</div><div className="lore-grid">{cards.filter(c=>category==='all'||(category==='lore'?seasonLore:seasonCards).includes(c.slug)).map(c=><article key={c.slug}><img src={c.image} alt="" loading="lazy"/><div><small>{c.tirazh==null?'███':`#${c.tirazh}`}</small><h2>{cardTitle(c,locale)}</h2><p>{cardLore(c,locale)}</p></div></article>)}</div></section>;}
export function MainPrizes({onRewards}:{onRewards:()=>void}){const {locale}=useLanguage(),en=locale==='en';const prizes=[
 ['/prizes/gta6.jpg','GTA VI'],
 ['/prizes/stalker2.png','S.T.A.L.K.E.R. 2'],
 ['/prizes/nitro.png','Discord Nitro Full'],
 ['/prizes/steam.webp',en?'Steam game / credit':'Игра Steam / баланс'],
 ['/prizes/robux.jpg','500 / 1000 Robux'],
];return <section className="expansion-panel main-prizes"><header><span>🎁</span><h2>{en?'MAIN PRIZES':'ГЛАВНЫЕ ПРИЗЫ'}</h2></header><div className="main-prize-cards">{prizes.map(([src,label])=><article key={label}><img src={src} alt="" loading="eager"/><strong>{label}</strong></article>)}</div><footer><p>{en?'Collect card sets to unlock caches, roles and headline prizes.':'Собирайте наборы карточек и открывайте тайники, роли и главные призы.'}</p><Button onClick={onRewards}>{en?'VIEW REQUIREMENTS':'УСЛОВИЯ ПОЛУЧЕНИЯ'}</Button></footer></section>;}
