export const seasonLore=['manager-protocol','vent-shaft','stalker-tokens','new-coordinates','silverhand-door','qwtep-route','myatus-control','lexa-shoulder','noosphere-crack','first-sirens','super-emission','nine-bunker','evacuation'];
export const seasonCards=['light-side','dark-side','fallen-angel','solstice','world-cup','hall-of-fame','wastelands','revival','everfrost'];
export const uniqueCards=['heart-zone','call-zone','last-score','vice-city-king'];
export const collectionRewards=[
 {id:'s27-season-lore',name:'ЛОР СЕЗОНА',en:'SEASON LORE',cards:seasonLore,coupons:7,prize:'Discord Nitro Full + кастомная роль',prizeEn:'Discord Nitro Full + custom role'},
 {id:'s27-extra-lore',name:'ДОПОЛНИТЕЛЬНЫЙ ЛОР',en:'EXTRA LORE',cards:['burnt-map','silence','signal27'],coupons:3,prize:'Уникальная кастомная роль',prizeEn:'Exclusive custom role'},
 {id:'s27-characters',name:'ВСЕ ПЕРСОНАЖИ',en:'ALL CHARACTERS',cards:['silverhand','vlad','shinigami','zuban','oleg','qwtep','myatus','lexa','manager'],coupons:8,prize:'500 Robux + кастомная роль',prizeEn:'500 Robux + custom role'},
 {id:'s27-seasons',name:'СЕЗОНЫ NE S27',en:'NE S27 SEASONS',cards:seasonCards,coupons:8,prize:'1000 Robux + кастомная роль',prizeEn:'1000 Robux + custom role'},
 {id:'s27-zuban',name:'ВОЗВРАЩЕНИЕ ZUBAN',en:'RETURN OF ZUBAN',cards:['zuban-return'],coupons:5,prize:'Личный засекреченный приз от Zuban + кастомная роль',prizeEn:'Personal secret prize from Zuban + custom role'},
 {id:'s27-events',name:'КАРТЫ СОБЫТИЙ',en:'EVENT CARDS',cards:['crown-emission','noosphere-archive'],coupons:10,prize:'Игра Steam / баланс до $10 + кастомная роль',prizeEn:'Steam game / credit up to $10 + custom role'},
 {id:'s27-secret',name:'ЗАСЕКРЕЧЕННОЕ ДОСЬЕ',en:'CLASSIFIED DOSSIER',cards:['manager'],coupons:10,prize:'На выбор: €10 на баланс / Steam баланс / 1000 Robux',prizeEn:'Choose: €10 credit / Steam credit / 1000 Robux'},
 ...uniqueCards.map((slug,i)=>({id:'s27-unique-'+slug,name:'УНИКАЛЬНАЯ КАРТА №'+[50,51,52,56][i],en:'UNIQUE CARD #'+[50,51,52,56][i],cards:[slug],coupons:0,prize:'Гарантированный приз, указанный на полученной карте',prizeEn:'Guaranteed prize printed on the owned card'})),
];
export const editorIds=new Set(['1059423018931195994','761985282572550204','1058085185356312786','1139644815512961045','694609958788005949']);
export const newsChannelIds=['1013194498211315773','1013180975158673503','1387765118053519400','1013194830656061610','1236414155532275864','1501973321783316540','1236414278936826011','1236414391826518157','1013195137901412423','1470163629893488853','1013205729378836480','1449896290325631171'];
