export type ConfirmedCard = {
  slug: string;
  name: string;
  rarity: "НЕОБЫЧНАЯ" | "РЕДКАЯ" | "ЭПИЧЕСКАЯ" | "ЛЕГЕНДАРНАЯ" | "МИФИЧЕСКАЯ";
  weapon: string;
  callsign: string;
  quote: string;
  tirazh: number;
  image: string;
  special?: boolean;
  secret?: boolean;
};

const root = "/cards/confirmed/";

export const confirmedCards: ConfirmedCard[] = [
  {slug:"vent-shaft",name:"ВЕНТИЛЯЦИОННАЯ ШАХТА",rarity:"РЕДКАЯ",weapon:"—",callsign:"АРХИВ",quote:"Точка, где девять участников впервые собрались перед выходом в Зону.",tirazh:9,image:root+"NE-S27_009_VENT_SHAFT_RARE.jpeg"},
  {slug:"stalker-tokens",name:"СТАЛКЕРСКИЕ ЖЕТОНЫ",rarity:"НЕОБЫЧНАЯ",weapon:"—",callsign:"АРХИВ",quote:"Знаки принадлежности к отряду NE S27, оставленные за Периметром имена.",tirazh:19,image:root+"NE-S27_019_STALKER_TOKENS_UNCOMMON.jpeg"},
  {slug:"new-coordinates",name:"НОВЫЕ КООРДИНАТЫ",rarity:"НЕОБЫЧНАЯ",weapon:"—",callsign:"АРХИВ",quote:"После эвакуации терминал вывел координаты следующей неизвестной точки.",tirazh:20,image:root+"NE-S27_020_NEW_COORDINATES_UNCOMMON.jpeg"},
  {slug:"silverhand-door",name:"SILVERHAND: ГЕРМОДВЕРЬ",rarity:"ЭПИЧЕСКАЯ",weapon:"КИБЕРНЕТИЧЕСКАЯ РУКА",callsign:"SILVERHAND",quote:"Механические шлюзы остановлены в последние секунды перед перегрузкой.",tirazh:21,image:root+"NE-S27_021_SILVERHAND_HERMETIC_DOOR_EPIC.jpeg"},
  {slug:"qwtep-route",name:"QWTEP: ПОДЗЕМНЫЙ МАРШРУТ",rarity:"НЕОБЫЧНАЯ",weapon:"МОТОЦИКЛ",callsign:"QWTEP",quote:"Энергоблоки доставлены через разрушенные тоннели комплекса.",tirazh:32,image:root+"NE-S27_032_QWTEP_UNDERGROUND_ROUTE_UNCOMMON.jpeg"},
  {slug:"myatus-control",name:"MYATUS: ПУТЬ ПОД КОНТРОЛЕМ",rarity:"НЕОБЫЧНАЯ",weapon:"ВИНТОРЕЗ",callsign:"MYATUS",quote:"Снайпер контролировал движение отряда с высоты разрушенных конструкций.",tirazh:35,image:root+"NE-S27_035_MYATUS_ROUTE_CONTROL_UNCOMMON.jpeg"},
  {slug:"lexa-shoulder",name:"LEXA: ПЛЕЧОМ К ПЛЕЧУ",rarity:"НЕОБЫЧНАЯ",weapon:"M4",callsign:"LEXA",quote:"Рядовой боец прошёл рейд рядом с отрядом до самой эвакуации.",tirazh:36,image:root+"NE-S27_036_LEXA_SHOULDER_TO_SHOULDER_UNCOMMON.jpeg"},
  {slug:"manager-protocol",name:"MANAGER: СЕКРЕТНЫЙ ПРОТОКОЛ",rarity:"ЭПИЧЕСКАЯ",weapon:"АВАРИЙНЫЕ КОДЫ",callsign:"MANAGER",quote:"Расшифрованный протокол свёл девять участников к одной цели.",tirazh:38,image:root+"NE-S27_038_MANAGER_SECRET_PROTOCOL_EPIC.jpeg"},
  {slug:"first-sirens",name:"ПЕРВЫЕ СИРЕНЫ",rarity:"НЕОБЫЧНАЯ",weapon:"—",callsign:"СЕЗОН",quote:"Сигнал начала первого сезона Shadow of Chernobyl.",tirazh:40,image:root+"NE-S27_040_FIRST_SIRENS_UNCOMMON.jpeg"},
  {slug:"noosphere-crack",name:"ТРЕЩИНА В НООСФЕРЕ",rarity:"РЕДКАЯ",weapon:"—",callsign:"АРХИВ",quote:"Эксперимент лабораторий нарушил равновесие над Зоной.",tirazh:41,image:root+"NE-S27_041_NOOSPHERE_CRACK_RARE.jpeg"},
  {slug:"super-emission",name:"СВЕРХВЫБРОС",rarity:"ЭПИЧЕСКАЯ",weapon:"—",callsign:"КАТАКЛИЗМ",quote:"Искусственно разогнанный выброс угрожал выйти далеко за Периметр.",tirazh:42,image:root+"NE-S27_042_SUPER_EMISSION_EPIC.jpeg"},
  {slug:"nine-bunker",name:"ДЕВЯТЕРО В БУНКЕРЕ",rarity:"НЕОБЫЧНАЯ",weapon:"—",callsign:"ОТРЯД",quote:"Девять разных путей сошлись в одном подземном узле.",tirazh:43,image:root+"NE-S27_043_NINE_IN_BUNKER_UNCOMMON.jpeg"},
  {slug:"evacuation",name:"ЭВАКУАЦИЯ",rarity:"РЕДКАЯ",weapon:"ВЕРТОЛЁТ",callsign:"АРХИВ",quote:"Все девять покинули комплекс за мгновение до взрыва.",tirazh:46,image:root+"NE-S27_046_EVACUATION_RARE.jpeg"},
  {slug:"heart-zone",name:"ЗАСЕКРЕЧЕНО",rarity:"ЛЕГЕНДАРНАЯ",weapon:"███",callsign:"███",quote:"███",tirazh:50,image:"/classified.svg",special:true,secret:true},
  {slug:"call-zone",name:"ЗАСЕКРЕЧЕНО",rarity:"ЛЕГЕНДАРНАЯ",weapon:"███",callsign:"███",quote:"███",tirazh:51,image:"/classified.svg",special:true,secret:true},
  {slug:"last-score",name:"ЗАСЕКРЕЧЕНО",rarity:"ЛЕГЕНДАРНАЯ",weapon:"███",callsign:"███",quote:"███",tirazh:52,image:"/classified.svg",special:true,secret:true},
  {slug:"crown-emission",name:"КОРОНА ВЫБРОСА",rarity:"ЛЕГЕНДАРНАЯ",weapon:"—",callsign:"АРХИВ",quote:"Легендарный символ энергии Зоны.",tirazh:53,image:root+"NE-S27_053_CROWN_OF_EMISSION_LEGENDARY.webp"},
  {slug:"noosphere-archive",name:"ЗАСЕКРЕЧЕНО",rarity:"МИФИЧЕСКАЯ",weapon:"███",callsign:"███",quote:"███",tirazh:54,image:"/classified.svg",secret:true},
  {slug:"vice-city-king",name:"ЗАСЕКРЕЧЕНО",rarity:"ЛЕГЕНДАРНАЯ",weapon:"███",callsign:"███",quote:"███",tirazh:56,image:"/classified.svg",special:true,secret:true},
  {slug:"case-27",name:"ЗАСЕКРЕЧЕНО",rarity:"МИФИЧЕСКАЯ",weapon:"███",callsign:"███",quote:"███",tirazh:57,image:"/classified.svg",secret:true},
  {slug:"revival",name:"REVIVAL",rarity:"ЛЕГЕНДАРНАЯ",weapon:"—",callsign:"03.05.2024",quote:"Возвращение проекта после паузы и начало новой главы.",tirazh:58,image:root+"NE-S27_058_REVIVAL_LEGENDARY.webp"},
  {slug:"wastelands",name:"WASTELANDS",rarity:"ЭПИЧЕСКАЯ",weapon:"—",callsign:"25.06.2025",quote:"Постапокалиптическая эпоха, ставшая мостом к новой Зоне.",tirazh:59,image:root+"NE-S27_059_WASTELANDS_EPIC.webp"},
  {slug:"hall-of-fame",name:"HALL OF FAME",rarity:"НЕОБЫЧНАЯ",weapon:"—",callsign:"АРХИВ",quote:"Имена и события, оставившие след в истории сообщества.",tirazh:60,image:root+"NE-S27_060_HALL_OF_FAME_UNCOMMON.webp"},
  {slug:"zuban-return",name:"ВОЗВРАЩЕНИЕ ZUBAN",rarity:"ЛЕГЕНДАРНАЯ",weapon:"—",callsign:"ZUBAN",quote:"Подтверждённое возвращение участника в историю NE S27.",tirazh:61,image:root+"NE-S27_061_RETURN_OF_ZUBAN_LEGENDARY.webp"},
  {slug:"world-cup",name:"WORLD CUP",rarity:"ЛЕГЕНДАРНАЯ",weapon:"—",callsign:"03.08.2026",quote:"Завершённый тематический период сервера.",tirazh:62,image:root+"NE-S27_062_WORLD_CUP_LEGENDARY.webp"},
  {slug:"solstice",name:"SOLSTICE",rarity:"НЕОБЫЧНАЯ",weapon:"—",callsign:"07.08.2026",quote:"Переходный период подготовки следующего сезона.",tirazh:63,image:root+"NE-S27_063_SOLSTICE_UNCOMMON.webp"},
  {slug:"fallen-angel",name:"FALLEN ANGEL",rarity:"НЕОБЫЧНАЯ",weapon:"—",callsign:"СЕЗОН",quote:"Одна из подтверждённых тематических глав NE S27.",tirazh:64,image:root+"NE-S27_064_FALLEN_ANGEL_UNCOMMON.webp"},
  {slug:"dark-side",name:"DARK SIDE",rarity:"РЕДКАЯ",weapon:"—",callsign:"СЕЗОН",quote:"Тёмная сторона одной из эпох сервера.",tirazh:65,image:root+"NE-S27_065_DARK_SIDE_RARE.webp"},
  {slug:"light-side",name:"LIGHT SIDE",rarity:"РЕДКАЯ",weapon:"—",callsign:"СЕЗОН",quote:"Светлая сторона одной из эпох сервера.",tirazh:66,image:root+"NE-S27_066_LIGHT_SIDE_RARE.webp"},
];
