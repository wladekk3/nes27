'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {setLocale,type Locale} from '@/lib/i18n';
const LanguageContext=createContext<{locale:Locale;change:(v:Locale)=>void}>({locale:'ru',change:()=>{}});
export function LanguageProvider({children}:{children:React.ReactNode}){const [locale,update]=useState<Locale>('ru');function change(v:Locale){setLocale(v);update(v);document.documentElement.lang=v;document.title=v==='en'?'NE S27 // ZONE ARCHIVE':'NE S27 // АРХИВ ЗОНЫ';try{localStorage.setItem('s27-language',v);}catch{}}useEffect(()=>{try{if(localStorage.getItem('s27-language')==='en')change('en');}catch{}},[]);return <LanguageContext.Provider value={{locale,change}}>{children}</LanguageContext.Provider>;}
export function useLanguage(){return useContext(LanguageContext);}
export function LanguageSwitch(){const {locale,change}=useLanguage();return <button className="language-switch" type="button" onClick={()=>change(locale==='ru'?'en':'ru')} aria-label={locale==='ru'?'Switch to English':'Переключить на русский'}>{locale==='ru'?'EN':'RU'}</button>;}
