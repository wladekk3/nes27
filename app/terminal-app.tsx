"use client";
import {HelpCenter} from "./help-center";
import {Leaderboard} from './leaderboard';
import {CollectionRewards,UpgradeStation,LoreLibrary,MainPrizes} from './zone-expansion';
import {DiscordNews} from './discord-news';
import {cardTitle,cardLore} from '@/lib/card-language';
import {localizedCardImage} from '@/lib/card-images';
import {uniqueCards} from '@/lib/collection-rewards';
import {tr} from "@/lib/i18n";

import {MemberHub} from './member-hub';
import {PersonalEffects} from './personal-effects';
import {cosmetics} from '@/lib/cosmetics';
import {CommunityHub} from './community-hub';
import {FavoriteStar} from './favorite-star';
import {FavoriteCollection} from './favorite-collection';
import {InventoryAdmin} from './inventory-admin';
import {SeasonLore} from './season-lore';
import { CacheReveal } from './cache-reveal';
import {BridgePanel} from './bridge-panel';
import {LanguageSwitch,useLanguage} from './language';
import {ReferralConnect} from './referral-connect';
import {CodeRedeem,ManagerHub} from './code-hub';
import {GuildPulse} from './guild-pulse';
import {MaintenanceGate} from './maintenance-gate';
import {Slider} from '@/components/ui/slider';
import {initializeArrivalAudio,configureAudio,defaultAudio,freeSounds,previewSound,playClick,playReveal,unlockAudio,type AudioPrefs} from '@/lib/zone-soundtrack';
import {Volume2,VolumeX} from 'lucide-react';
import { draw, rarityNames, products } from "@/lib/economy";
import {confirmedCards} from "@/lib/confirmed-cards";
import { type CSSProperties, type FormEvent, useEffect, useMemo, useState, useRef } from "react";
import {
  Archive,
  BadgeCheck,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Coins,
  Copy,
  ExternalLink,
  Fingerprint,
  Gift,
  Home,
  IdCard,
  KeyRound,
  Link2,
  LockKeyhole,
  LogOut,
  Menu,
  Newspaper,
  PackageOpen,
  Radio,
  Recycle,
  RotateCcw,
  Save,
  Server,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  Signal,
  Target,
  Ticket,
  UserPlus,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

type View =
  | "upgrader" | "rewards" | "lore" | "news" | "leaders"
  | "help"
  | "home"
  | "season"
  | "archive"
  | "cards"
  | "packs"
  | "shop"
  | "invite"
  | "missions"
  | "profile"
  | "manager"
  | "admin";

type Rarity =
  | "НЕОБЫЧНАЯ"
  | "РЕДКАЯ"
  | "ЭПИЧЕСКАЯ"
  | "ЛЕГЕНДАРНАЯ"
  | "МИФИЧЕСКАЯ" | "УНИКАЛЬНАЯ";

type CardData = {
  slug: string;
  name: string;
  rarity: Rarity;
  weapon: string;
  callsign: string;
  quote: string;
  tirazh: number | null;
  image: string;
  secret?: boolean;
};

type DemoState = {
  tokens: number;
  fragments: number;
  packCount: number;
  owned: Record<string, number>;
  claimed: string[];
  pendingReferrals: number;
  verifiedReferrals: number;
};

type AccountProfile = {
  is_test?:boolean;
  discord_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  tokens: number;
  fragments: number;
  pack_count: number;
  is_admin: boolean;
  is_editor?: boolean;
  is_manager?:boolean;
  cards: Array<{ card_slug: string; count: number }>;
  referrals: { pending: number; verified: number;currentVerified?:number };
};

type AdminSnapshot = {
  stats: {
    users: number;
    cards: number;
    pendingReferrals: number;
    verifiedReferrals: number;
  };
  settings: Record<string, string>;
  audit: Array<{
    actor_id?: string | null;
    action: string;
    target_id?: string | null;
    created_at: number;
  }>;
};

type ActConfig = {
  number: string;
  title: string;
  status: "АКТИВНА" | "ЗАКРЫТА" | "ЗАВЕРШЕНА";
  progress: number;
  text: string;
};

type NewsItem = {
  date: string;
  title: string;
  tag: string;
};

type SiteConfig = {
  maintenanceMode?: boolean;
  maintenanceCycle?: number;
  brand: string;
  portalTitle: string;
  seasonTitle: string;
  seasonSubtitle: string;
  nextPartAt?: string;
  accent: string;
  heroDesktop?:string;heroMobile?:string;frameStyle?:string;frameWidth?:number;heroLore?:string;
  referralReward: number;
  referralHoldDays: number;
  dismantleValues: Record<Rarity, number>;
  acts: ActConfig[];
  news: NewsItem[];
};

const inviteUrl = "https://discord.gg/FnQMBUXFqt";

const publicCards: CardData[] = [
  {
    slug: "silverhand",
    name: "SILVERHAND",
    rarity: "ЛЕГЕНДАРНАЯ",
    weapon: "MALORIAN ARMS 3516",
    callsign: "JOHNNY",
    quote: "Бывшая звезда, теперь — призрак. Его песни стали криком против системы.",
    tirazh: 1,
    image: "/cards/card_001_silverhand.jpg",
  },
  {
    slug: "vlad",
    name: "VLAD",
    rarity: "ЛЕГЕНДАРНАЯ",
    weapon: "M4A1, GLOCK 17",
    callsign: "ИНКВИЗИТОР",
    quote: "Зона не прощает слабости. Сталь держит, пуля говорит, а мы остаёмся.",
    tirazh: 2,
    image: "/cards/card_002_vlad.jpg",
  },
  {
    slug: "shinigami",
    name: "SHINIGAMI",
    rarity: "ЭПИЧЕСКАЯ",
    weapon: "АК-74Н",
    callsign: "ШИГА",
    quote:
      "В Зоне мутанты меняются, а радиация остаётся. Сегодня я охочусь на них, завтра Зона охотится на меня.",
    tirazh: 3,
    image: "/cards/card_003_shinigami.jpg",
  },
  {
    slug: "zuban",
    name: "ZUBAN",
    rarity: "РЕДКАЯ",
    weapon: "ПИСТОЛЕТ EBONY",
    callsign: "КЛЫК",
    quote:
      "Холодное пиво, горячая компания и аномалии нам не страшны! За Зону, за жизнь, за веселье!",
    tirazh: 4,
    image: "/cards/card_004_zuban.jpg",
  },
  {
    slug: "oleg",
    name: "OLEG",
    rarity: "ЭПИЧЕСКАЯ",
    weapon: "SCAR-H",
    callsign: "ПАУЭРЛИФТЕР",
    quote: "Железо учит держать вес. Зона учит держать боль. А SCAR-H снимает любые вопросы.",
    tirazh: 5,
    image: "/cards/card_005_oleg.jpg",
  },
  {
    slug: "qwtep",
    name: "QWTEP",
    rarity: "НЕОБЫЧНАЯ",
    weapon: "АКС-47",
    callsign: "МАГАРЫЧ",
    quote: "Мотор ревёт, сердце бьётся, дорога зовёт, в Зоне только ты, мотоцикл и желание доехать.",
    tirazh: 6,
    image: "/cards/card_006_qwtep.jpg",
  },
  {
    slug: "myatus",
    name: "MYATUS",
    rarity: "РЕДКАЯ",
    weapon: "МАГАЗИННО-СНАЙПЕРСКАЯ ВИНТОВКА ВПР-338",
    callsign: "МЕНТОЛ",
    quote: "Мята глушит запах контрабанды, но Зона всё равно чует, что ты несёшь.",
    tirazh: 7,
    image: "/cards/card_007_myatus.png",
  },
  {
    slug: "lexa",
    name: "LEXA",
    rarity: "НЕОБЫЧНАЯ",
    weapon: "M4 MWS",
    callsign: "ДЖЭКСОН",
    quote:
      "Раньше я бил по мячу ради победы, теперь держу оружие ради неё. Успех любит тех, кто идёт до конца.",
    tirazh: 8,
    image: "/cards/card_008_lexa.webp",
  },
  {slug:'manager', name:'ЗАСЕКРЕЧЕНО',rarity:'МИФИЧЕСКАЯ',weapon:'███',callsign:'███',quote:'Доступ открывается после получения карты.',tirazh:null,image:'/classified.svg',secret:true},
  {slug:'founders', name:'ЗАСЕКРЕЧЕНО',rarity:'МИФИЧЕСКАЯ',weapon:'███',callsign:'███',quote:'Доступ открывается после получения карты.',tirazh:24,image:'/classified.svg',secret:true},
{"slug": "burnt-map", "name": "ОБГОРЕВШАЯ КАРТА", "tirazh": 10, "rarity": "НЕОБЫЧНАЯ", "weapon": "—", "callsign": "АРХИВ", "quote": "Лор будет добавлен после утверждения.", "image": "/cards/burnt-map.webp"},
{"slug": "silence", "name": "ПЕРИОД ТИШИНЫ", "tirazh": 11, "rarity": "РЕДКАЯ", "weapon": "—", "callsign": "АРХИВ", "quote": "Лор будет добавлен после утверждения.", "image": "/cards/silence.webp"},
{"slug": "everfrost", "name": "EVERFROST", "tirazh": 12, "rarity": "ЭПИЧЕСКАЯ", "weapon": "—", "callsign": "АРХИВ", "quote": "Лор будет добавлен после утверждения.", "image": "/cards/everfrost.webp"},
{"slug": "signal27", "name": "СИГНАЛ 27", "tirazh": 15, "rarity": "ЛЕГЕНДАРНАЯ", "weapon": "—", "callsign": "АРХИВ", "quote": "Лор будет добавлен после утверждения.", "image": "/cards/signal27.webp"},
...confirmedCards,
];

const timeline = [
  {
    date: "24.12.2022",
    year: "2022",
    title: "ПЕРВАЯ ЗАПИСЬ ХРОНИКИ",
    text: "S27 начинает центральный архив и публично формулирует своё место в медиасообществе.",
  },
  {
    date: "03.05.2024",
    year: "2024",
    title: "ВОЗВРАЩЕНИЕ // REVIVAL",
    text: "Проект возвращается после паузы. Формируется новая команда редакторов и разработчиков.",
  },
  {
    date: "18.10.2024",
    year: "2024",
    title: "ГОЛОСОВАНИЕ ЗА ПРОДОЛЖЕНИЕ",
    text: "161 из 204 голосов поддерживают дальнейшее развитие NE S27.",
  },
  {
    date: "25.06.2025",
    year: "2025",
    title: "WASTELANDS",
    text: "Начинается постапокалиптическая эпоха и формируется основа будущего сезона Зоны.",
  },
  {
    date: "19.12.2025",
    year: "2025",
    title: "EVERFROST",
    text: "Структура каналов, роли и визуальная система получают одно из крупнейших обновлений.",
  },
  {
    date: "07.08.2026",
    year: "2026",
    title: "SOLSTICE // ПОДГОТОВКА",
    text: "Команда переходит в облегчённый режим и начинает подготовку нового сезона.",
  },
  {
    date: "26.08.2026",
    year: "2026",
    title: "ВОЗВРАЩЕНИЕ ТЕМАТИЧЕСКИХ КАНАЛОВ",
    text: "Информационные направления возвращаются к работе и становятся точкой входа в новый сезон.",
  },
];

const historyFiles = [
  {
    date: "24.12.2022",
    era: "НАЧАЛО АРХИВА",
    title: "ПЕРВАЯ ПОДТВЕРЖДЁННАЯ ЗАПИСЬ",
    paragraphs: [
      "Эта дата используется как первая опорная точка публичной хроники NE S27. Проект начинает собирать собственную историю не как набор разрозненных сообщений, а как последовательность периодов, решений и изменений.",
      "Для будущего архива это момент появления общей памяти сервера: дальнейшие сезоны можно сравнивать с исходной структурой и видеть, как менялись темы, оформление и способы участия сообщества.",
    ],
  },
  {
    date: "03.05.2024",
    era: "REVIVAL",
    title: "ВОЗВРАЩЕНИЕ ПОСЛЕ ПАУЗЫ",
    paragraphs: [
      "После периода тишины NE S27 возвращается к активной работе. Возвращение отмечено как отдельная эпоха — не продолжение по инерции, а перезапуск с новой командной организацией.",
      "REVIVAL важен тем, что проект сохранил узнаваемость, но получил возможность заново выстроить редактуру, разработку и будущую сезонную систему.",
    ],
  },
  {
    date: "18.10.2024",
    era: "РЕШЕНИЕ СООБЩЕСТВА",
    title: "161 ИЗ 204 ГОЛОСОВ ЗА ПРОДОЛЖЕНИЕ",
    paragraphs: [
      "Вопрос о дальнейшем развитии был вынесен на голосование. Продолжение поддержал 161 участник из 204 проголосовавших.",
      "Эта запись ценна не только числом голосов: развитие NE S27 стало подтверждённым решением сообщества. Поэтому будущие сезоны рассматриваются как общая история, а не только как работа администрации.",
    ],
  },
  {
    date: "25.06.2025",
    era: "WASTELANDS",
    title: "ПОСТАПОКАЛИПТИЧЕСКАЯ ЭПОХА",
    paragraphs: [
      "WASTELANDS закрепляет постапокалиптическое направление проекта. Визуальный язык становится жёстче, а события начинают восприниматься как части одной изменяющейся вселенной.",
      "Именно этот период стал смысловым мостом к нынешней Зоне: архив, выживание, закрытые территории и личные истории участников получили общую атмосферу.",
    ],
  },
  {
    date: "19.12.2025",
    era: "EVERFROST",
    title: "КРУПНОЕ ОБНОВЛЕНИЕ СТРУКТУРЫ",
    paragraphs: [
      "EVERFROST принёс заметное обновление структуры каналов, ролей и визуальной системы. Это был не только сезонный декор, но и пересборка способа навигации по серверу.",
      "Период показывает важный принцип NE S27: каждый новый образ сервера должен менять не только фон, но и то, как участники находят информацию и взаимодействуют с сезонными материалами.",
    ],
  },
  {
    date: "03.08.2026",
    era: "WORLD CUP",
    title: "ЗАВЕРШЕНИЕ ТЕМАТИЧЕСКОГО ПЕРИОДА",
    paragraphs: [
      "WORLD CUP официально завершён. Запись фиксирует границу между законченной тематикой и подготовкой следующего большого изменения.",
      "Для хронологии важен сам переход: завершение периода освобождает информационное пространство для SOLSTICE и последующего запуска новой Зоны.",
    ],
  },
  {
    date: "07.08.2026",
    era: "SOLSTICE",
    title: "ПЕРИОД ПОДГОТОВКИ",
    paragraphs: [
      "SOLSTICE начинается как облегчённый переходный период. Темп активности снижается, а внимание переносится на подготовку нового сезона и обновление материалов.",
      "Это короткая, но важная глава: она объясняет паузу между крупными событиями и связывает завершённый WORLD CUP с возвращением тематических направлений.",
    ],
  },
  {
    date: "26.08.2026",
    era: "НОВАЯ ЗОНА",
    title: "КАНАЛЫ ВОЗВРАЩАЮТСЯ К РАБОТЕ",
    paragraphs: [
      "Тематические каналы возвращаются после летней паузы. Информационный раздел снова становится основной точкой, где участники получают подтверждённые новости и материалы сезона.",
      "С этой записи начинается подготовка текущей главы NE S27: трёхчастного сезона Зоны, коллекционных карточек, личных профилей, тайников и общего исторического сайта.",
    ],
  },
];

const defaultConfig: SiteConfig = {
  brand: "NE S27",
  portalTitle: "НОВАЯ ЗОНА",
  seasonTitle: "SHADOW OF CHERNOBYL",
  seasonSubtitle:
    "Коллекционные карточки NE S27. Открывай тайники, собирай коллекцию и обменивай повторки на призы.",
  nextPartAt: "2026-10-15T16:00:00.000Z",
  accent: "#d6a548",
  referralReward: 1,
  referralHoldDays: 0,
  dismantleValues: {
    НЕОБЫЧНАЯ: 30,
    РЕДКАЯ: 50,
    ЭПИЧЕСКАЯ: 100,
    ЛЕГЕНДАРНАЯ: 250,
    МИФИЧЕСКАЯ: 1000,
    УНИКАЛЬНАЯ: 0,
  },
  acts: [
 {number:'I',title:'СЕЗОН STALKER',status:'АКТИВНА',progress:0,text:'Текущий сезон. Сюжет будет объявлен позже.'},
 {number:'II',title:'СКОРО',status:'ЗАКРЫТА',progress:0,text:'Следующая часть пока не объявлена.'},
 {number:'III',title:'СКОРО',status:'ЗАКРЫТА',progress:0,text:'Подробности появятся в новостях.'},
 ],
  news: [
    {
      date: "26.08.2026",
      title: "ТЕМАТИЧЕСКИЕ КАНАЛЫ ВОЗВРАЩАЮТСЯ К РАБОТЕ",
      tag: "СЕРВЕР",
    },
    {
      date: "07.08.2026",
      title: "НАЧАЛСЯ ПЕРИОД SOLSTICE",
      tag: "ПЕРИОД",
    },
    {
      date: "03.08.2026",
      title: "ЗАВЕРШЁН WORLD CUP",
      tag: "СОБЫТИЕ",
    },
  ],
};

const defaultDemo:DemoState={tokens:0,fragments:0,packCount:0,owned:{},claimed:[],pendingReferrals:0,verifiedReferrals:0};

const rarityOrder: Rarity[] = [
  "НЕОБЫЧНАЯ",
  "РЕДКАЯ",
  "ЭПИЧЕСКАЯ",
  "ЛЕГЕНДАРНАЯ",
  "МИФИЧЕСКАЯ",
  "УНИКАЛЬНАЯ",
];

const rarityClass: Record<Rarity, string> = {
  НЕОБЫЧНАЯ: "rarity-uncommon",
  РЕДКАЯ: "rarity-rare",
  ЭПИЧЕСКАЯ: "rarity-epic",
  ЛЕГЕНДАРНАЯ: "rarity-legendary",
  МИФИЧЕСКАЯ: "rarity-mythic",
  УНИКАЛЬНАЯ: "rarity-unique",
};

const missions = [
  {
    id: "signal",
    title: "ИЗУЧИТЬ СЕЗОН",
    text: "Открыть сезонное досье и изучить активную часть.",
    icon: Signal,
  },
  {
    id: "archive",
    title: "СОБРАТЬ ХРОНИКУ",
    text: "Просмотреть подтверждённые точки истории NE S27.",
    icon: Archive,
  },
  {
    id: "cards",
    title: "ПРОВЕРИТЬ КОЛЛЕКЦИЮ",
    text: "Открыть досье карточек первой серии.",
    icon: IdCard,
  },
];

const primaryNav = [
  { id: "home" as View, label: "ГЛАВНАЯ", icon: Home },
  { id: "season" as View, label: "СЕЗОН", icon: Radio },
  { id: "archive" as View, label: "АРХИВ", icon: Archive },
  { id: "cards" as View, label: "КАРТОЧКИ", icon: IdCard },
  { id: "packs" as View, label: "ТАЙНИКИ", icon: PackageOpen },
  { id: "shop" as View, label: "МАГАЗИН", icon: ShoppingBag },
  { id: "invite" as View, label: "ПРИГЛАСИТЬ", icon: UserPlus },
];

const mobileNav = [
  primaryNav[0],
  primaryNav[3],
  primaryNav[4],
  primaryNav[5],
  { id: "profile" as View, label: "ДОСЬЕ", icon: UserRound },
];

const allViews = [
  {id:'leaders' as View,label:'ЛИДЕРЫ',icon:Users},
  {id:"upgrader" as View,label:"АПГРЕЙДЕР",icon:Zap},
  {id:"rewards" as View,label:"НАГРАДЫ",icon:Gift},
  {id:"lore" as View,label:"ЛОР",icon:BookOpen},
  {id:"news" as View,label:"НОВОСТИ DISCORD",icon:Newspaper},
  {id:"help" as View,label:"ПОМОЩЬ",icon:ShieldCheck},
  ...primaryNav,
  { id: "missions" as View, label: "ЗАДАНИЯ", icon: Target },
  { id: "profile" as View, label: "ДОСЬЕ", icon: UserRound },
  { id: "admin" as View, label: "УПРАВЛЕНИЕ", icon: Settings2 },
  { id: "manager" as View, label: "МЕНЕДЖЕР", icon: ShieldCheck },
];

function SectionHeading({
  index,
  eyebrow,
  title,
  text,
}: {
  index: string;
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <header className="section-heading">
      <div className="section-index">{tr(index)}</div>
      <div>
        <p>{tr(eyebrow)}</p>
        <h1>{tr(title)}</h1>
        {tr(text ? <span>{tr(text)}</span> : null)}
      </div>
    </header>
  );
}

function CardArtwork({
  card,
  owned,
  onOpen,
}: {
  card: CardData;
  owned: number;
  onOpen: () => void;
}) {
  const locked = Boolean(card.secret && card.image === "/classified.svg");
  return (
    <article className="card-star-wrap"><FavoriteStar id={card.slug} kind="card" enabled={owned>0}/><button
      className={`artifact-card ${rarityClass[card.rarity]}`}
      onClick={onOpen}
      type="button"
      aria-label={tr(locked ? "Секретная карточка заблокирована" : `Открыть карточку ${card.name}`)}
    >
      <div className="artifact-number">
        {tr(card.tirazh === null ? "██" : String(card.tirazh).padStart(2, "0"))}
      </div>
      <div className="artifact-image-wrap">
        <img
          src={card.image}
          alt={tr(locked ? "Засекреченная карточка" : `Карточка ${card.name}`)}
          className={locked ? "artifact-image is-locked" : "artifact-image"}
        />
        {tr(locked ? (
          <div className="classified-cover">
            <Fingerprint />
            <strong>{tr("ДАННЫЕ ЗАСЕКРЕЧЕНЫ")}</strong>
            <span>{tr("СЕКРЕТНЫЙ АРХИВ")}</span>
          </div>
        ) : null)}
      </div>
      <div className="artifact-meta">
        <span>{tr(locked ? "UNKNOWN" : card.name)}</span>
        <small>{tr(card.rarity)}</small>
      </div>
      <div className="artifact-footer">
        <span>{tr(locked ? "СИГНАЛ ПОТЕРЯН" : card.callsign)}</span>
        {tr(owned > 0 ? <b>×{tr(owned)}</b> : <b className="not-owned">{tr("НЕТ")}</b>)}
      </div>
    </button></article>
  );
}

function SeasonCountdown({target}:{target?:string}){
  const {locale}=useLanguage();
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  const targetTime=target?Date.parse(target):NaN;
  if(!Number.isFinite(targetTime))return null;
  const remaining=Math.max(0,targetTime-now);
  const values=[Math.floor(remaining/86400000),Math.floor(remaining/3600000)%24,Math.floor(remaining/60000)%60,Math.floor(remaining/1000)%60];
  const labels=locale==='en'?['DAYS','HOURS','MINUTES','SECONDS']:['ДНЕЙ','ЧАСОВ','МИНУТ','СЕКУНД'];
  return <section className="season-countdown panel" aria-live="polite"><div><Clock3/><span><small>{locale==='en'?'NEXT PART':'СЛЕДУЮЩАЯ ЧАСТЬ'}</small><b>{remaining>0?(locale==='en'?'SIGNAL OPENS IN':'СИГНАЛ ОТКРОЕТСЯ ЧЕРЕЗ'):(locale==='en'?'SIGNAL AVAILABLE':'СИГНАЛ ДОСТУПЕН')}</b></span></div><div className="countdown-cells">{values.map((value,index)=><span key={labels[index]}><b>{String(value).padStart(2,'0')}</b><small>{labels[index]}</small></span>)}</div><time dateTime={target}>{new Intl.DateTimeFormat(locale==='en'?'en-GB':'ru-RU',{dateStyle:'long',timeStyle:'short'}).format(new Date(targetTime))}</time></section>;
}

export default function TerminalApp() {
  const {locale}=useLanguage();
  const [codeOpen,setCodeOpen]=useState(false);const [bonusPrizes,setBonusPrizes]=useState<any[]>([]);
  const [adminTab,setAdminTab]=useState<'overview'|'appearance'|'seasons'|'news'|'rewards'|'history'|'leaders'>('overview');
  const [community,setCommunity]=useState<any>(null);const [communityError,setCommunityError]=useState('');
  const [equipment,setEquipment]=useState<Record<string,string>>({});

  const [soundOpen,setSoundOpen]=useState(false);
  const [sound,setSound]=useState<AudioPrefs>(defaultAudio);
  const [batchCount,setBatchCount]=useState(1);
  const openingRef=useRef(false);
  useEffect(()=>{try{const raw=JSON.parse(localStorage.getItem('s27-audio-v2')||'null');if(raw){const clean={...defaultAudio};for(const k of ['volume','clicks','effects','background'] as const)if(typeof raw[k]==='number')clean[k]=Math.max(0,Math.min(100,raw[k]));clean.muted=raw.muted===true;clean.pack=freeSounds.some(x=>x.id===raw.pack)?raw.pack:'soft';clean.useEquipped=raw.useEquipped!==false;setSound(clean);configureAudio(clean);}}catch{}const click=(e:MouseEvent)=>{const target=e.target as HTMLElement;const button=target.closest('button,a,[role="button"]');if(button&&!button.hasAttribute('disabled')&&button.getAttribute('aria-disabled')!=='true')playClick();};document.addEventListener('click',click,true);const stopArrival=initializeArrivalAudio();return()=>{document.removeEventListener('click',click,true);stopArrival();};},[]);
  useEffect(()=>configureAudio({...sound,pack:sound.useEquipped&&equipment.sound?equipment.sound:sound.pack}),[sound,equipment.sound]);
  useEffect(()=>{const activate=(e:Event)=>{if((e as CustomEvent).detail?.sound)setSound(p=>{const next={...p,useEquipped:true};try{localStorage.setItem('s27-audio-v2',JSON.stringify(next));}catch{}return next;});};window.addEventListener('s27-profile-changed',activate);return()=>window.removeEventListener('s27-profile-changed',activate);},[]);
  function changeSound(next:AudioPrefs){setSound(next);try{localStorage.setItem('s27-audio-v2',JSON.stringify(next));}catch{}}

  const [unsealed,setUnsealed]=useState<CardData[]>([]);
  const cards=useMemo(()=>publicCards.map(c=>{const card=unsealed.find(x=>x.slug===c.slug)??c;return {...card,name:cardTitle(card,locale),image:localizedCardImage(card,locale),rarity:uniqueCards.includes(card.slug)?'УНИКАЛЬНАЯ' as Rarity:card.rarity};}),[unsealed,locale]);
  const [adminOrders,setAdminOrders]=useState<Array<{id:string;user_id:string;name:string;price:number;status:string;claim_status?:string}>>([]);
  const [orderBusy,setOrderBusy]=useState(false);
  const [orders,setOrders]=useState<Array<{id:string;name:string;status:string;price:number;claim_status?:string}>>([]);

  const [view, setView] = useState<View>("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [selectedAct, setSelectedAct] = useState(0);
  const [collectionMode,setCollectionMode]=useState<"owned"|"catalog">("owned");
  const [rarityFilter, setRarityFilter] = useState<"ВСЕ" | Rarity>("ВСЕ");
  const [cardSearch,setCardSearch]=useState('');
  const [cardSort,setCardSort]=useState('number');
  const [cardOwnership,setCardOwnership]=useState('all');
  const [demo, setDemo] = useState<DemoState>(defaultDemo);
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);
  const [hydrated, setHydrated] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [onboardingOpen,setOnboardingOpen]=useState(false);
  const [packOpen, setPackOpen] = useState(false);
  const [packResults, setPackResults] = useState<CardData[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [notice, setNotice] = useState("");
  const [account, setAccount] = useState<AccountProfile | null>(null);
  useEffect(()=>{if(account)fetch('/api/card-info',{headers:{'Accept-Language':locale}}).then(r=>r.json()).then(d=>setUnsealed(d.cards||[])).catch(()=>{});},[locale,account?.discord_id]);
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null);
  const [linkCode, setLinkCode] = useState("");
  const [linkError, setLinkError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [adminSnapshot, setAdminSnapshot] = useState<AdminSnapshot | null>(null);
  const [serverSaveBusy, setServerSaveBusy] = useState(false);
  const [siteStats,setSiteStats]=useState({visitors:0,accounts:0});

  function applyAccount(profile: AccountProfile) {
    window.dispatchEvent(new Event("s27-account-changed"));
    setAccount(profile);
    setDemo((previous) => ({
      ...previous,
      tokens: profile.tokens,
      fragments: profile.fragments,
      packCount: profile.pack_count,
      pendingReferrals: profile.referrals.pending,
      verifiedReferrals: profile.referrals.verified,
      owned: Object.fromEntries(
        profile.cards.map((card) => [card.card_slug, card.count]),
      ),
    }));
  }

  useEffect(()=>{setHydrated(true);try{const hasLink=new URLSearchParams(window.location.search).has('link');if(!hasLink&&!localStorage.getItem('s27-onboarding-v1'))setOnboardingOpen(true);}catch{}},[]);
  useEffect(()=>{fetch('/api/site-stats',{method:'POST',credentials:'same-origin'}).then(r=>r.json()).then(d=>setSiteStats({visitors:Number(d.visitors)||0,accounts:Number(d.accounts)||0})).catch(()=>{})},[]);
  function finishOnboarding(openLogin=false){try{localStorage.setItem('s27-onboarding-v1','seen');}catch{}setOnboardingOpen(false);if(openLogin)setLoginOpen(true);}
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const queryCode = new URLSearchParams(window.location.search).get("link");
      if (queryCode) {
        setLinkCode(queryCode.toUpperCase().slice(0, 8));
        setLoginOpen(true);
      }
    });
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        setServerConfigured(Boolean(result.configured));
        if (result.authenticated && result.profile) {
          setBonusPrizes(result.bonuses||[]);applyAccount(result.profile as AccountProfile);
        }
      })
      .catch(() => {
        if (active) setServerConfigured(false);
      });
    fetch("/api/config", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((result) => {
        if (!active || !result.config) return;
        const remote = result.config as Partial<SiteConfig>;
        setConfig((previous) => ({
          ...previous,
          ...remote,
          seasonSubtitle:remote.seasonSubtitle??defaultConfig.seasonSubtitle,
          acts: remote.acts ?? defaultConfig.acts,
          news: remote.news ?? previous.news,
          dismantleValues: {
            ...previous.dismantleValues,

          },
        }));
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (view !== "admin" || !account?.is_admin) return;
    fetch("/api/admin", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => result && setAdminSnapshot(result as AdminSnapshot))
      .catch(() => setAdminSnapshot(null));
  }, [view, account?.is_admin]);

  useEffect(()=>{if(!account)return;let active=true;const refresh=()=>{fetch('/api/auth/session').then(r=>r.json()).then(d=>{if(active&&d.authenticated&&d.profile)applyAccount(d.profile);}).catch(()=>{});};window.addEventListener('focus',refresh);return()=>{active=false;window.removeEventListener('focus',refresh);};},[account?.discord_id]);

  const visibleCards = useMemo(()=>{
    const query=cardSearch.trim().toLocaleLowerCase().replace(/^#|^№/,'').trim();
    return cards.filter(card=>{
      const count=demo.owned[card.slug]??0;
      if(collectionMode==='owned'&&count===0)return false;
      if(rarityFilter!=='ВСЕ'&&card.rarity!==rarityFilter)return false;
      if(cardOwnership==='duplicates'&&count<2)return false;
      if(cardOwnership==='missing'&&count>0)return false;
      const hidden=card.secret&&card.image==='/classified.svg';
      const text=hidden?card.name:[card.name,tr(card.name),card.callsign,tr(card.callsign)].join(' ');
      return !query||text.toLocaleLowerCase().includes(query)||(!hidden&&card.tirazh!==null&&/^\d+$/.test(query)&&Number(query)===card.tirazh);
    }).sort((a,b)=>cardSort==='rarity'?rarityOrder.indexOf(b.rarity)-rarityOrder.indexOf(a.rarity)||(a.tirazh??999)-(b.tirazh??999):cardSort==='copies'?(demo.owned[b.slug]??0)-(demo.owned[a.slug]??0):cardSort==='name'?tr(a.name).localeCompare(tr(b.name),locale):(a.tirazh??999)-(b.tirazh??999));
  },[cards,cardSearch,cardSort,cardOwnership,collectionMode,rarityFilter,demo.owned,locale]);

  const duplicateCards = cards.filter((card) => (demo.owned[card.slug] ?? 0) > 1);
  const uniqueOwned = cards.filter((card) => (demo.owned[card.slug] ?? 0) > 0).length;
  const totalOwned = Object.values(demo.owned).reduce((sum, amount) => sum + amount, 0);
  const currentAct = config.acts.find((act) => act.status === "АКТИВНА") ?? config.acts[0];

  useEffect(()=>{let active=true;async function refresh(){if(!account){setEquipment({});return;}try{const r=await fetch('/api/member-profile');if(r.ok){const d=await r.json();if(active)setEquipment(JSON.parse(d.profile.equipped||'{}'));}}catch{}}void refresh();window.addEventListener('s27-profile-changed',refresh);return()=>{active=false;window.removeEventListener('s27-profile-changed',refresh);};},[account?.discord_id]);
  useEffect(()=>{let active=true;fetch('/api/config').then(r=>r.json()).then(d=>{if(active)setConfig(d.config?{...defaultConfig,...d.config}:defaultConfig);}).catch(()=>{});return()=>{active=false};},[account?.discord_id]);
  useEffect(()=>{let active=true;async function refresh(){try{const r=await fetch('/api/community');const d=await r.json();if(!r.ok)throw Error();if(active){setCommunity(d.config);setCommunityError('');}}catch{if(active)setCommunityError('Условия магазина временно недоступны.');}}void refresh();window.addEventListener('s27-community-changed',refresh);return()=>{active=false;window.removeEventListener('s27-community-changed',refresh);};},[account?.discord_id]);
  async function cancelPrize(id:string){try{const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:'cancelled'})});const d=await r.json();if(!r.ok)throw Error(d.error);const session=await fetch('/api/auth/session').then(r=>r.json());if(session.profile)applyAccount(session.profile);flash('Заявка отменена. Жетоны возвращены.');}catch(e){flash(e instanceof Error?e.message:'Ошибка');}}
  async function claimPrize(id:string){try{const r=await fetch('/api/prize-claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:id})});const d=await r.json();if(!r.ok)throw Error(d.error);flash(d.message);setOrders(prev=>prev.map(o=>o.id===id?{...o,claim_status:'waiting_bot'}:o));}catch(e){flash(e instanceof Error?e.message:'Ошибка');}}
  function navigate(next: View) {
    if(next==='admin'&&!account?.is_admin){setLoginOpen(true);return;}
    if(next==='manager'&&!account?.is_manager){setLoginOpen(true);return;}

    if(next==='cards')setCollectionMode("owned");
    setView(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  useEffect(()=>{let active=true;if(!account){setUnsealed([]);setOrders([]);return;}fetch('/api/card-info',{headers:{'Accept-Language':locale}}).then(r=>r.json()).then(r=>{if(active)setUnsealed(r.cards||[]);}).catch(()=>{});fetch('/api/orders').then(r=>r.json()).then(r=>{if(active)setOrders(r.orders||[]);}).catch(()=>{});return()=>{active=false};},[account]);
  function drawCard() {const picked=draw();return cards.find(c=>c.slug===picked[0])!;}
  useEffect(()=>{if(account?.is_admin)fetch('/api/orders?admin=1').then(r=>r.json()).then(r=>setAdminOrders(r.orders||[])).catch(()=>{});},[account,view]);
  async function resolveOrder(id:string,status:string){try{const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});if(!r.ok)throw Error((await r.json()).error);setAdminOrders(prev=>prev.map(o=>o.id===id?{...o,status}:o));flash('ЗАЯВКА ОБНОВЛЕНА');}catch(e){flash(e instanceof Error?e.message:'Ошибка');}}
  async function purchase(product:typeof products[number]) {
    if(orderBusy)return;
    if(!account){setLoginOpen(true);return;}
    if(!window.confirm(tr(`Оформить ${product.name} за ${product.price} жетонов? ${account.is_test?"Это тестовый заказ без реального приза.":"Выдача администрацией."}`)))return;
    setOrderBusy(true);
    try{const r=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'purchase',productId:product.id,requestId:crypto.randomUUID()})});const data=await r.json();if(!r.ok)throw Error(data.error);applyAccount(data.profile);flash('ЗАКАЗ СОЗДАН. Нажмите «Получить» в списке заказов.');}catch(e){flash(e instanceof Error?e.message:'Не удалось оформить заявку');}finally{setOrderBusy(false);}
  }

  async function openPack() {
    if(!account){setLoginOpen(true);return;}
    if (demo.tokens < batchCount || openingRef.current) return;
    openingRef.current=true;unlockAudio();
    setIsOpening(true);
    setPackResults([]);

    if (account) {
      try {
        const response = await fetch("/api/game", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "open_pack", count:batchCount, requestId: crypto.randomUUID() }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Тайник не открылся.");
        const secretResponse=await fetch('/api/card-info',{headers:{'Accept-Language':locale}}).then(r=>r.json()).catch(()=>({cards:[]}));
        setUnsealed(secretResponse.cards||[]);
        const resultCards=cards.map(c=>{const revealed=(secretResponse.cards as CardData[]).find(x=>x.slug===c.slug)??c;return {...revealed,name:cardTitle(revealed,locale),image:localizedCardImage(revealed,locale),rarity:uniqueCards.includes(c.slug)?'УНИКАЛЬНАЯ' as Rarity:revealed.rarity};});
        const found = (result.results as string[])
          .map((slug) => resultCards.find((card) => card.slug === slug))
          .filter((card): card is CardData => Boolean(card));
        setBonusPrizes(result.bonuses||[]);applyAccount(result.profile as AccountProfile);
        window.setTimeout(() => {
          setPackResults(found);
          setIsOpening(false);openingRef.current=false;
          setPackOpen(true);
        }, 650);
        return;
      } catch (error) {
        setIsOpening(false);openingRef.current=false;
        flash(error instanceof Error ? error.message : "Тайник не открылся.");
        return;
      }
    }

    const results = Array.from({length:batchCount},()=>drawCard());

    window.setTimeout(() => {
      setDemo((previous) => {
        const nextOwned = { ...previous.owned };
        results.forEach((card) => {
          nextOwned[card.slug] = (nextOwned[card.slug] ?? 0) + 1;
        });
        return {
          ...previous,
          tokens: previous.tokens - batchCount,
          packCount: previous.packCount + batchCount,
          owned: nextOwned,
        };
      });
      setPackResults(results);
      setIsOpening(false);openingRef.current=false;
      setPackOpen(true);
    }, 850);
  }

  async function dismantle(card: CardData) {
    const count = demo.owned[card.slug] ?? 0;
    if (count <= 1) return;

    if (account) {
      try {
        const response = await fetch("/api/game", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "dismantle", cardSlug: card.slug, requestId: crypto.randomUUID() }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Повторка не разобрана.");
        setBonusPrizes(result.bonuses||[]);applyAccount(result.profile as AccountProfile);
        flash(`ПОВТОРКА РАЗОБРАНА: +${result.fragmentsAdded} ЖЕТОНОВ ЗОНЫ`);
      } catch (error) {
        flash(error instanceof Error ? error.message : "Повторка не разобрана.");
      }
      return;
    }

    const value = defaultConfig.dismantleValues[card.rarity];
    setDemo((previous) => ({
      ...previous,
      fragments: previous.fragments + value,
      owned: { ...previous.owned, [card.slug]: count - 1 },
    }));
    flash(`ПОВТОРКА РАЗОБРАНА: +${value} ЖЕТОНОВ ЗОНЫ`);
  }

  function addReferralDemo() {
    setDemo((previous) => ({
      ...previous,
      pendingReferrals: previous.pendingReferrals + 1,
    }));
    flash("ТЕСТ: ДРУГ ДОБАВЛЕН В ОЖИДАНИЕ");
  }

  function verifyReferralDemo() {
    if (demo.pendingReferrals < 1) return;
    setDemo((previous) => ({
      ...previous,
      pendingReferrals: previous.pendingReferrals - 1,
      verifiedReferrals: previous.verifiedReferrals + 1,
      tokens: previous.tokens + ((previous.verifiedReferrals+1)%2===0?1:0),
    }));
    flash("ПРИГЛАШЕНИЕ ПОДТВЕРЖДЕНО. За каждых двух — один купон.");
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      flash("ССЫЛКА СКОПИРОВАНА");
    } catch {
      flash("СКОПИРУЙТЕ ССЫЛКУ ИЗ ПОЛЯ");
    }
  }

  function completeMission(id: string) {
    if (demo.claimed.includes(id)) return;
    setDemo((previous) => ({ ...previous, claimed: [...previous.claimed, id] }));
    flash("ЗАДАНИЕ ОТМЕЧЕНО ВЫПОЛНЕННЫМ");
  }

  function updateAct(index: number, patch: Partial<ActConfig>) {
    setConfig((previous) => ({
      ...previous,
      acts: previous.acts.map((act, actIndex) =>
        actIndex === index ? { ...act, ...patch } : act,
      ),
    }));
  }

  function updateNews(index: number, patch: Partial<NewsItem>) {
    setConfig((previous) => ({
      ...previous,
      news: previous.news.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function resetDemo() {
    setDemo(defaultDemo);
    setPackResults([]);
    flash("ТЕСТ-ДАННЫЕ СБРОШЕНЫ");
  }

  function resetConfig() {
    setConfig(defaultConfig);
    flash("НАСТРОЙКИ САЙТА СБРОШЕНЫ");
  }

  async function connectAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setLinkError("");
    try {
      const response = await fetch("/api/auth/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code: linkCode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Аккаунт не подключён.");
      setBonusPrizes(result.bonuses||[]);applyAccount(result.profile as AccountProfile);
      setServerConfigured(true);
      setLoginOpen(false);
      setLinkCode("");
      window.history.replaceState({}, "", window.location.pathname);
      flash("АККАУНТ DISCORD БЕЗОПАСНО ПОДКЛЮЧЁН");
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "Аккаунт не подключён.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function logoutAccount() {
    try {const result=await fetch("/api/auth/session", {method:"DELETE",credentials:"same-origin"});if(!result.ok)throw Error();}catch{flash("Не удалось выйти. Повторите попытку.");return;}
    window.dispatchEvent(new Event("s27-account-changed"));
    setAccount(null);
    setUnsealed([]); setAdminOrders([]); setAdminSnapshot(null); setSelectedCard(null); setPackResults([]); setEquipment({});
    setDemo(defaultDemo);
    flash("ПРОФИЛЬ ОТКЛЮЧЁН НА ЭТОМ УСТРОЙСТВЕ");
  }

  async function saveServerSettings() {
    if (!account?.is_admin) {
      flash("ВОЙДИТЕ В ПРОФИЛЬ АДМИНИСТРАТОРА");
      return;
    }
    setServerSaveBusy(true);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          referralReward: config.referralReward,
          referralHoldDays: config.referralHoldDays,
          siteConfig: config,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Настройки не сохранены.");
      if (result.config) setConfig(result.config as SiteConfig);
      flash("САЙТ И СЕРВЕРНЫЕ НАСТРОЙКИ СОХРАНЕНЫ");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Настройки не сохранены.");
    } finally {
      setServerSaveBusy(false);
    }
  }

  const shellStyle = { "--hero-desktop": `url("${config.heroDesktop||'/hero/zone-desktop.webp'}")`, "--hero-mobile": `url("${config.heroMobile||'/hero/zone-mobile.webp'}")`, "--frame-width":`${config.frameWidth??14}px`, "--zone-amber": cosmetics.find(c=>c.id===equipment.theme)?.accent||community?.seasons.find((x:any)=>x.id===community.activeSeason)?.accent||config.accent } as CSSProperties;

  if(hydrated&&config.maintenanceMode&&!loginOpen&&!(account?.is_admin||account?.is_manager))return <MaintenanceGate/>;
  return (
    <div className={"portal-shell personal-"+(equipment.theme||"default")+" frame-"+(config.frameStyle||"scorched")+(view==="admin"?" is-admin":"")} style={shellStyle}>
      <PersonalEffects cursor={equipment.cursor} click={equipment.click}/><div className="scanlines" aria-hidden="true" />

      <header className="top-header">
        <button className="brand-lockup" onClick={() => navigate("home")} type="button">
          <span className="brand-emblem"><img src="/favicon.svg" alt=""/><i>27</i></span>
          <span>
            <strong>{tr(config.brand)}</strong>
            <small>{tr(config.portalTitle)}</small>
          </span>
        </button>

        <nav className="desktop-nav" aria-label={tr("Основная навигация")}>
          {tr(primaryNav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
              type="button"
            >
              {tr(item.label)}
            </button>
          )))}
        </nav>

        <div className="header-tools"><LanguageSwitch/>
          {tr(account?.is_admin&&<button className="admin-access-button" onClick={()=>navigate('admin')} title={tr("Админ-панель")}><Settings2/><span>{tr("УПРАВЛЕНИЕ")}</span></button>)}
          {tr(account?.is_manager&&<button className="manager-access" onClick={()=>navigate('manager')} title={tr("Кабинет менеджера")}><ShieldCheck/><span>{tr("МЕНЕДЖЕР")}</span></button>)}
          <button className="sound-settings-button" onClick={()=>setSoundOpen(true)} aria-label={tr("Настройки звука")} title={tr("Настройки звука")}>{tr(sound.muted||sound.volume===0?<VolumeX/>:<Volume2/>)}</button>
          <button className="wallet-chip" onClick={() => navigate("packs")} type="button">
            <Ticket />
            <span><small>{tr("КУПОНЫ")}</small><b>{tr(demo.tokens)}</b></span>
          </button>
          <button className="wallet-chip fragments" onClick={() => navigate("shop")} type="button">
            <Coins />
            <span><small>{tr("ЖЕТОНЫ ЗОНЫ")}</small><b>{tr(demo.fragments)}</b></span>
          </button>
          <Button
            className="discord-button"
            onClick={() => (account ? navigate("profile") : setLoginOpen(true))}
          >
            {tr(account ? <UserRound /> : <Fingerprint />)}
            <span>{tr(account ? account.display_name : "ПОДКЛЮЧИТЬ")}</span>
          </Button>
          <button
            className="menu-button"
            onClick={() => setMobileOpen((current) => !current)}
            type="button"
            aria-label={tr(mobileOpen ? "Закрыть меню" : "Открыть меню")}
          >
            {tr(mobileOpen ? <X /> : <Menu />)}
          </button>
        </div>
      </header>

      {tr(mobileOpen ? (
        <aside className="menu-drawer">
          <div className="drawer-status"><Signal /> {tr(" СИГНАЛ СТАБИЛЕН ")}<b>78.42 MHz</b></div>
          <nav aria-label={tr("Полное меню")}>
            {tr(allViews.filter(item=>item.id!=="missions"&&(item.id!=="admin"||account?.is_admin)&&(item.id!=="manager"||account?.is_manager)).map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={view === item.id ? "active" : ""}
                  onClick={() => navigate(item.id)}
                  type="button"
                >
                  <span>{tr(String(index + 1).padStart(2, "0"))}</span>
                  <Icon />
                  <b>{tr(item.label)}</b>
                </button>
              );
            }))}
          </nav>
        </aside>
      ) : null)}

      <main className="portal-main">{(view==='invite'||view==='home')&&<ReferralConnect incomingOnly={view==='home'} account={account} onAccount={applyAccount}/>}{tr(view==='home'&&<div className="home-code-access"><Button variant="outline" onClick={()=>setCodeOpen(v=>!v)} aria-expanded={codeOpen}><Gift/> {tr(" АКТИВИРОВАТЬ КОД")}</Button>{tr(codeOpen&&<CodeRedeem account={account} onAccount={applyAccount} onLogin={()=>setLoginOpen(true)}/>)}</div>)}{tr(view==='admin'&&account?.is_admin&&<BridgePanel/>)}
        {tr(notice ? <div className="notice-bar">{tr(notice)}</div> : null)}
        {account?.is_editor&&<p className="editor-status">{locale==='en'?'EDITOR':'РЕДАКТОР'} · @{account.username}</p>}
        {view==='leaders'&&<Leaderboard/>}
        {view==='upgrader'&&<UpgradeStation cards={cards} account={account} onAccount={applyAccount}/>}
        {view==='rewards'&&<CollectionRewards cards={cards} account={account} onAccount={applyAccount}/>}
        {view==='lore'&&<LoreLibrary cards={cards}/>}
        {view==='news'&&<DiscordNews/>}
        {view==='home'&&<nav className="expansion-shortcuts">{(['upgrader','rewards','lore','news','leaders'] as View[]).map((v,i)=><Button key={v} variant="outline" onClick={()=>navigate(v)}>{(locale==='en'?['UPGRADER','REWARDS','LORE','NEWS','LEADERS']:['АПГРЕЙДЕР','НАГРАДЫ','ЛОР','НОВОСТИ','ЛИДЕРЫ'])[i]}</Button>)}</nav>}
        {tr(view==='manager'&&account?.is_manager&&<ManagerHub/>)}
        {tr(['packs','profile','invite'].includes(view)&&<CodeRedeem account={account} onAccount={applyAccount} onLogin={()=>setLoginOpen(true)}/>)}

        {tr(view === "home" ? (
          <div className="view-enter home-view">
            <section className="zone-hero">
              <div className="hero-copy">
                <p className="hero-kicker"><Radio /> {tr(" ПЕРЕДАЧА S27 // СЕЗОН 01")}</p>
                <h1><span>{tr(config.brand)}</span>{tr(config.portalTitle)}</h1>
                <p>{tr(config.seasonSubtitle)}</p>
                <p className="hero-lore">{tr(config.heroLore||"Зона зовёт. Она меняется, но суть остаётся прежней: опасность, тайны и бесконечные истории. Исследуй, участвуй и стань частью общей хроники. Три сезона. Три истории. Одна Зона.")}</p>
                <div className="hero-actions">
                  <Button className="primary-action" onClick={() => navigate("packs")}>
                    {tr(" ОТКРЫТЬ ТАЙНИК ")}<ChevronRight />
                  </Button>
                  <button className="text-action" onClick={() => navigate("archive")} type="button">
                    {tr(" ИЗУЧИТЬ ХРОНИКУ ")}</button>
                </div>
                <div className="hero-odds">{tr("1 купон = 1 карта · Повторки возможны")}<br/>55% / 38% / 5% / 1,8% / 0,2%</div>
                <div className="hero-metrics">
                  <span><b>01</b><small>{tr("АКТИВНЫЙ СЕЗОН")}</small></span>
                  <span><b>03</b><small>{tr("ЧАСТИ ИСТОРИИ")}</small></span>
                  <span><b>{cards.length}</b><small>{tr("КАРТОЧЕК СЕРИИ")}</small></span>
                </div>
              </div>

              <div className="hero-visual" aria-label={tr("Аномальная Зона NE S27")}>
                <div className="hero-grid-lines" aria-hidden="true" />
                <div className="hero-cache"><img className="cache-art" src="/cosmetics/supply-cache.webp" alt={tr("Полевой тайник в заброшенном бункере")}/><div className="cache-controls"><small>{tr("КОЛЛЕКЦИЯ NE S27")}</small><h2>{tr("ТАЙНИК")}</h2><p>{tr("Один купон — одна карта.")}</p><div className="batch-selector" role="group" aria-label={tr("Количество тайников")}>{tr([1,2].map(n=><button type="button" key={n} aria-pressed={batchCount===n} disabled={isOpening} onClick={()=>setBatchCount(n)}>{tr(n)}×</button>))}</div><Button onClick={()=>account&&demo.tokens<batchCount?navigate('invite'):openPack()} disabled={isOpening}>{tr(isOpening?'ОТКРЫВАЕМ…':!account?'ВОЙТИ И ОТКРЫТЬ':demo.tokens<batchCount?'ПОЛУЧИТЬ КУПОНЫ':`ОТКРЫТЬ · ${batchCount} ${batchCount===1?'КУПОН':'КУПОНА'}`)}</Button><p className="cache-bonus-note">{tr("Бонус-сертификат: 0,001% при наличии доступных призов.")}</p><span>{tr("В наличии: ")}{tr(demo.tokens)} {tr(" купонов")}</span><button type="button" onClick={()=>navigate('packs')}>{tr("Шансы и правила →")}</button></div></div>
                <div className="hero-signal">
                  <span><i /> {tr(" ЗОНА АКТИВНА")}</span>
                  <b>{tr("ЧАСТЬ ")}{tr(currentAct.number)}</b>
                  <small>{tr(currentAct.title)}</small>
                </div>
              </div>
            </section>

            <MainPrizes onRewards={()=>navigate('rewards')}/>

            <SeasonCountdown target={config.nextPartAt}/>

            <div className="home-section-label"><span>{tr("СЕЗОНЫ NE S27")}</span><small>{tr("ОДНА ЗОНА // НОВАЯ ГЛАВА")}</small></div>
            <GuildPulse/>
            <section className="site-counter panel"><span><Users/><b>{siteStats.visitors.toLocaleString(locale)}</b><small>{locale==='en'?'UNIQUE VISITORS':'ЛЮДЕЙ ЗАШЛО'}</small></span><span><Fingerprint/><b>{siteStats.accounts.toLocaleString(locale)}</b><small>{locale==='en'?'ACCOUNTS CONNECTED':'АККАУНТОВ СОЗДАНО'}</small></span></section>
            <section className="season-strip">
              {tr(config.acts.map((act, index) => (
                <button
                  key={act.number}
                  className={act.status === "ЗАКРЫТА" ? "season-card locked" : "season-card"}
                  onClick={() => {
                    setSelectedAct(index);
                    navigate("season");
                  }}
                  type="button"
                >
                  <div className="season-card-top">
                    <span>{tr("ЧАСТЬ ")}{tr(act.number)}</span>
                    <b>{tr(act.status)}</b>
                  </div>
                  <strong>{tr(act.title)}</strong>
                  <p>{tr(act.text)}</p>
                  <div className="season-card-bottom">
                    {tr(act.status === "ЗАКРЫТА" ? <LockKeyhole /> : <Radio />)}
                    <span>{tr(act.status === "ЗАКРЫТА" ? "ДАННЫЕ ЗАСЕКРЕЧЕНЫ" : `${act.progress}% РАСШИФРОВАНО`)}</span>
                  </div>
                </button>
              )))}
            </section>

            <section className="home-collection panel"><div className="panel-heading"><span><IdCard/> {tr(" МОИ КАРТОЧКИ")}</span><button onClick={()=>navigate('cards')}>{tr("МОЯ КОЛЛЕКЦИЯ →")}</button></div><div className="home-card-shelf">{tr(cards.filter(c=>(demo.owned[c.slug]??0)>0).slice(0,6).map(card=><button key={card.slug} onClick={()=>setSelectedCard(card)}><img src={card.image} alt={tr(card.name)}/><b>{tr(card.name)}</b><small>×{tr(demo.owned[card.slug])}</small></button>))}{tr(uniqueOwned===0&&<p>{tr("Твой первый тайник — начало коллекции. Полученные карточки появятся здесь.")}</p>)}</div></section>
            <section className="feature-grid">
              <button className="feature-tile cards-tile" onClick={() => navigate("cards")} type="button">
                <div><IdCard /><span>{tr("КОЛЛЕКЦИЯ")}</span></div>
                <h2>{tr("МОИ КАРТОЧКИ")}</h2>
                <p>{tr(uniqueOwned)}  / {cards.length} {tr("КАРТОЧКИ")}</p>
                <b>{tr("ОТКРЫТЬ ")}<ChevronRight /></b>
                <div className="tile-card-fan">
                  {tr(cards.filter(c=>(demo.owned[c.slug]??0)>0).slice(0, 3).map((card) => <img src={card.image} alt="" key={card.slug} />))}
                </div>
              </button>
              <button className="feature-tile" onClick={() => navigate("packs")} type="button">
                <div><PackageOpen /><span>{tr("ПОЛЕВОЙ СКЛАД")}</span></div>
                <h2>{tr("ТАЙНИКИ")}</h2>
                <p>{tr("Один купон — одна карточка")}</p>
                <b>{tr("ОТКРЫТЬ ")}<ChevronRight /></b>
                <PackageOpen className="tile-watermark" />
              </button>
              <button className="feature-tile shop-tile" onClick={() => navigate("shop")} type="button">
                <div><ShoppingBag /><span>{tr("ОБМЕННЫЙ ПУНКТ")}</span></div>
                <h2>{tr("МАГАЗИН")}</h2>
                <p>{tr("Разбирай повторки на жетоны Зоны")}</p>
                <b>{tr("ПЕРЕЙТИ ")}<ChevronRight /></b>
                <Recycle className="tile-watermark" />
              </button>
              <button className="feature-tile invite-tile" onClick={() => navigate("invite")} type="button">
                <div><UserPlus /><span>{tr("РЕФЕРАЛЬНАЯ СВЯЗЬ")}</span></div>
                <h2>{tr("ПРИГЛАСИТЬ ДРУГА")}</h2>
                <p>{tr("2 проверенных друга = 1 купон")}</p>
                <b>{tr("ПОЛУЧИТЬ ССЫЛКУ ")}<ChevronRight /></b>
                <Users className="tile-watermark" />
              </button>
            </section>

            <section className="home-bottom-grid">
              <article className="news-panel panel">
                <div className="panel-heading">
                  <span><Newspaper /> {tr(" ПОСЛЕДНИЕ НОВОСТИ")}</span>
                  <button onClick={() => navigate("archive")} type="button">{tr("ВСЯ ХРОНИКА ")}<ChevronRight /></button>
                </div>
                <div className="news-list">
                  {tr(config.news.map((item) => (
                    <button key={`${item.date}-${item.title}`} onClick={() => navigate("archive")} type="button">
                      <time>{tr(item.date)}</time>
                      <b>{tr(item.title)}</b>
                      <span>{tr(item.tag)}</span>
                    </button>
                  )))}
                </div>
              </article>
              <article className="economy-panel panel">
                <div className="panel-heading"><span><Zap /> {tr(" ЭКОНОМИКА ЗОНЫ")}</span></div>
                <div className="economy-flow">
                  <span><UserPlus /><b>{tr("ПРИГЛАШЕНИЕ")}</b><small>{tr("проверенный друг")}</small></span>
                  <i>→</i>
                  <span><Ticket /><b>{tr("КУПОН")}</b><small>{tr("открывает тайник")}</small></span>
                  <i>→</i>
                  <span><Recycle /><b>{tr("ЖЕТОНЫ ЗОНЫ")}</b><small>{tr("за повторные карты")}</small></span>
                </div>
                <p>{tr("Токены и жетоны Зоны не смешиваются: у каждой валюты одна понятная задача.")}</p>
              </article>
            </section>
          </div>
        ) : null)}

        {view==='home'&&<><Leaderboard compact onOpen={()=>navigate('leaders')}/><DiscordNews compact/></>}
        {tr(view === "season" ? (
          <div className="view-enter"><CommunityHub mode="seasons" account={account} cards={cards} onAccount={applyAccount} onSeason={()=>navigate("packs")}/>
            <SeasonLore/>
            <SectionHeading
              index="01"
              eyebrow="СЕЗОННАЯ ОПЕРАЦИЯ"
              title={tr(`${config.seasonTitle} // ТРИ ЧАСТИ`)}
              text="История открывается последовательно. Статус и прогресс меняются администраторами."
            />
            <div className="season-layout">
              <div className="act-selector" role="tablist" aria-label={tr("Части сезона")}>
                {tr(config.acts.map((act, index) => (
                  <button
                    role="tab"
                    aria-selected={selectedAct === index}
                    className={selectedAct === index ? "selected" : ""}
                    key={act.number}
                    onClick={() => setSelectedAct(index)}
                    type="button"
                  >
                    <span>{tr(act.number)}</span>
                    <div><small>{tr("ЧАСТЬ ")}{tr(act.number)}</small><b>{tr(act.title)}</b></div>
                    {tr(act.status === "ЗАКРЫТА" ? <LockKeyhole /> : <Signal />)}
                  </button>
                )))}
              </div>

              <article className={config.acts[selectedAct].status === "ЗАКРЫТА" ? "act-file access-denied" : "act-file"}>
                <div className="act-file-top">
                  <span>FILE // S27-ZONE-0{tr(selectedAct + 1)}</span>
                  <b>{tr(config.acts[selectedAct].status)}</b>
                </div>
                {tr(config.acts[selectedAct].status !== "ЗАКРЫТА" ? (
                  <>
                    <div className="act-file-number">{tr(config.acts[selectedAct].number)}</div>
                    <p className="act-kicker">{tr("ЧАСТЬ ")}{tr(config.acts[selectedAct].number)}</p>
                    <h2>{tr(config.acts[selectedAct].title)}</h2>
                    <p className="act-prologue">{tr(config.acts[selectedAct].text)}</p>
                    <div className="mission-chain">
                      <div className="chain-item complete"><BadgeCheck /><span><b>{tr("01 // ПЕРЕХВАТ")}</b><small>{tr("Сигнал внесён в архив")}</small></span></div>
                      <div className="chain-line active" />
                      <div className="chain-item active"><Radio /><span><b>{tr("02 // РАСШИФРОВКА")}</b><small>{tr("Требуются фрагменты памяти")}</small></span></div>
                      <div className="chain-line" />
                      <div className="chain-item"><LockKeyhole /><span><b>{tr("03 // ИСТОЧНИК")}</b><small>{tr("Данные закрыты")}</small></span></div>
                    </div>
                    <div className="act-progress">
                      <span><b>{tr("ОБЩИЙ ПРОГРЕСС")}</b><small>{tr("управляется из панели")}</small></span>
                      <Progress value={config.acts[selectedAct].progress} />
                      <strong>{tr(config.acts[selectedAct].progress)}%</strong>
                    </div>
                  </>
                ) : (
                  <div className="denied-message">
                    <LockKeyhole />
                    <p>{tr("ПРОТОКОЛ ДОСТУПА")}</p>
                    <h2>{tr("ДАННЫЕ ЗАБЛОКИРОВАНЫ")}</h2>
                    <span>{tr(config.acts[selectedAct].text)}</span>
                    <code>ERROR 27 // PREVIOUS ACT INCOMPLETE</code>
                  </div>
                ))}
              </article>
            </div>
          </div>
        ) : null)}

        {tr(view === "archive" ? (
          <div className="view-enter">
            <SectionHeading
              index="02"
              eyebrow="ПОДТВЕРЖДЁННАЯ ХРОНОЛОГИЯ"
              title={tr(`АРХИВ ${config.brand}`)}
              text="Опорные точки из разрешённых информационных каналов сервера."
            />
            <div className="archive-toolbar panel">
              <span><Archive /> {tr(" ДОСТУП: РАЗДЕЛ «ИНФОРМАЦИЯ»")}</span>
              <b>2022—2026</b>
            </div>
            <div className="archive-news panel">
              <div className="panel-heading"><span><Newspaper /> {tr(" СВЕЖИЕ ЗАПИСИ")}</span></div>
              <div className="news-list">
                {tr(config.news.map((item) => (
                  <div key={`${item.date}-${item.title}`}>
                    <time>{tr(item.date)}</time><b>{tr(item.title)}</b><span>{tr(item.tag)}</span>
                  </div>
                )))}
              </div>
            </div>
            <div className="history-section-title">
              <span><BookOpen /> {tr(" РАСШИРЕННЫЕ ДОСЬЕ")}</span>
              <small>{tr("Только подтверждённые точки из раздела «Информация»")}</small>
            </div>
            <section className="history-files">
              {tr(historyFiles.map((entry, index) => (
                <article className="history-file panel" key={`${entry.date}-${entry.title}`}>
                  <div className="history-file-code">
                    <span>FILE // H-{tr(String(index + 1).padStart(2, "0"))}</span>
                    <b>{tr(entry.era)}</b>
                  </div>
                  <time>{tr(entry.date)}</time>
                  <h2>{tr(entry.title)}</h2>
                  {tr(entry.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{tr(paragraph)}</p>
                  )))}
                  <footer><ShieldCheck /> {tr(" АРХИВНАЯ ТОЧКА ПОДТВЕРЖДЕНА")}</footer>
                </article>
              )))}
            </section>
            <div className="history-section-title compact">
              <span><Archive /> {tr(" КРАТКАЯ ЛИНИЯ ВРЕМЕНИ")}</span>
            </div>
            <div className="timeline">
              {tr(timeline.map((entry, index) => (
                <article className="timeline-entry" key={entry.date}>
                  <div className="timeline-year">{tr(entry.year)}</div>
                  <div className="timeline-node"><span>{tr(String(index + 1).padStart(2, "0"))}</span></div>
                  <div className="timeline-content panel">
                    <time>{tr(entry.date)}</time>
                    <h2>{tr(entry.title)}</h2>
                    <p>{tr(entry.text)}</p>
                    <small>{tr("СТАТУС: ПОДТВЕРЖДЕНО")}</small>
                  </div>
                </article>
              )))}
            </div>
          </div>
        ) : null)}

        {tr(view === "cards" ? (
          <div className="view-enter">
            <SectionHeading
              index="03"
              eyebrow="КОЛЛЕКЦИЯ // ВСЕ СЕЗОНЫ"
              title={tr(collectionMode==="owned"?"МОИ КАРТОЧКИ":"КАТАЛОГ СЕРИИ")}
              text={collectionMode==="owned"?"Твоя добыча и повторки. Полная серия доступна в отдельном каталоге.":"Все доступные карты серии. Мифические досье открываются только владельцу."}
            />
            <div className="collection-switch"><Button variant="outline" onClick={()=>{setCollectionMode(collectionMode==='owned'?'catalog':'owned');setRarityFilter('ВСЕ');setCardOwnership('all');}}>{tr(collectionMode==='owned'?'ОТКРЫТЬ ПОЛНЫЙ КАТАЛОГ →':'← МОИ КАРТОЧКИ')}</Button></div>
            <div className="collection-search">
              <label>{tr("ПОИСК КАРТОЧЕК")}<input type="search" value={cardSearch} maxLength={100} onChange={e=>setCardSearch(e.target.value)} placeholder={tr("Название, позывной или № карты")}/></label>
              <label>{tr("СОРТИРОВКА")}<select value={cardSort} onChange={e=>setCardSort(e.target.value)}><option value="number">{tr("По номеру")}</option><option value="rarity">{tr("Сначала редкие")}</option><option value="copies">{tr("Больше повторок")}</option><option value="name">{tr("По названию")}</option></select></label>
              <label>{tr("НАЛИЧИЕ")}<select value={cardOwnership} onChange={e=>setCardOwnership(e.target.value)}><option value="all">{tr("Все")}</option><option value="duplicates">{tr("Только повторки")}</option>{collectionMode==='catalog'&&<option value="missing">{tr("Ещё не получены")}</option>}</select></label>
              <Button variant="outline" onClick={()=>{setCardSearch('');setCardSort('number');setCardOwnership('all');setRarityFilter('ВСЕ');}}>{tr("СБРОСИТЬ ФИЛЬТРЫ")}</Button>
            </div>
            <div className="collection-toolbar">
              <div className="filter-list" role="group" aria-label={tr("Фильтр редкости")}>
                {tr((["ВСЕ", ...rarityOrder] as const).map((rarity) => (
                  <button key={rarity} className={rarityFilter === rarity ? "active" : ""} onClick={() => setRarityFilter(rarity)} type="button">
                    {tr(rarity)}
                  </button>
                )))}
              </div>
              <div className="collection-count"><span>{tr("НАЙДЕНО")}</span><b>{tr(uniqueOwned)} / {tr(cards.length)}</b></div>
            </div>
            {!visibleCards.length&&<div className="empty-state panel"><IdCard/><b>{tr("КАРТОЧКИ НЕ НАЙДЕНЫ")}</b><p>{tr(!account&&collectionMode==='owned'?'Войди, чтобы увидеть свою коллекцию.':'Попробуй другое название или сбрось фильтры.')}</p><Button onClick={()=>{if(!account&&collectionMode==='owned')setLoginOpen(true);else{setCardSearch('');setCardOwnership('all');setRarityFilter('ВСЕ');}}}>{tr(!account&&collectionMode==='owned'?'ВОЙТИ':'СБРОСИТЬ ФИЛЬТРЫ')}</Button></div>}
            <FavoriteCollection kind="card" userId={account?.discord_id} className="cards-grid">
              {tr(visibleCards.filter(card=>collectionMode==='catalog'||(demo.owned[card.slug]??0)>0).map((card) => (
                <CardArtwork key={card.slug} card={card} owned={demo.owned[card.slug] ?? 0} onOpen={() => setSelectedCard(card)} />
              )))}
            </FavoriteCollection>
            <Button variant="outline" onClick={()=>navigate('rewards')}>{locale==='en'?'COLLECTION REWARDS':'НАГРАДЫ ЗА КОЛЛЕКЦИИ'}</Button>
          </div>
        ) : null)}

        {tr(view === "packs" ? (
          <div className="view-enter">
            <SectionHeading
              index="04"
              eyebrow="ПОЛЕВОЙ СКЛАД"
              title={tr("ТАЙНИКИ")}
              text="Один купон — ровно одна карта. Указаны шансы редкостей; карты внутри редкости равновероятны."
            />
            <div className="pack-layout">
              <article className={isOpening ? "pack-machine is-opening" : "pack-machine"}>
                <div className="pack-warning">S27 // AUTHORIZED ACCESS ONLY</div>
                <div className="pack-case">
                  <span className="case-corner top-left" />
                  <span className="case-corner top-right" />
                  <span className="case-corner bottom-left" />
                  <span className="case-corner bottom-right" />
                  <PackageOpen />
                  <small>{tr("ТАЙНИК")}</small>
                  <strong>27-A</strong>
                  <b>FIELD SUPPLY</b>
                </div>
                <div className="pack-copy">
                  <p>{tr("ПОЛЕВОЙ КОНТЕЙНЕР")}</p>
                  <span>{tr("Одна случайная карта. Повторки разрешены.")}</span>
                </div>
                <div className="batch-selector" role="group" aria-label={tr("Количество тайников")}>{tr([1,2].map(n=><button type="button" key={n} aria-pressed={batchCount===n} disabled={isOpening} onClick={()=>setBatchCount(n)}>{tr(n)}×</button>))}</div>
                <p className="batch-cost">{tr(batchCount)} {tr(batchCount===1?'тайник · 1 купон · 1 карта':`тайника · ${batchCount} купона · ${batchCount} карты`)}</p>
                <Button className="open-pack-button" onClick={openPack} disabled={(!!account&&demo.tokens < batchCount) || isOpening}>
                  {tr(isOpening ? "СКАНИРОВАНИЕ..." : `ОТКРЫТЬ ЗА ${batchCount} ${batchCount===1?"КУПОН":"КУПОНА"}`)}<Ticket />
                </Button>
                {tr(demo.tokens < batchCount ? <small className="insufficient">{tr("НЕТ КУПОНОВ — ПРИГЛАСИ ДРУЗЕЙ ИЛИ УЧАСТВУЙ В СОБЫТИИ")}</small> : null)}
              </article>
              <aside className="pack-info">
                <div className="panel token-balance-card">
                  <div className="panel-label">{tr("ДОСТУПНЫЕ КУПОНЫ")}</div>
                  <Ticket /><b>{tr(demo.tokens)}</b>
                  <button onClick={() => navigate("invite")} type="button">{tr("КАК ПОЛУЧИТЬ ")}<ChevronRight /></button>
                </div>
                <div className="panel odds-panel">
                  <div className="panel-label">{tr("ВЕРОЯТНОСТИ")}</div>
                  {tr([
                    ["НЕОБЫЧНАЯ", "55%"],
                    ["РЕДКАЯ", "38%"],
                    ["ЭПИЧЕСКАЯ", "5%"],
                    ["ЛЕГЕНДАРНАЯ", "1,8%"],
                    ["МИФИЧЕСКАЯ", "0,2%"],
                    ["УНИКАЛЬНАЯ", "0,01%"],
                  ].map(([name, odds]) => (
                    <div className={`odds-row ${rarityClass[name as Rarity]}`} key={name}>
                      <span>{tr(name)}</span><b>{tr(odds)}</b>
                    </div>
                  )))}
                </div>
                <div className="panel pity-panel"><div className="panel-label">{tr("НЕЗАВИСИМЫЕ ОТКРЫТИЯ")}</div><p>{tr("Шансы неизменны при каждом открытии. Результат выбирается сервером до анимации.")}</p><small>{tr("Повторки возможны. Мифическая карта остаётся закрытой до получения.")}</small></div>
              </aside>
            </div>
          </div>
        ) : null)}

        {tr(view === "shop" ? (
          <div className="view-enter">
            <SectionHeading
              index="05"
              eyebrow="ОБМЕННЫЙ ПУНКТ"
              title={tr("МАГАЗИН ЗОНЫ")}
              text="Лишние копии превращаются в жетоны Зоны. Первая копия каждой карточки защищена и не разбирается."
            />
            <MemberHub account={account} cards={cards} mode="shop" onAccount={applyAccount} onLogin={()=>setLoginOpen(true)}/>
            <div className="shop-wallet panel">
              <span><Coins /><small>{tr("ВАШ БАЛАНС")}</small><b>{tr(demo.fragments)} {tr(" ЖЕТОНОВ ЗОНЫ")}</b></span>
              <div><Recycle /><p><b>{tr("ПОВТОРКИ → ЖЕТОНЫ ЗОНЫ")}</b><small>{tr("Номинал зависит от редкости")}</small></p></div>
            </div>
            <Button variant="outline" onClick={()=>navigate('rewards')}>{locale==='en'?'COLLECTION REWARDS':'НАГРАДЫ ЗА КОЛЛЕКЦИИ'}</Button><div className="shop-grid">
              <CommunityHub mode="recycle" account={account} cards={cards} onAccount={applyAccount}/>
              <section className="store-catalog panel">
                <div className="panel-heading"><span><ShoppingBag /> {tr(" СНАБЖЕНИЕ ЗОНЫ")}</span></div>
                <p className="store-note">{tr("Выдача по заявке администрацией. Регион, срок Nitro и точное издание согласуются до выдачи. При невозможности выдачи — возврат жетонов.")}</p>
                {tr(account?.is_test&&<p className="hub-message">{tr("Тестовые покупки: жетоны списываются, заявки сохраняются. Реальные призы не выдаются.")}</p>)}<p role="status">{tr(communityError)}</p><p className="bonus-rules">{tr("Секретное снабжение: 0,001% на дополнительный приз из доступных товаров за тайник. Приз выбирается равновероятно среди доступных товаров. Если доступных товаров нет, бонус не разыгрывается. Шансы коллекционной карты не меняются. Денежный сертификат — заявка на ручную выдачу, а не автоматический перевод денег.")}</p><FavoriteCollection kind="product" userId={account?.discord_id} className="product-grid">{tr(products.map((product,index)=><article className="product-item" key={product.id} data-favorite-id={product.id}><FavoriteStar id={product.id} kind="product" enabled={!!account}/><span className="product-code">S27 / {tr(String(index+1).padStart(2,'0'))}</span><Gift/><h3>{tr(product.name)}</h3><p>{tr(community?.products.find((p:any)=>p.id===product.id)?.conditions||'Загружаем условия…')}</p><small>{tr(community?.products.find((p:any)=>p.id===product.id)?.available?'ДОСТУПЕН ДЛЯ ЗАЯВКИ':'СЕЙЧАС НЕДОСТУПЕН')}</small><strong>{tr(product.price.toLocaleString('ru-RU'))} <small>{tr("ЖЕТОНОВ")}</small></strong><Button disabled={orderBusy||demo.fragments<product.price||!community?.products.find((p:any)=>p.id===product.id)?.available} onClick={()=>purchase(product)}>{tr("ОФОРМИТЬ ЗАЯВКУ")}</Button></article>))}</FavoriteCollection>
                {tr(orders.length>0&&<div className="order-list"><h3>{tr("МОИ ЗАЯВКИ")}</h3>{tr(orders.map(o=><p key={o.id}>{tr(o.name)} · {tr(o.price)} · {tr(o.status==='pending'?(o.claim_status?'Ожидает менеджера':'Ожидает запроса получения'):o.status==='processing'?'В обработке':o.status==='fulfilled'?'Выдано':o.status==='cancelled'?'Отменено · жетоны возвращены':'Возврат')}{tr(o.status==='pending'&&<Button variant="outline" disabled={!!o.claim_status} onClick={()=>claimPrize(o.id)}>{tr(o.claim_status?'ЗАЯВКА ОТПРАВЛЕНА':'ПОЛУЧИТЬ')}</Button>)}{tr(o.status==='pending'&&!o.id.includes(':reward:')&&<Button variant="outline" onClick={()=>cancelPrize(o.id)}>{tr("ОТМЕНИТЬ И ВЕРНУТЬ ЖЕТОНЫ")}</Button>)}</p>))}</div>)}
              </section>
            </div>
          </div>
        ) : null)}

        {tr(view === "invite" ? (
          <div className="view-enter"><CommunityHub mode="events" account={account} cards={cards} onAccount={applyAccount}/>
            <SectionHeading
              index="06"
              eyebrow="РЕФЕРАЛЬНАЯ СВЯЗЬ"
              title={tr("ПРИГЛАСИТЬ ДРУГА")}
              text={`Личную отслеживаемую ссылку выдаёт команда /invite. За каждых двух проверенных новых участников начисляется один купон.`}
            />
            <section className="referral-hero panel">
              <div className="referral-copy">
                <span className="referral-badge"><UserPlus /> {tr(" ПРОТОКОЛ R-27")}</span>
                <h2>{tr("ПРИВЕДИ ДРУГА В ЗОНУ")}</h2>
                <p>{tr("Вызови /invite в Discord. Бот создаст личную ссылку и запомнит, кто по ней присоединился. Общая ссылка ниже подходит для входа, но не начисляет награду.")}</p>
                <div className="invite-field">
                  <input value={inviteUrl} readOnly aria-label={tr("Ссылка-приглашение Discord")} />
                  <button onClick={copyInvite} type="button" aria-label={tr("Копировать ссылку")}><Copy /></button>
                </div>
                <div className="referral-actions">
                  <a className="outline-link primary-link" href={inviteUrl} target="_blank" rel="noreferrer">{tr("ОТКРЫТЬ DISCORD И ВЫЗВАТЬ /invite ")}<ExternalLink /></a>
                  <Button variant="outline" className="reset-button" onClick={copyInvite}><Copy /> {tr(" ОБЩАЯ ССЫЛКА")}</Button>
                </div>
              </div>
              <div className="referral-reward">
                <div className="token-medal"><Ticket /><b>+1</b></div>
                <span>{tr("КУПОН ЗА 2 ДРУЗЕЙ")}</span>
                <small>{tr("после проверки")}</small>
              </div>
            </section>
            <div className="referral-grid">
              <section className="panel referral-stats">
                <div className="panel-heading"><span><Users /> {tr(" МОИ ПРИГЛАШЕНИЯ")}</span></div>
                <div><span><Clock3 /><small>{tr("ОЖИДАЮТ")}</small><b>{tr(demo.pendingReferrals)}</b></span><span><BadgeCheck /><small>{tr("ПОДТВЕРЖДЕНЫ")}</small><b>{tr(demo.verifiedReferrals)}</b></span><span><Ticket /><small>{tr("ПОЛУЧЕНО")}</small><b>{tr(Math.floor((account?.referrals.currentVerified??demo.verifiedReferrals) / 2))}</b></span></div>
                <p>{tr("До следующего купона: ")}{tr(2-((account?.referrals.currentVerified??demo.verifiedReferrals)%2))} {tr(" приглашения.")}</p><p>{tr(account ? "Два подтверждённых приглашения дают один купон. Тестовые аккаунты не участвуют." : "Войдите в профиль, чтобы увидеть статистику. Подключите Discord для приглашений.")}</p>
              </section>
              <section className="panel verification-rules">
                <div className="panel-heading"><span><ShieldAlert /> {tr(" ЗАЩИТА ОТ НАКРУТКИ")}</span></div>
                <ul>
                  <li><Check /> {tr(" учитывается только новый участник сервера;")}</li>
                  <li><Check /> {tr(" бот и повторный вход не дают награду;")}</li>
                  <li><Check /> {tr("Возраст аккаунта Discord — от 30 дней. Без ожидания.")}</li>
                  <li><Check /> {tr(" один Discord-аккаунт засчитывается один раз.")}</li>
                </ul>
              </section>
            </div>
            {tr(false ? (
              <section className="demo-referral panel">
                <div><ShieldAlert /><span><b>{tr("ТЕСТОВАЯ СИМУЛЯЦИЯ")}</b><small>{tr("Эти кнопки не обращаются к Discord и работают только в вашем браузере.")}</small></span></div>
                <div><Button variant="outline" onClick={addReferralDemo}>{tr("1. ДОБАВИТЬ В ОЖИДАНИЕ")}</Button><Button className="primary-action" onClick={verifyReferralDemo} disabled={demo.pendingReferrals < 1}>{tr("2. ПОДТВЕРДИТЬ")}</Button></div>
              </section>
            ) : null)}
          </div>
        ) : null)}

        {tr(false ? (
          <div className="view-enter">
            <SectionHeading
              index="07"
              eyebrow="ПОЛЕВЫЕ ЗАДАНИЯ"
              title={tr("КОНТРАКТЫ СЕЗОНА")}
              text="Задания не следят за сообщениями, бустами, голосовыми каналами или активностью в чате."
            />
            <div className="mission-grid">
              {tr(missions.map((mission, index) => {
                const Icon = mission.icon;
                const claimed = demo.claimed.includes(mission.id);
                return (
                  <article className="mission-card panel" key={mission.id}>
                    <div className="mission-code">TASK // 0{tr(index + 1)}</div>
                    <Icon className="mission-icon" />
                    <h2>{tr(mission.title)}</h2>
                    <p>{tr(mission.text)}</p>
                    <Button onClick={() => completeMission(mission.id)} disabled={claimed} className={claimed ? "claimed-button" : "primary-action"}>
                      {tr(claimed ? <><BadgeCheck /> {tr(" ВЫПОЛНЕНО")}</> : "ОТМЕТИТЬ ВЫПОЛНЕННЫМ")}
                    </Button>
                  </article>
                );
              }))}
            </div>
          </div>
        ) : null)}

        {tr(view === "profile" ? (<div className="view-enter">{tr(account?<><MemberHub account={account} cards={cards} mode="profile" onAccount={applyAccount}/><div className="profile-actions"><Button variant="outline" onClick={logoutAccount}><LogOut/> {tr(" ВЫЙТИ ИЗ ПРОФИЛЯ")}</Button></div></>:<section className="panel login-gate"><UserRound/><h2>{tr("ТВОЁ ЛИЧНОЕ ДЕЛО")}</h2><p>{tr("Войди, чтобы собирать карты и настраивать профиль.")}</p><Button onClick={()=>setLoginOpen(true)}>{tr("ВОЙТИ")}</Button></section>)}</div>) : null)}

        {tr(view === "admin" && account?.is_admin ? (
          <div className="view-enter">
            <SectionHeading
              index="09"
              eyebrow="ЦЕНТР УПРАВЛЕНИЯ"
              title={tr("УПРАВЛЕНИЕ САЙТОМ")}
              text="Выдача наград, заявки на призы и оформление сезона."
            />
            <div className={account?.is_admin ? "admin-warning panel is-ready" : "admin-warning panel"}>
              {tr(account?.is_admin ? <ShieldCheck /> : <ShieldAlert />)}
              <div>
                <b>{tr(account?.is_admin ? "СЕРВЕРНЫЙ ДОСТУП ПОДТВЕРЖДЁН" : "ТРЕБУЕТСЯ АДМИНСКИЙ ПРОФИЛЬ")}</b>
                <span>{tr(account?.is_admin
                  ? "Администратор тестового сервера. Выдачи доступны только тестовым аккаунтам."
                  : "Оформление доступно в тесте, но публикация серверных настроек заблокирована до безопасной привязки.")}</span>
              </div>
            </div>

            <nav className="admin-section-tabs" aria-label={tr("Разделы управления")}>
              {(['overview','appearance','seasons','news','rewards','history','leaders'] as const).map((id,index)=><button key={id} type="button" aria-current={adminTab===id?'page':undefined} onClick={()=>setAdminTab(id)}><span>0{index+1}</span>{tr(({overview:'СВОДКА',appearance:'ОФОРМЛЕНИЕ',seasons:'СЕЗОНЫ',news:'НОВОСТИ',rewards:'КАРТЫ И НАГРАДЫ',history:'ИСТОРИЯ ОПЕРАЦИЙ',leaders:'ЛИДЕРЫ'} as const)[id])}</button>)}
            </nav>

            {adminTab==='leaders'&&<Leaderboard admin/>}
            {adminTab==='history'&&<CommunityHub mode="history" account={account} cards={cards} onAccount={applyAccount}/>}
            {adminTab==='rewards'&&<><InventoryAdmin cards={cards} onAccount={applyAccount}/><CommunityHub mode="admin" account={account} cards={cards} onAccount={applyAccount}/></>}
            {adminTab==='overview'&&<>
            <section className="maintenance-control panel"><div><ShieldAlert/><span><b>{tr("РЕЖИМ ТЕХНИЧЕСКОЙ ПАУЗЫ")}</b><small>{tr(config.maintenanceMode?"Сайт закрыт для участников. Команда сохраняет доступ.":"Сайт работает для всех участников.")}</small></span></div><Button variant={config.maintenanceMode?'default':'outline'} onClick={()=>setConfig({...config,maintenanceMode:!config.maintenanceMode,maintenanceCycle:config.maintenanceMode?config.maintenanceCycle:Date.now()})}>{tr(config.maintenanceMode?'ВОЗОБНОВИТЬ САЙТ':'ПРИОСТАНОВИТЬ САЙТ')}</Button><p>{tr("Новая пауза открывает новый сезон арканоида. После переключения нажмите «Сохранить на сервере» внизу панели.")}</p></section>
            <section className="admin-server-grid">

              <article className="panel"><Server /><span><small>{tr("ОБЩАЯ БАЗА")}</small><b>{tr(serverConfigured ? "ПОДКЛЮЧЕНА" : "ОЖИДАЕТ НАСТРОЙКИ")}</b><em>{tr("профили · карты · купоны")}</em></span></article>
              <article className="panel"><KeyRound /><span><small>{tr("АВТОРИЗАЦИЯ")}</small><b>{tr("ПЕРСОНАЛЬНЫЙ DISCORD")}</b><em>{tr("права проверяются сервером")}</em></span></article>
              <article className="panel"><ShieldCheck /><span><small>{tr("ЖУРНАЛ")}</small><b>{tr("АДМИН-ДЕЙСТВИЯ")}</b><em>{tr("кто · что · когда")}</em></span></article>
            </section>

            {tr(account?.is_admin&&<section className="panel order-list"><h2>{tr("ЗАЯВКИ НА ПРИЗЫ")}</h2>{tr(adminOrders.length?adminOrders.map(o=><article key={o.id}><p>{tr(o.name)} · {tr(o.price)} · {tr(o.user_id)}</p><small>{tr(o.status==='pending'?'Ожидает':o.status==='processing'?'В обработке':o.status==='fulfilled'?'Выдано':'Жетоны возвращены')}{tr(o.status==='pending'?(o.claim_status?' · Участник запросил получение':' · Получение ещё не запрошено'):'')}</small>{tr(['pending','processing'].includes(o.status)&&<div>{tr(o.status==='pending'&&<Button onClick={()=>resolveOrder(o.id,'processing')}>{tr("ВЗЯТЬ В РАБОТУ")}</Button>)}<Button onClick={()=>resolveOrder(o.id,'fulfilled')}>{tr("ВЫДАНО")}</Button>{!o.id.includes(':reward:')&&<Button variant="outline" onClick={()=>resolveOrder(o.id,'refunded')}>{tr("ВЕРНУТЬ ЖЕТОНЫ")}</Button>}</div>)}</article>):<p>{tr("Новых заявок нет.")}</p>)}</section>)}
            {tr(adminSnapshot ? (
              <section className="admin-live-stats panel">
                <div className="panel-heading"><span><Server /> {tr(" СЕРВЕРНАЯ СВОДКА")}</span><b>LIVE</b></div>
                <div>
                  <span><small>{tr("ПРОФИЛИ")}</small><b>{tr(adminSnapshot.stats.users)}</b></span>
                  <span><small>{tr("КАРТОЧКИ")}</small><b>{tr(adminSnapshot.stats.cards)}</b></span>
                  <span><small>{tr("ОЖИДАЮТ ПРОВЕРКИ")}</small><b>{tr(adminSnapshot.stats.pendingReferrals)}</b></span>
                  <span><small>{tr("ПОДТВЕРЖДЕНЫ")}</small><b>{tr(adminSnapshot.stats.verifiedReferrals)}</b></span>
                </div>
              </section>
            ) : null)}
            </>}

            {adminTab==='appearance'&&
            <div className="admin-grid">
              <section className="admin-panel panel">
                <div className="admin-panel-title"><span>01</span><div><b>{tr("БРЕНД И СЕЗОН")}</b><small>{tr("Главные названия и оформление")}</small></div></div>
                <label>{tr("НАЗВАНИЕ БРЕНДА")}<input value={config.brand} onChange={(event) => setConfig({ ...config, brand: event.target.value })} /></label>
                <label>{tr("НАЗВАНИЕ ПОРТАЛА")}<input value={config.portalTitle} onChange={(event) => setConfig({ ...config, portalTitle: event.target.value })} /></label>
                <label>{tr("НАЗВАНИЕ СЕЗОНА")}<input value={config.seasonTitle} onChange={(event) => setConfig({ ...config, seasonTitle: event.target.value })} /></label>
                <label>{tr("ОПИСАНИЕ СЕЗОНА")}<textarea value={config.seasonSubtitle} onChange={(event) => setConfig({ ...config, seasonSubtitle: event.target.value })} /></label>
                <label>{tr("ТЕКСТ НА ГЛАВНОЙ")}<textarea value={config.heroLore||""} maxLength={1000} onChange={e=>setConfig({...config,heroLore:e.target.value})}/></label>
                <label>{tr("ФОН ДЛЯ КОМПЬЮТЕРА")}<input placeholder="/hero/zone-desktop.webp" value={config.heroDesktop||""} onChange={e=>setConfig({...config,heroDesktop:e.target.value})}/></label>
                <label>{tr("ФОН ДЛЯ ТЕЛЕФОНА")}<input placeholder="/hero/zone-mobile.webp" value={config.heroMobile||""} onChange={e=>setConfig({...config,heroMobile:e.target.value})}/></label>
                <p>{tr("Укажи путь к изображению сайта или прямую HTTPS-ссылку.")}</p>
                <label>{tr("РАМКИ САЙТА")}<select value={config.frameStyle||"scorched"} onChange={e=>setConfig({...config,frameStyle:e.target.value})}><option value="scorched">{tr("Обгоревшие")}</option><option value="steel">{tr("Стальные")}</option><option value="plain">{tr("Простые")}</option></select></label>
                <label>{tr("ТОЛЩИНА РАМОК")} · {config.frameWidth??14}px<input type="range" min="4" max="18" value={config.frameWidth??14} onChange={e=>setConfig({...config,frameWidth:Number(e.target.value)})}/></label>
                <label className="color-field">{tr("АКЦЕНТНЫЙ ЦВЕТ")}<span><input type="color" value={config.accent} onChange={(event) => setConfig({ ...config, accent: event.target.value })} /><code>{tr(config.accent.toUpperCase())}</code></span></label>
              </section>

              <section className="admin-panel panel">
                <div className="admin-panel-title"><span>02</span><div><b>{tr("ЭКОНОМИКА")}</b><small>{tr("Приглашения, купоны и повторки")}</small></div></div>
                <p>{tr("2 проверенных друга = 1 купон. Правило фиксировано.")}</p>
                <p>{tr("Возраст аккаунта Discord — от 30 дней. Без ожидания.")}</p>
                <div className="rarity-values">
                  <p>{tr("ЖЕТОНОВ ЗОНЫ ЗА ПОВТОРКУ")}</p>
                  {tr(rarityOrder.map((rarity) => (
                    <label key={rarity}><span className={rarityClass[rarity]}>{tr(rarity)}</span><input type="number" min="1" value={defaultConfig.dismantleValues[rarity]} readOnly /></label>
                  )))}
                </div>
              </section>
            </div>
            }

            {adminTab==='news'&&
            <section className="admin-panel panel news-editor">
              <div className="admin-panel-title"><span>03</span><div><b>{tr("ПОСЛЕДНИЕ НОВОСТИ")}</b><small>{tr("Дата, заголовок и метка на главной")}</small></div></div>
              <Button disabled={config.news.length>=20} onClick={()=>setConfig({...config,news:[...config.news,{date:new Date().toLocaleDateString("ru-RU"),title:"НОВАЯ ЗАПИСЬ",tag:"СЕРВЕР"}]})}>{tr("ДОБАВИТЬ НОВОСТЬ")}</Button><div className="news-editor-grid">
                {tr(config.news.map((item, index) => (
                  <article key={index}>
                    <Button variant="outline" onClick={()=>setConfig({...config,news:config.news.filter((_,i)=>i!==index)})}>{tr("УДАЛИТЬ")}</Button><b>{tr("ЗАПИСЬ 0")}{tr(index + 1)}</b>
                    <label>{tr("ДАТА")}<input value={item.date} onChange={(event) => updateNews(index, { date: event.target.value })} /></label>
                    <label>{tr("ЗАГОЛОВОК")}<input value={item.title} onChange={(event) => updateNews(index, { title: event.target.value })} /></label>
                    <label>{tr("МЕТКА")}<input value={item.tag} onChange={(event) => updateNews(index, { tag: event.target.value })} /></label>
                  </article>
                )))}
              </div>
            </section>
            }

            {adminTab==='seasons'&&
            <><CommunityHub mode="admin" account={account} cards={cards} onAccount={applyAccount}/><section className="admin-panel panel acts-editor">
              <div className="admin-panel-title"><span>04</span><div><b>{tr("ЧАСТИ СЕЗОНА")}</b><small>{tr("Название, статус, прогресс и сюжетный текст")}</small></div></div>
              <label>{tr("ДАТА СЛЕДУЮЩЕЙ ЧАСТИ")}<input type="datetime-local" value={config.nextPartAt?new Date(new Date(config.nextPartAt).getTime()-new Date(config.nextPartAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''} onChange={e=>setConfig({...config,nextPartAt:e.target.value?new Date(e.target.value).toISOString():undefined})}/></label>
              <Button disabled={config.acts.length>=6} onClick={()=>setConfig({...config,acts:[...config.acts,{number:String(config.acts.length+1),title:"НОВАЯ ЧАСТЬ",status:"ЗАКРЫТА",progress:0,text:"Подробности появятся позже."}]})}>{tr("ДОБАВИТЬ ЧАСТЬ СЕЗОНА")}</Button><div className="act-editor-grid">
                {tr(config.acts.map((act, index) => (
                  <article key={act.number}>
                    <Button variant="outline" disabled={config.acts.length<=1} onClick={()=>setConfig({...config,acts:config.acts.filter((_,i)=>i!==index)})}>{tr("УДАЛИТЬ")}</Button><div className="editor-act-number">{tr(act.number)}</div>
                    <label>{tr("НАЗВАНИЕ")}<input value={act.title} onChange={(event) => updateAct(index, { title: event.target.value })} /></label>
                    <label>{tr("СТАТУС")}<select value={act.status} onChange={(event) => updateAct(index, { status: event.target.value as ActConfig["status"] })}><option>{tr("АКТИВНА")}</option><option>{tr("ЗАКРЫТА")}</option><option>{tr("ЗАВЕРШЕНА")}</option></select></label>
                    <label>{tr("ПРОГРЕСС: ")}{tr(act.progress)}%<input type="range" min="0" max="100" value={act.progress} onChange={(event) => updateAct(index, { progress: Number(event.target.value) })} /></label>
                    <label>{tr("ОПИСАНИЕ")}<textarea value={act.text} onChange={(event) => updateAct(index, { text: event.target.value })} /></label>
                  </article>
                )))}
              </div>
            </section></>
            }

            <div className="admin-actions">
              <div className="admin-live-status"><Save /><span><b>{tr("СОХРАНЕНИЕ НА СЕРВЕРЕ")}</b><small>{tr("нажмите кнопку после изменений")}</small></span></div>
              <Button
                className="primary-action"
                onClick={saveServerSettings}
                disabled={serverSaveBusy || !account?.is_admin}
              >
                <Server /> {tr(serverSaveBusy ? "СОХРАНЕНИЕ..." : "СОХРАНИТЬ НА СЕРВЕРЕ")}
              </Button>
              <Button className="primary-action" onClick={() => navigate("home")}>{tr("ПРЕДПРОСМОТР ГЛАВНОЙ")}</Button>
              <Button variant="outline" className="reset-button" onClick={resetConfig}><RotateCcw /> {tr(" СБРОСИТЬ")}</Button>
            </div>
          </div>
        ) : null)}
        {view==="help"&&<HelpCenter/>}
      </main>

      <footer className="portal-footer"><button onClick={()=>navigate("help")}>{tr("ПОМОЩЬ")}</button>
        <span>{tr(config.brand)}{tr(" // ARCHIVE NODE 27")}</span>
        <span>{tr(account?.is_test ? "ТЕСТОВЫЙ СЕРВЕР · БЕЗ ВЫДАЧИ РЕАЛЬНЫХ ПРИЗОВ" : account ? "ПРОФИЛЬ ПОДКЛЮЧЁН" : "ВОЙДИТЕ В ПРОФИЛЬ")}</span>
        <span className="footer-status"><i /> SYSTEM ONLINE</span>
      </footer>

      <nav className="mobile-bottom-nav" aria-label={tr("Мобильная навигация")}>
        {tr(mobileNav.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)} type="button">
              <Icon /><span>{tr(item.label)}</span>
            </button>
          );
        }))}
      </nav>

      <Dialog open={Boolean(selectedCard)} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="card-dialog">
          {tr(selectedCard ? (
            <>
              <DialogHeader className="card-dialog-header">
                <DialogTitle>{tr(selectedCard.secret && selectedCard.image === "/classified.svg" ? "ДАННЫЕ ЗАСЕКРЕЧЕНЫ" : selectedCard.name)}</DialogTitle>
                <DialogDescription>{tr(selectedCard.rarity)}{tr(" // ")}{tr(selectedCard.tirazh === null ? "БЕЗ НОМЕРА" : `ТИРАЖ № ${selectedCard.tirazh}`)}</DialogDescription>
              </DialogHeader>
              <div className="dialog-card-grid">
                <div className="dialog-art"><img src={localizedCardImage(selectedCard,locale)} alt={tr(selectedCard.name)} className={selectedCard.secret && selectedCard.image === "/classified.svg" ? "is-locked" : ""} /></div>
                <div className="dialog-data">
                  <p><span>{tr("ПОЗЫВНОЙ")}</span><b>{tr(selectedCard.callsign)}</b></p>
                  <p><span>{tr("ОРУЖИЕ")}</span><b>{tr(selectedCard.weapon)}</b></p>
                  <p><span>{tr("КОПИЙ")}</span><b>{tr(demo.owned[selectedCard.slug] ?? 0)}</b></p>
                  <blockquote>{cardLore(selectedCard,locale)}</blockquote>
                </div>
              </div>
            </>
          ) : null)}
        </DialogContent>
      </Dialog>

      <Dialog open={onboardingOpen} onOpenChange={(open)=>{if(!open)finishOnboarding();}}><DialogContent className="system-dialog onboarding-dialog"><div className="dialog-language"><LanguageSwitch/></div><DialogHeader><DialogTitle>{locale==='en'?'HOW TO ENTER THE ZONE':'КАК ВОЙТИ В ЗОНУ'}</DialogTitle><DialogDescription>{locale==='en'?'Connect your Discord once. No shared password is used.':'Один раз подключи Discord. Общего логина и пароля здесь нет.'}</DialogDescription></DialogHeader><ol><li><Bot/><span><b>{locale==='en'?'Open the NE S27 bot':'Открой бота NE S27'}</b><small>{locale==='en'?'Run /connect on the Discord server.':'Запусти команду /connect на Discord-сервере.'}</small></span></li><li><KeyRound/><span><b>{locale==='en'?'Receive a private code':'Получи код в личных сообщениях'}</b><small>{locale==='en'?'The bot sends a one-time code valid for 10 minutes.':'Бот отправит одноразовый код, действующий 10 минут.'}</small></span></li><li><Link2/><span><b>{locale==='en'?'Enter the code on the site':'Введи код на сайте'}</b><small>{locale==='en'?'Press Sign in and paste the eight-character code.':'Нажми «Войти» и вставь код из восьми символов.'}</small></span></li><li><PackageOpen/><span><b>{locale==='en'?'Start the collection':'Начни коллекцию'}</b><small>{locale==='en'?'A new profile receives two trial coupons.':'Новый профиль получает два пробных купона.'}</small></span></li></ol><div className="onboarding-actions"><Button variant="outline" onClick={()=>finishOnboarding()}>{locale==='en'?'VIEW SITE':'ПОСМОТРЕТЬ САЙТ'}</Button><Button className="primary-action" onClick={()=>finishOnboarding(true)}>{locale==='en'?'SIGN IN':'ВОЙТИ'}</Button></div></DialogContent></Dialog>

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}><DialogContent className="system-dialog"><div className="dialog-language"><LanguageSwitch/></div><DialogHeader><DialogTitle>{tr("ВОЙТИ В NE S27")}</DialogTitle><DialogDescription>{tr("Безопасный вход выполняется только через персональный Discord-профиль. Права администратора и менеджера закрепляются за Discord ID.")}</DialogDescription></DialogHeader><form className="connect-form discord-connect-form" onSubmit={connectAccount}><h3>{tr("Вход через Discord")}</h3><p>{tr("Открой /connect в Discord-боте и введи одноразовый код. Код действует ограниченное время и не является паролем.")}</p><label>{tr("Код из команды /connect")}<input value={linkCode} onChange={e=>setLinkCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8))} minLength={8} maxLength={8} autoComplete="one-time-code" required/></label>{tr(linkError&&<p role="alert" className="connect-error">{tr(linkError)}</p>)}<Button disabled={authBusy}>{tr(authBusy?'ПРОВЕРКА…':'ПОДКЛЮЧИТЬ DISCORD')}</Button></form></DialogContent></Dialog>

      <Dialog open={soundOpen} onOpenChange={setSoundOpen}>
        <DialogContent className="system-dialog audio-settings"><DialogHeader><DialogTitle>{tr("НАСТРОЙКИ ЗВУКА")}</DialogTitle><DialogDescription>{tr("Громкость сохраняется на этом устройстве.")}</DialogDescription></DialogHeader>
          <Button variant="outline" onClick={()=>{unlockAudio();changeSound({...sound,muted:!sound.muted});}}>{tr(sound.muted?<VolumeX/>:<Volume2/>)}{tr(sound.muted?'ВКЛЮЧИТЬ ЗВУК':'ВЫКЛЮЧИТЬ ЗВУК')}</Button>
          {tr(([['volume','Общая громкость'],['clicks','Нажатия кнопок'],['effects','Открытие тайников'],['background','Фоновая музыка']] as const).map(([key,label])=><div className="sound-range" key={key}><label id={`sound-${key}`}>{tr(label)}<b>{tr(sound[key])}%</b></label><Slider aria-labelledby={`sound-${key}`} value={[sound[key]??0]} min={0} max={100} step={1} onValueChange={([v])=>changeSound({...sound,[key]:v})}/></div>))}
          <div className="sound-packs" role="group" aria-label={tr("Бесплатные наборы звуков")}>{tr(freeSounds.map(p=><button key={p.id} aria-pressed={(!sound.useEquipped||!equipment.sound)&&sound.pack===p.id} onClick={()=>{changeSound({...sound,pack:p.id,useEquipped:false});previewSound(p.id);}}><b>{tr(p.name)}</b><span>{tr(p.description)}</span><small>{tr("БЕСПЛАТНО · ПРОСЛУШАТЬ")}</small></button>))}</div>
          {tr(equipment.sound&&<Button variant="outline" onClick={()=>{changeSound({...sound,useEquipped:true});previewSound(equipment.sound);}}>{tr(sound.useEquipped?'ВКЛЮЧЁН: ':'ВКЛЮЧИТЬ: ')}{tr(cosmetics.find(c=>c.id===equipment.sound)?.name)}</Button>)}
          <p className="sound-shop-note">{tr("Другие наборы — в магазине, раздел «Наборы звуков». Купленный набор можно включить в гардеробе.")}</p>
          <div className="rarity-sound-preview"><p>{tr("ЗВУКИ РЕДКОСТЕЙ")}</p>{rarityOrder.map((rarity,rank)=><Button key={rarity} variant="outline" onClick={()=>{unlockAudio();playReveal(rank);}}>{tr(rarity)}</Button>)}</div>
        </DialogContent>
      </Dialog>
{tr(!packOpen&&bonusPrizes.length>0&&<Dialog open onOpenChange={v=>{if(!v)setBonusPrizes([]);}}><DialogContent className="bonus-dialog"><DialogTitle>{tr("СЕКРЕТНОЕ СНАБЖЕНИЕ")}</DialogTitle><DialogDescription>{tr("Дополнительный приз. Сертификат сохранён в заказах магазина.")}</DialogDescription>{tr(bonusPrizes.map(b=><article className="bonus-certificate" key={b.id}><Gift/><small>NE S27 / 0.001%</small><h2>{tr(b.name)}</h2><p>{tr("СЕРТИФИКАТ НА ПОЛУЧЕНИЕ")}</p><code>{tr(b.id.slice(0,8).toUpperCase())}</code></article>))}<Button onClick={()=>{setBonusPrizes([]);navigate('shop');}}>{tr("К МОИМ ПРИЗАМ")}</Button></DialogContent></Dialog>)}
      <Dialog open={packOpen} onOpenChange={setPackOpen}>
        <DialogContent className="cinema-dialog"><DialogHeader className="sr-only"><DialogTitle>{tr("Открытие тайников")}</DialogTitle><DialogDescription>{tr("Раскрывайте карты по очереди. Все результаты уже сохранены.")}</DialogDescription></DialogHeader>
          {tr(packOpen&&packResults.length>0&&<CacheReveal theme={equipment.reveal} cards={packResults} onDone={()=>{setPackOpen(false);navigate('cards');}}/>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
