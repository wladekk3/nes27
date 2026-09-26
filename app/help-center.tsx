'use client';
import {useState} from 'react';
import {tr} from '@/lib/i18n';
import {Button} from '@/components/ui/button';
const questions=[
['Как подключить Discord?','Используй /connect у бота NE S27 и введи полученный одноразовый код в окне входа на сайте. Никогда не отправляй пароль или токен Discord.'],
['Почему код награды не работает?','Вставь код целиком, сохрани регистр букв. Код может быть отключён, уже использован или исчерпать лимит. Если ошибка остаётся, сообщи менеджеру точный текст ошибки.'],
['Когда засчитывается приглашение?','Используй личную ссылку из /invite. Возраст Discord-аккаунта друга должен быть от 30 дней. Повторный вход ранее приглашённого участника не даёт новую награду. За двух подтверждённых друзей — один купон.'],
['Что означает звёздочка на карте?','Она защищает карту от переработки, в том числе от команды «Переработать все». Звёздочка товара сохраняет его в избранном.'],
['Почему некоторые карты скрыты?','Мифические и уникальные карты раскрываются только владельцу после получения. Их изображение недоступно другим участникам.'],
['Почему нет звука?','Проверь настройки звука и нажми на страницу: мобильный браузер может запрещать звук до первого касания.'],
['Как получить приз?','Проверь условия товара, оформи заявку и следи за её статусом. Реальные призы выдаются вручную после проверки. Покупка не означает мгновенную доставку.']
];
export function HelpCenter(){
 const [section,setSection]=useState(''),[description,setDescription]=useState(''),[status,setStatus]=useState('');
 async function copy(){const text=[tr('ОТЧЁТ ОБ ОШИБКЕ NE S27'),new Date().toISOString(),tr('Раздел')+': '+section,tr('Что произошло')+': '+description,'Browser: '+navigator.userAgent].join('\n');try{await navigator.clipboard.writeText(text);setStatus(tr('Отчёт скопирован. Отправь его менеджеру и приложи скриншот.'));}catch{setStatus(text);}}
 return <div className="help-center view-enter"><section className="panel"><h1>{tr('ПОМОЩЬ И ПОДДЕРЖКА')}</h1><p>{tr('Ответы на частые вопросы и удобный отчёт об ошибке.')}</p>{questions.map(([q,a])=><details key={q}><summary>{tr(q)}</summary><p>{tr(a)}</p></details>)}</section><section className="panel"><h2>{tr('СООБЩИТЬ ОБ ОШИБКЕ')}</h2><p>{tr('Отчёт копируется для отправки менеджеру. Пароли, коды входа и личные данные не нужны.')}</p><label>{tr('Раздел')}<input maxLength={100} value={section} onChange={e=>setSection(e.target.value)}/></label><label>{tr('Что произошло')}<textarea maxLength={2000} rows={5} value={description} onChange={e=>setDescription(e.target.value)} placeholder={tr('Что ты нажал, что ожидал и что получилось?')}/></label><Button disabled={!description.trim()} onClick={copy}>{tr('СКОПИРОВАТЬ ОТЧЁТ')}</Button><pre role="status">{status}</pre><a href="https://discord.gg/FnQMBUXFqt" target="_blank" rel="noreferrer">{tr('ОТКРЫТЬ DISCORD NE S27')}</a></section></div>;
}
