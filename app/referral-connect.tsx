'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {tr} from '@/lib/i18n';
export function ReferralConnect({account,onAccount,incomingOnly=false}:{account:any;onAccount:(p:any)=>void;incomingOnly?:boolean}){
 const [nick,setNick]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [incoming,setIncoming]=useState(false);
 useEffect(()=>{const ref=new URLSearchParams(location.search).get('ref')||'';setNick(ref);setIncoming(!!ref);},[]);
 async function copy(){const url=location.origin+'/?ref='+encodeURIComponent(account.username);try{await navigator.clipboard.writeText(url);setMessage('Ссылка скопирована');}catch{setMessage(url);}}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);try{const r=await fetch('/api/referrals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({referrer:nick})});const d=await r.json();if(!r.ok)throw Error(d.error);onAccount(d.profile);setMessage('Приглашение подтверждено');}catch(e){setMessage(e instanceof Error?e.message:'Ошибка');}finally{setBusy(false);}}
 if(incomingOnly&&!incoming)return null;
 return <section className="panel referral-connect"><h3>{tr('ПРИГЛАШЕНИЯ НА САЙТ')}</h3><p>{tr('2 приглашённых участника = 1 купон. Возраст аккаунта Discord — от 30 дней. Без ожидания 7 дней.')}</p>{account&&!account.is_test&&<Button variant="outline" onClick={copy}>{tr('СКОПИРОВАТЬ МОЮ ССЫЛКУ')}</Button>}<form onSubmit={submit}><label>{tr('Кто тебя пригласил?')}<input required maxLength={100} value={nick} onChange={e=>setNick(e.target.value)} placeholder="@wladekk3" autoCapitalize="none" autoCorrect="off" /></label><Button disabled={busy||!account||account.is_test} type="submit">{tr('ПОДТВЕРДИТЬ ПРИГЛАСИВШЕГО')}</Button></form><small>{tr('Можно указать один раз. Даже если ты уже состоял на Discord-сервере. Сначала подключи Discord к сайту.')}</small>{message&&<p role="status">{tr(message)}</p>}</section>;
}
