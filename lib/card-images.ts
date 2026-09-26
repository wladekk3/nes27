import type {Locale} from './i18n';

type ImageCard = {slug:string;image:string};

const englishImages:Record<string,string>={
  silverhand:'/cards/en/NE-S27_001_EN.webp',vlad:'/cards/en/NE-S27_002_EN.webp',shinigami:'/cards/en/NE-S27_003_EN.webp',zuban:'/cards/en/NE-S27_004_EN.webp',oleg:'/cards/en/NE-S27_005_EN.webp',qwtep:'/cards/en/NE-S27_006_EN.webp',myatus:'/cards/en/NE-S27_007_EN.webp',lexa:'/cards/en/NE-S27_008_EN.webp',
  'vent-shaft':'/cards/en/NE-S27_009_EN.webp','burnt-map':'/cards/en/NE-S27_010_EN.webp',silence:'/cards/en/NE-S27_011_EN.webp',everfrost:'/cards/en/NE-S27_012_EN.webp',signal27:'/cards/en/NE-S27_015_EN.webp','stalker-tokens':'/cards/en/NE-S27_019_EN.webp','new-coordinates':'/cards/en/NE-S27_020_EN.webp','silverhand-door':'/cards/en/NE-S27_021_EN.webp',
  'qwtep-route':'/cards/en/NE-S27_032_EN.webp','myatus-control':'/cards/en/NE-S27_035_EN.webp','lexa-shoulder':'/cards/en/NE-S27_036_EN.webp','manager-protocol':'/cards/en/NE-S27_038_EN.webp','first-sirens':'/cards/en/NE-S27_040_EN.webp','noosphere-crack':'/cards/en/NE-S27_041_EN.webp','super-emission':'/cards/en/NE-S27_042_EN.webp','nine-bunker':'/cards/en/NE-S27_043_EN.webp',evacuation:'/cards/en/NE-S27_046_EN.webp',
  'crown-emission':'/cards/en/NE-S27_053_EN.webp',revival:'/cards/en/NE-S27_058_EN.webp',wastelands:'/cards/en/NE-S27_059_EN.webp','hall-of-fame':'/cards/en/NE-S27_060_EN.webp','zuban-return':'/cards/en/NE-S27_061_EN.webp','world-cup':'/cards/en/NE-S27_062_EN.webp',solstice:'/cards/en/NE-S27_063_EN.webp','fallen-angel':'/cards/en/NE-S27_064_EN.webp','dark-side':'/cards/en/NE-S27_065_EN.webp','light-side':'/cards/en/NE-S27_066_EN.webp',
};

const protectedEnglish=new Set(['manager','founders','heart-zone','call-zone','last-score','noosphere-archive','vice-city-king','case-27']);

export function localizedCardImage(card:ImageCard,locale:Locale){
  if(locale!=='en'||card.image==='/classified.svg')return card.image;
  if(protectedEnglish.has(card.slug))return `/api/card-art?id=${encodeURIComponent(card.slug)}&lang=en`;
  return englishImages[card.slug]??card.image;
}
