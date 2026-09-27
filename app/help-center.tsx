'use client';
import {useState} from 'react';
import {tr} from '@/lib/i18n';
import {Button} from '@/components/ui/button';
const questions=[
['Как подключить Discord?','Используй /connect у бота NE S27 и введи полученный одноразовый код в окне входа на сайте. Никогда не отправляй пароль или токен Discord.'],
['Почему код награды не работает?','Вставь код целиком, сохрани регистр букв. Код может быть отключён, уже использован или исчерпать лимит. Если ошибка остаётся, сообщи менеджеру точный текст ошибки.'],
['Когда засчитывается приглашение?','Получи постоянную личную ссылку во вкладке «Пригласить» на сайте. Возраст Discord-аккаунта друга должен быть от 30 дней. Повторный вход ранее приглашённого участника не даёт новую награду. За двух подтверждённых друзей — один купон.'],
['Что означает звёздочка на карте?','Она защищает карту от переработки, в том числе от команды «Переработать все». Звёздочка товара сохраняет его в избранном.'],
['Почему некоторые карты скрыты?','Мифические и уникальные карты раскрываются только владельцу после получения. Их изображение недоступно другим участникам.'],
['Почему нет звука?','Проверь настройки звука и нажми на страницу: мобильный браузер может запрещать звук до первого касания.'],
['Как получить приз?','Проверь условия товара, оформи заявку и следи за её статусом. Реальные призы выдаются вручную после проверки. Покупка не означает мгновенную доставку.']
];
export function HelpCenter(){
 const [section,setSection]=useState(''),[description,setDescription]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 async function submit(){setBusy(true);setStatus('');try{const response=await fetch('/api/bug-reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({section,description,userAgent:navigator.userAgent,pageUrl:location.pathname+location.search})}),data=await response.json();if(!response.ok)throw Error(data.error||'Ошибка отправки');setDescription('');setStatus(tr('Отчёт отправлен администрации. Номер: ')+data.id.slice(0,8).toUpperCase());}catch(error){setStatus(error instanceof Error?error.message:tr('Не удалось отправить отчёт. Попробуйте позже.'));}finally{setBusy(false);}}
 return <div className="help-center view-enter"><section className="panel"><h1>{tr('ПОМОЩЬ И ПОДДЕРЖКА')}</h1><p>{tr('Ответы на частые вопросы и удобный отчёт об ошибке.')}</p>{questions.map(([q,a])=><details key={q}><summary>{tr(q)}</summary><p>{tr(a)}</p></details>)}</section><section className="panel"><h2>{tr('СООБЩИТЬ ОБ ОШИБКЕ')}</h2><p>{tr('Отчёт отправляется напрямую администрации NE S27 и появляется в админ-панели. Пароли, коды входа и личные данные не нужны.')}</p><label>{tr('Раздел')}<input maxLength={100} value={section} onChange={e=>setSection(e.target.value)}/></label><label>{tr('Что произошло')}<textarea maxLength={2000} rows={5} value={description} onChange={e=>setDescription(e.target.value)} placeholder={tr('Что ты нажал, что ожидал и что получилось?')}/></label><Button disabled={busy||description.trim().length<5} onClick={submit}>{tr(busy?'ОТПРАВЛЯЕМ…':'ОТПРАВИТЬ ОТЧЁТ')}</Button><pre role="status">{status}</pre><a href="https://discord.gg/FnQMBUXFqt" target="_blank" rel="noreferrer">{tr('ОТКРЫТЬ DISCORD NE S27')}</a></section></div>;
}
