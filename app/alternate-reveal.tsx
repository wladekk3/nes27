'use client';
import {tr} from "@/lib/i18n";
import {useEffect,useState,type CSSProperties} from 'react';
import {Button} from '@/components/ui/button';
import {rarityNames,weights} from '@/lib/economy';
import {randomPresentation,wheelLanding} from '@/lib/reveal-geometry';
import {playCharge,playReveal,stopRevealAudio} from '@/lib/zone-soundtrack';
export type RevealCard={slug:string;name:string;rarity:string;image:string;tirazh?:number|null};
export const hues=['#93b64a','#4aa6ef','#bc63ed','#efbd50','#d84959','#74e6df'];
export function RevealSummary({cards,onDone}:{cards:RevealCard[];onDone:()=>void}){return <div className="reveal-summary"><p>{tr("ОПЕРАЦИЯ ЗАВЕРШЕНА")}</p><h2>{tr("ТВОЯ ДОБЫЧА")}</h2><div>{tr(cards.map((c,i)=><article key={i} style={{'--reveal-color':hues[c.rarity==='УНИКАЛЬНАЯ'?5:rarityNames.indexOf(c.rarity as typeof rarityNames[number])]} as CSSProperties}><img src={c.image} alt={tr(c.name)}/><b>{tr(c.name)}</b><small>{tr(c.rarity)}</small></article>))}</div><Button onClick={onDone}>{tr("В КОЛЛЕКЦИЮ")}</Button></div>;}
const decoys=['/cards/card_006_qwtep.jpg','/cards/card_004_zuban.jpg','/cards/card_008_lexa.webp','/cards/card_003_shinigami.jpg','/cards/card_007_myatus.png'];
export function AlternateReveal({cards,onDone,theme}:{cards:RevealCard[];onDone:()=>void;theme:string}){
 const [index,setIndex]=useState(0),[moving,setMoving]=useState(false),[revealed,setRevealed]=useState(false),[all,setAll]=useState(false);const card=cards[index],rank=rarityNames.indexOf(card.rarity as typeof rarityNames[number]);
 const [landings]=useState(()=>cards.map(()=>randomPresentation()));const landing=landings[index];
 const scanner=theme==='scanner-reveal',wheel=theme==='wheel-reveal';
 useEffect(()=>{if(all)return;setMoving(false);setRevealed(false);playCharge();const a=setTimeout(()=>setMoving(true),90),b=setTimeout(()=>{setRevealed(true);playReveal(rank,card.slug);},scanner?3900:5400);return()=>{clearTimeout(a);clearTimeout(b);stopRevealAudio();};},[index,all,theme]);
 if(all)return <RevealSummary cards={cards} onDone={onDone}/>;
 const angle=wheelLanding(weights,rank,landing.fraction);
 function next(){if(index+1<cards.length){setMoving(false);setRevealed(false);setIndex(i=>i+1);}else setAll(true);}
 return <div className={'alternate-reveal '+(revealed?'is-revealed':'')} style={{'--reveal-color':revealed?hues[rank]:'#c8bc98'} as CSSProperties}><header><span>{tr(wheel?'КОЛЕСО ЗОНЫ':scanner?'СКАНЕР АРТЕФАКТОВ':'ЛЕНТА КЕЙСА')}</span><b>{tr(index+1)} / {tr(cards.length)}</b></header>
 {tr(wheel?<div className="zone-wheel-scene"><i className="wheel-pointer"/><div key={index} className="zone-wheel" style={{transform:`rotate(${moving?landing.turns*360+360-angle:0}deg)`}}><span>NE S27</span></div><div className="wheel-legend">{tr(rarityNames.map((r,i)=><span key={r} style={{color:hues[i]}}>{tr(r)} {tr((weights[i]/100).toLocaleString('ru-RU'))}%</span>))}</div></div>:scanner?<div className={'scanner-scene '+(moving?'scanning':'')}><div className="scanner-image"><img src={card.image} alt={tr(revealed?card.name:'Зашифрованное досье')}/><i/></div><p>{tr(revealed?'ДОСЬЕ РАСШИФРОВАНО':'СЧИТЫВАЕМ СЛЕД АНОМАЛИИ…')}</p></div>:<div className="case-window"><i className="case-pointer"/><div key={index} className={'case-track '+(moving?'rolling':'')} style={{'--landing-index':landing.index,'--landing-fraction':landing.fraction} as CSSProperties}>{tr(Array.from({length:39},(_,i)=><div className="case-cell" key={i}><img src={i===landing.index?card.image:decoys[i%decoys.length]} alt={tr(i===landing.index&&revealed?card.name:'')}/></div>))}</div></div>)}
 <div className="alternate-result" aria-live="polite">{tr(revealed?<><img src={card.image} alt={tr(card.name)}/><small>{tr(card.rarity)}</small><h2>{tr(card.name)}</h2><Button onClick={next}>{tr(index+1<cards.length?'СЛЕДУЮЩИЙ ТАЙНИК':'ПОКАЗАТЬ ДОБЫЧУ')}</Button></>:<><h2>{tr(scanner?'ПРИЁМ СИГНАЛА':'ОЖИДАЕМ РЕЗУЛЬТАТ')}</h2><p>{tr("Один тайник — одна карточка")}</p></>)}</div><button className="reveal-skip" onClick={()=>setAll(true)}>{tr("Пропустить анимацию")}</button></div>;
}
