import english from './en.json';
export type Locale='ru'|'en';
let current:Locale='ru';
export function setLocale(value:Locale){current=value;}
const dictionary:Record<string,string>={...english,'ЛИДЕРЫ':'LEADERS','АПГРЕЙДЕР':'UPGRADER','НАГРАДЫ':'REWARDS','ЛОР':'LORE','ЛОР СЕЗОНА':'SEASON LORE','НОВОСТИ DISCORD':'DISCORD NEWS','УНИКАЛЬНАЯ':'UNIQUE','Фоновая музыка':'Background music'};
const templates=Object.entries(dictionary).filter(([key])=>/\{\d+\}/.test(key)).map(([key,value])=>({pattern:new RegExp('^'+key.split(/(\{\d+\})/).map(p=>/^\{\d+\}$/.test(p)?'(.*?)':p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$'),value}));
const phrases=Object.entries(dictionary).filter(([k])=>k.length>2&&!k.includes('{')).sort((a,b)=>b[0].length-a[0].length);
export function tr<T>(input:T):T{
 if(typeof input!=='string'||current==='ru'||!/[А-Яа-яЁё]/.test(input))return input;
 const key=input.trim().replace(/\s+/g,' '),prefix=input.match(/^\s*/)?.[0]||'',suffix=input.match(/\s*$/)?.[0]||'';
 let result=dictionary[key];
 if(!result)for(const t of templates){const match=t.pattern.exec(key);if(match){result=t.value.replace(/\{(\d+)\}/g,(_,i)=>String(tr(match[Number(i)+1])));break;}}
 // Dynamic labels built from known display names keep those names intact.
 if(!result){result=key;for(const [from,to] of phrases)if(result.includes(from))result=result.split(from).join(to);}
 return (prefix+result+suffix) as T;
}
