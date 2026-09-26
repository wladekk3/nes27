'use client';
import {Children,isValidElement,useEffect,useState,type ReactNode} from 'react';
import {Star} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {tr} from '@/lib/i18n';
import {readFavorites} from './favorite-star';

export function FavoriteCollection({children,kind,className,userId}:{children:ReactNode;kind:'card'|'product';className:string;userId?:string}){
 const [only,setOnly]=useState(false),[ids,setIds]=useState<string[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let live=true,revision=0;setOnly(false);setIds([]);async function refresh(){const request=++revision;if(!userId)return;setLoading(true);setError('');try{const data=await readFavorites(kind);if(live&&request===revision)setIds(kind==='card'?data.locks||[]:data.extras?.wishlist||[]);}catch{if(live&&request===revision)setError(tr('Не удалось загрузить избранное. Повтори попытку.'));}finally{if(live&&request===revision)setLoading(false);}}void refresh();window.addEventListener('s27-favorites-changed',refresh);return()=>{live=false;window.removeEventListener('s27-favorites-changed',refresh);};},[userId,kind]);
 const all=Children.toArray(children);const favorites=all.filter(child=>{if(!isValidElement(child))return false;const props=child.props as {'data-favorite-id'?:string;card?:{slug:string}};return ids.includes(props['data-favorite-id']||props.card?.slug||'');});
 return <><div className="favorite-filter" role="group" aria-label={tr('Фильтр избранного')}><Button variant="outline" aria-pressed={!only} onClick={()=>setOnly(false)}>{tr('Все')} · {all.length}</Button><Button variant="outline" aria-pressed={only} disabled={!userId||loading} onClick={()=>setOnly(true)}><Star size={17}/>{tr('Избранное')} · {favorites.length}</Button><small>{tr(!userId?'Войди, чтобы сохранять избранное.':loading?'Загружаем избранное…':kind==='card'?'Карты со звёздочкой защищены от переработки.':'Отмечай звёздочкой то, что хочешь сохранить.')}</small></div>{error&&<p role="alert">{error}<Button variant="outline" onClick={()=>window.dispatchEvent(new Event('s27-favorites-changed'))}>{tr('Обновить')}</Button></p>}{only&&!loading&&!favorites.length?<div className="favorite-empty" role="status"><Star/><p>{tr('Здесь пока нет избранного в выбранной категории.')}</p><Button variant="outline" onClick={()=>setOnly(false)}>{tr('ПОКАЗАТЬ ВСЕ')}</Button></div>:<div className={className}>{only?favorites:all}</div>}</>;
}
