'use client';
import {newsChannelIds,editorIds} from '@/lib/collection-rewards';
import {useLanguage} from './language';
import {tr} from '@/lib/i18n';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';

type RoleForm={owners:string;admins:string;managers:string};
const emptyRoles:RoleForm={owners:'',admins:'',managers:''};
const splitIds=(value:string)=>value.split(/[\s,]+/).filter(Boolean);

export function BridgePanel(){
 const {locale}=useLanguage();
 const [data,setData]=useState<any>(null),[secret,setSecret]=useState(''),[roles,setRoles]=useState<RoleForm>(emptyRoles),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 async function load(initial=false){try{const response=await fetch('/api/bridge'),result=await response.json();if(!response.ok)throw Error(result.error);setData(result);if(initial)setRoles({owners:(result.owners||[]).join(', '),admins:(result.admins||[]).join(', '),managers:(result.managers||[]).join(', ')});}catch(error){setMessage(error instanceof Error?error.message:'Ошибка');}}
 useEffect(()=>{void load(true);const timer=setInterval(()=>load(),30000);return()=>clearInterval(timer);},[]);
 async function save(body:any){setBusy(true);setMessage('');try{const response=await fetch('/api/bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),result=await response.json();if(!response.ok)throw Error(result.error);if(result.secret)setSecret(result.secret);if(result.owners)setRoles({owners:result.owners.join(', '),admins:result.admins.join(', '),managers:result.managers.join(', ')});setConfirm(false);setMessage('Сохранено');await load();}catch(error){setMessage(error instanceof Error?error.message:'Ошибка');}finally{setBusy(false);}}
 async function copy(text:string){try{await navigator.clipboard.writeText(text);setMessage('Скопировано');}catch{setMessage('Выделите текст и скопируйте вручную');}}
 function roleInput(key:keyof RoleForm,label:string,description:string){return <label>{tr(label)}<input value={roles[key]} onChange={event=>setRoles({...roles,[key]:event.target.value})} placeholder="123456789012345678"/><small>{tr(description)}</small></label>;}
 return <section className="panel bridge-panel">
  <small>NE S27 / DISCORD</small>
  <details><summary>{locale==='en'?'NEWS MODULE & EDITOR STATUS':'МОДУЛЬ НОВОСТЕЙ И СТАТУС РЕДАКТОРА'}</summary><p>{locale==='en'?'Install the module in the existing Python bot. Site publication alone does not start news mirroring.':'Модуль нужно подключить в существующем Python-боте. Публикация сайта сама по себе не запускает перенос новостей.'}</p><a href='/downloads/NEWS-SETUP.md' target='_blank' rel='noreferrer'>README</a> · <a href='/downloads/s27_news.py' download>s27_news.py</a><p>{locale==='en'?'Approved channels:':'Разрешённые каналы:'}</p><ul>{newsChannelIds.map(id=><li key={id}><code>{id}</code></li>)}</ul><p>{locale==='en'?'Editors — display badge only, no permissions:':'Редакторы — только подпись, без прав:'}</p><ul>{[...editorIds].map(id=><li key={id}><code>{id}</code></li>)}</ul></details>
  <h2>{tr('СВЯЗЬ С БОТОМ')}</h2>
  <p role="status">{tr(data?.online?'Бот на связи':data?.configured?'Ключ готов. Ожидаем запуск бота.':'Бот ещё не подключён.')}</p>
  {data?.lastSeen&&<p>{tr('Последний сигнал: ')}{new Date(data.lastSeen).toLocaleString(locale==='en'?'en-GB':'ru-RU')}</p>}
  <label>{tr('Адрес для запросов')}<input readOnly value={data?.endpoint||''}/></label>
  <p>{tr('На хостинге бота укажите адрес сайта и общий ключ. Токен Discord вводится только на хостинге бота.')}</p>
  {data?.canConfigure&&!data.environmentManaged&&(confirm?<div><p>{tr('Старый ключ перестанет работать. Новый нужно сразу скопировать в настройки бота.')}</p><Button disabled={busy} onClick={()=>save({action:'rotate'})}>{tr('СОЗДАТЬ НОВЫЙ КЛЮЧ')}</Button><Button variant="outline" onClick={()=>setConfirm(false)}>{tr('ОТМЕНА')}</Button></div>:<Button disabled={busy} onClick={()=>data.configured?setConfirm(true):save({action:'rotate'})}>{tr(data.configured?'ЗАМЕНИТЬ КЛЮЧ':'СОЗДАТЬ КЛЮЧ СВЯЗИ')}</Button>)}
  {secret&&<div className="bridge-secret"><p>{tr('Ключ показывается только сейчас. Не публикуйте его в Discord.')}</p><textarea readOnly value={'SITE_BASE_URL='+new URL(data.endpoint).origin+'\nBOT_WEBHOOK_SECRET='+secret}/><Button onClick={()=>copy('SITE_BASE_URL='+new URL(data.endpoint).origin+'\nBOT_WEBHOOK_SECRET='+secret)}>{tr('СКОПИРОВАТЬ НАСТРОЙКИ')}</Button><Button variant="outline" onClick={()=>setSecret('')}>{tr('СКРЫТЬ КЛЮЧ')}</Button></div>}
  {data?.canManageRoles&&<form className="access-role-editor" onSubmit={event=>{event.preventDefault();void save({action:'roles',owners:splitIds(roles.owners),admins:splitIds(roles.admins),managers:splitIds(roles.managers)});}}><h2>{tr('УПРАВЛЕНИЕ ДОСТУПОМ')}</h2><p>{tr('Укажите Discord ID через запятую. Овнеры управляют всеми ролями; администраторы — сайтом; менеджеры — кодами и призами.')}</p>{roleInput('owners','ОВНЕРЫ','Главный уровень доступа. Нельзя удалить последнего овнера или собственный доступ.')}{roleInput('admins','АДМИНИСТРАТОРЫ','Полный доступ к сайту, участникам, наградам и техническому режиму.')}{roleInput('managers','МЕНЕДЖЕРЫ','Доступ к кодам, заявкам и выдаче призов без настроек сайта.')} {(data.bootstrapOwners?.length||data.bootstrapAdmins?.length)?<p><small>{tr('Защищённые ID из Cloudflare нельзя удалить через сайт: ')}{[...new Set([...(data.bootstrapOwners||[]),...(data.bootstrapAdmins||[])])].join(', ')}</small></p>:null}<Button disabled={busy}>{tr('СОХРАНИТЬ РОЛИ')}</Button></form>}
  {data?.canConfigure&&!data?.canManageRoles&&<form onSubmit={event=>{event.preventDefault();void save({action:'managers',ids:splitIds(roles.managers)});}}>{roleInput('managers','Discord ID менеджеров — через запятую','Эти участники получат доступ к кодам и выдаче призов после входа через Discord-бота.')}<Button disabled={busy}>{tr('СОХРАНИТЬ МЕНЕДЖЕРОВ')}</Button></form>}
  <details><summary>{tr('ПОРЯДОК ПОДКЛЮЧЕНИЯ')}</summary><ol><li>{tr('Создайте ключ связи и скопируйте настройки на bot-hosting.net.')}</li><li>{tr('В боте задайте DISCORD_TOKEN, GUILD_ID, TICKET_CATEGORY_ID и MANAGER_ROLE_ID.')}</li><li>{tr('Бот отправляет подписанный ping и guild_stats каждые 60 секунд.')}</li><li>{tr('Команда /connect в боте выдаёт одноразовую ссылку на сайт. Пароль Discord не нужен.')}</li><li>{tr('Бот опрашивает pending_claims, создаёт закрытый тикет и подтверждает claim_ticket. После выдачи — claim_fulfilled.')}</li></ol><a href="/downloads/bot-guide.html" target="_blank" rel="noreferrer">{tr('ОТКРЫТЬ ПОЛНУЮ ИНСТРУКЦИЮ')}</a></details>
  <p role="status">{tr(message)}</p>
 </section>;
}
