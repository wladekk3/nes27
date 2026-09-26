export const rarityNames = ['НЕОБЫЧНАЯ','РЕДКАЯ','ЭПИЧЕСКАЯ','ЛЕГЕНДАРНАЯ','МИФИЧЕСКАЯ'] as const;
export const weights = [5500,3800,500,180,20];
export const salvage = [30,50,100,250,1000];
export function uniform(max:number) { const ceiling = 4294967296 - 4294967296 % max; let n:number; do { n=crypto.getRandomValues(new Uint32Array(1))[0]; } while(n>=ceiling); return n%max; }
export function rarityAt(n:number) { if(!Number.isInteger(n)||n<0||n>=10000) throw new Error('Invalid roll'); let total=0; return weights.findIndex(w => (total+=w)>n); }
export const pool = [
 ['silverhand',3],['vlad',3],['shinigami',2],['zuban',1],['oleg',2],['qwtep',0],['myatus',1],['lexa',0],['manager',4],['burnt-map',0],['silence',1],['everfrost',2],['signal27',3],['founders',4],
 ['vent-shaft',1],['stalker-tokens',0],['new-coordinates',0],['silverhand-door',2],['qwtep-route',0],['myatus-control',0],['lexa-shoulder',0],['manager-protocol',2],['first-sirens',0],['noosphere-crack',1],['super-emission',2],['nine-bunker',0],['evacuation',1],['crown-emission',3],['noosphere-archive',4],['case-27',4],['revival',3],['wastelands',2],['hall-of-fame',0],['zuban-return',3],['world-cup',3],['solstice',0],['fallen-angel',0],['dark-side',1],['light-side',1]
] as const;
export function draw() {const rarity=rarityAt(uniform(10000));const options=pool.filter(c=>c[1]===rarity);return options[uniform(options.length)];}
export const products = [
 {id:'balance10',name:'Сертификат на баланс €10',price:11760},
 {id:'nitro',name:'Discord Nitro Full',price:8820},
 {id:'robux500',name:'500 Robux',price:5290},
 {id:'robux1000',name:'1000 Robux',price:10000},
 {id:'steam10',name:'Игра Steam / баланс до $10',price:10590},
 {id:'stalker-standard',name:'S.T.A.L.K.E.R. 2 — обычная версия',price:38240},
 {id:'stalker-full',name:'S.T.A.L.K.E.R. 2 — полная версия',price:58820},
 {id:'gta-standard',name:'GTA 6 — обычная версия',price:52940},
 {id:'gta-full',name:'GTA 6 — полная версия',price:94120},
];

// A separate bonus: one of 100,000 equally likely buckets; never changes card rarity.
export const prizeBonusDenominator=100000;
export function bonusAt(bucket:number){if(!Number.isInteger(bucket)||bucket<0||bucket>=prizeBonusDenominator)throw Error("Invalid bonus roll");return bucket===0;}
