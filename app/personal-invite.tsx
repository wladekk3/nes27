'use client';
import {useCallback,useEffect,useState} from 'react';
import {Copy,ExternalLink,LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {tr} from '@/lib/i18n';

type InviteState={status:string;inviteUrl?:string;error?:string};

export function PersonalInvite({account,onMessage}:{account:any;onMessage:(message:string)=>void}){
 const [state,setState]=useState<InviteState>({status:'loading'});
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  if(!account||account.is_test){setState({status:'unavailable'});return;}
  try{const response=await fetch('/api/referral-invite',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error);setState(data);}catch(error){setState({status:'error',error:error instanceof Error?error.message:'Ошибка загрузки'});}
 },[account]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{if(state.status!=='pending')return;const timer=setInterval(()=>void load(),2500);return()=>clearInterval(timer);},[state.status,load]);
 async function requestInvite(){setBusy(true);try{const response=await fetch('/api/referral-invite',{method:'POST'});const data=await response.json();if(!response.ok)throw Error(data.error);setState(data);}catch(error){setState({status:'error',error:error instanceof Error?error.message:'Ошибка создания ссылки'});}finally{setBusy(false);}}
 async function copy(){if(!state.inviteUrl)return;try{await navigator.clipboard.writeText(state.inviteUrl);onMessage('ЛИЧНАЯ ССЫЛКА СКОПИРОВАНА');}catch{onMessage('СКОПИРУЙТЕ ССЫЛКУ ИЗ ПОЛЯ');}}
 if(!account)return <p>{tr('Войдите в профиль, чтобы получить личную ссылку.')}</p>;
 if(account.is_test)return <p>{tr('Подключите Discord: личная ссылка доступна только участникам сервера.')}</p>;
 return <div className="personal-invite">
  {state.status==='ready'&&state.inviteUrl?<><div className="invite-field"><input value={state.inviteUrl} readOnly aria-label={tr('Личная ссылка-приглашение Discord')}/><button onClick={copy} type="button" aria-label={tr('Копировать ссылку')}><Copy/></button></div><div className="referral-actions"><Button onClick={copy}><Copy/> {tr('СКОПИРОВАТЬ ЛИЧНУЮ ССЫЛКУ')}</Button><a className="outline-link primary-link" href={state.inviteUrl} target="_blank" rel="noreferrer">{tr('ОТКРЫТЬ ССЫЛКУ ')}<ExternalLink/></a></div></>:null}
  {state.status==='pending'?<p role="status"><LoaderCircle className="spin"/> {tr('Бот создаёт вашу постоянную ссылку… Обычно это занимает несколько секунд.')}</p>:null}
  {['not_requested','error'].includes(state.status)?<><Button disabled={busy} onClick={requestInvite}>{busy?<LoaderCircle className="spin"/>:null}{tr('ПОЛУЧИТЬ ЛИЧНУЮ ССЫЛКУ')}</Button>{state.error?<p role="alert">{tr(state.error)}</p>:null}</>:null}
  <small>{tr('Ссылка закрепляется за вашим Discord навсегда. Повторный запрос вернёт ту же ссылку.')}</small>
 </div>;
}
