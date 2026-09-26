'use client';
import {tr} from "@/lib/i18n";
import {AlternateReveal,RevealSummary,hues,type RevealCard} from './alternate-reveal';
import {useEffect,useState,type CSSProperties} from 'react';
import {Button} from '@/components/ui/button';
import {playWalkout,stopRevealAudio} from '@/lib/zone-soundtrack';
import {seasonLore,seasonCards,uniqueCards} from '@/lib/collection-rewards';
import {rarityNames} from '@/lib/economy';
const archive=new Set(['burnt-map','silence','everfrost','signal27']);
function WalkoutReveal({cards,onDone,theme}:{cards:RevealCard[];onDone:()=>void;theme?:string}){
 const [index,setIndex]=useState(0),[stage,setStage]=useState(0),[all,setAll]=useState(false);
 const card=cards[index],rank=uniqueCards.includes(card.slug)?5:rarityNames.indexOf(card.rarity as typeof rarityNames[number]);
 useEffect(()=>{if(all)return;setStage(0);const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced){setStage(5);playWalkout(5,rank,card.slug);return()=>stopRevealAudio();}playWalkout(0);const timers=[1800,3300,4500,5600,6900].map((time,i)=>setTimeout(()=>{setStage(i+1);playWalkout(i+1,rank,card.slug);},time));return()=>{timers.forEach(clearTimeout);stopRevealAudio();};},[index,all,rank]);
 function next(){if(index+1<cards.length){setStage(0);setIndex(i=>i+1);}else setAll(true);}
 if(all)return <RevealSummary cards={cards} onDone={onDone}/>;
 const category=seasonLore.includes(card.slug)?'ЛОР СЕЗОНА':seasonCards.includes(card.slug)?'СЕЗОН':archive.has(card.slug)?'АРХИВ':'ДОСЬЕ';
 const heading=['НЕИЗВЕСТНЫЙ СИГНАЛ',card.rarity,category,card.tirazh==null?'ЗАСЕКРЕЧЕНО':String(card.tirazh).padStart(2,'0'),card.name][stage];
 const label=['УСТАНАВЛИВАЕМ СВЯЗЬ','РЕДКОСТЬ','ТИП ДОСЬЕ',card.tirazh==null?'ЗАКРЫТОЕ ДОСЬЕ':'ТИРАЖ №','ИМЯ В ДОСЬЕ'][stage];
 return <div className={`vault-reveal phase-${stage} rank-${stage?rank:'unknown'} ${theme==='aurora-reveal'?'vault-aurora':''}`} style={{'--reveal-color':stage?hues[rank]:'#c7c7b6'} as CSSProperties}>
 <div className="vault-scene" aria-hidden="true"/><div className="vault-haze" aria-hidden="true"/><div className="vault-beams" aria-hidden="true"/>
 <div className="vault-embers" aria-hidden="true">{tr(Array.from({length:24},(_,i)=><i key={i} style={{'--i':i} as CSSProperties}/>))}</div>
 <header><span>{tr("NE S27 / ДОСЬЕ ЗОНЫ")}</span><b>{tr("ТАЙНИК ")}{tr(index+1)} / {tr(cards.length)}</b></header>
 <main aria-live="polite" aria-atomic="true">{tr(stage<5?<div key={`${index}-${stage}`} className={'vault-title title-'+stage}><small>{tr(label)}</small><h2>{tr(heading)}</h2><span className="vault-rule"/><p>{tr(stage===0?'ОЖИДАНИЕ ОТВЕТА':stage===1?'СИГНАЛ ПОДТВЕРЖДЁН':stage===2?'ОТКРЫВАЕМ ЗАПИСЬ':stage===3?'ПРОВЕРКА ЗАВЕРШЕНА':'ДОСЬЕ РАСШИФРОВАНО')}</p></div>:<div className="vault-winner"><img src={card.image} alt={tr(card.name)}/><small>{tr(card.rarity)}</small><h2>{tr(card.name)}</h2><Button onClick={next}>{tr(index+1<cards.length?'СЛЕДУЮЩИЙ ТАЙНИК':'ПОКАЗАТЬ ДОБЫЧУ')}</Button></div>)}</main>
 <footer><div className="vault-progress" aria-label={tr("Этап открытия")}>{tr(['Сигнал','Редкость','Тип','Тираж','Имя','Карточка'].map((x,i)=><span key={x} aria-current={i===stage?'step':undefined} className={i<=stage?'complete':''}>{tr(x)}</span>))}</div><button className="reveal-skip" onClick={()=>setAll(true)}>{tr("Пропустить анимацию")}</button></footer>
 </div>;
}
export function CacheReveal(props:{cards:RevealCard[];onDone:()=>void;theme?:string}){return !props.cards.some(c=>c.rarity==='МИФИЧЕСКАЯ'||uniqueCards.includes(c.slug))&&['wheel-reveal','case-reveal','scanner-reveal'].includes(props.theme||'')?<AlternateReveal {...props} theme={props.theme!}/>:<WalkoutReveal {...props}/>;}
