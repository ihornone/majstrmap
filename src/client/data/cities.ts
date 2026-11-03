export interface CityMarker {
  id: string;
  name: string;
  x: number;
  y: number;
}

export const REGION_CITIES: Record<string, CityMarker[]> = {
  poltava: [
    { id: 'poltava-city', name: 'Полтава', x: 395, y: 145 },
    { id: 'kremenchuk', name: 'Кременчук', x: 355, y: 175 },
    { id: 'myrhorod', name: 'Миргород', x: 365, y: 130 },
    { id: 'lubny', name: 'Лубни', x: 345, y: 125 },
  ],
  lviv: [
    { id: 'lviv-city', name: 'Львів', x: 64, y: 142 },
    { id: 'drohobych', name: 'Дрогобич', x: 50, y: 165 },
    { id: 'stryi', name: 'Стрий', x: 58, y: 170 },
    { id: 'chervonohrad', name: 'Червоноград', x: 60, y: 105 },
  ],
  'kiev-city': [
    { id: 'kyiv-center', name: 'Центр (Печерськ / Шевченківський)', x: 285, y: 105 },
    { id: 'kyiv-left', name: 'Лівий берег (Позняки / Дарниця)', x: 290, y: 108 },
    { id: 'kyiv-right', name: 'Правий берег (Оболонь / Поділ)', x: 282, y: 102 },
  ],
  kiev: [
    { id: 'bila-tserkva', name: 'Біла Церква', x: 275, y: 145 },
    { id: 'brovary', name: 'Бровари', x: 295, y: 105 },
    { id: 'boryspil', name: 'Бориспіль', x: 298, y: 115 },
    { id: 'irpin', name: 'Ірпінь / Буча', x: 270, y: 100 },
  ],
  odessa: [
    { id: 'odessa-city', name: 'Одеса', x: 265, y: 280 },
    { id: 'chornomorsk', name: 'Чорноморськ', x: 268, y: 295 },
    { id: 'izmail', name: 'Ізмаїл', x: 220, y: 345 },
    { id: 'podilsk', name: 'Подільськ', x: 235, y: 230 },
  ],
  kharkiv: [
    { id: 'kharkiv-city', name: 'Харків', x: 485, y: 154 },
    { id: 'chuhuiv', name: 'Чугуїв', x: 500, y: 160 },
    { id: 'lozova', name: 'Лозова', x: 475, y: 185 },
    { id: 'izium', name: 'Ізюм', x: 515, y: 175 },
  ],
  dnipropetrovsk: [
    { id: 'dnipro-city', name: 'Дніпро', x: 435, y: 215 },
    { id: 'kryvyi-rih', name: 'Кривий Ріг', x: 395, y: 235 },
    { id: 'kamianske', name: 'Кам’янське', x: 420, y: 210 },
  ],
  'ivano-frankivsk': [
    { id: 'if-city', name: 'Івано-Франківськ', x: 86, y: 194 },
    { id: 'kalush', name: 'Калуш', x: 75, y: 185 },
    { id: 'kolomyia', name: 'Коломия', x: 95, y: 210 },
  ],
  khmelnytskyy: [
    { id: 'khm-city', name: 'Хмельницький', x: 160, y: 150 },
    { id: 'kamianets', name: 'Кам’янець-Подільський', x: 155, y: 185 },
    { id: 'shepetivka', name: 'Шепетівка', x: 162, y: 115 },
  ],
  vinnytsya: [
    { id: 'vinnytsya-city', name: 'Вінниця', x: 220, y: 178 },
    { id: 'zhmerynka', name: 'Жмеринка', x: 210, y: 185 },
    { id: 'mohylov', name: 'Могилів-Подільський', x: 215, y: 215 },
  ],
  zaporizhzhya: [
    { id: 'zp-city', name: 'Запоріжжя', x: 454, y: 268 },
    { id: 'melitopol', name: 'Мелітополь', x: 450, y: 300 },
    { id: 'berdiansk', name: 'Бердянськ', x: 485, y: 310 },
  ],
  cherkasy: [
    { id: 'cherkasy-city', name: 'Черкаси', x: 312, y: 172 },
    { id: 'uman', name: 'Умань', x: 275, y: 195 },
    { id: 'smila', name: 'Сміла', x: 310, y: 180 },
  ],
  zhytomyr: [
    { id: 'zhytomyr-city', name: 'Житомир', x: 214, y: 92 },
    { id: 'berdychiv', name: 'Бердичів', x: 215, y: 115 },
    { id: 'korosten', name: 'Коростень', x: 210, y: 65 },
  ],
  ternopil: [
    { id: 'ternopil-city', name: 'Тернопіль', x: 114, y: 160 },
    { id: 'chortkiv', name: 'Чортків', x: 118, y: 185 },
    { id: 'kremenets', name: 'Кременець', x: 115, y: 130 },
  ],
  rivne: [
    { id: 'rivne-city', name: 'Рівне', x: 128, y: 72 },
    { id: 'dubno', name: 'Дубно', x: 120, y: 85 },
    { id: 'varash', name: 'Вараш', x: 125, y: 40 },
  ],
  volyn: [
    { id: 'lutsk-city', name: 'Луцьк', x: 90, y: 66 },
    { id: 'kovel', name: 'Ковель', x: 75, y: 50 },
    { id: 'novovolynsk', name: 'Нововолинськ', x: 65, y: 75 },
  ],
  transcarpathia: [
    { id: 'uzhhorod', name: 'Ужгород', x: 40, y: 195 },
    { id: 'mukachevo', name: 'Мукачево', x: 46, y: 205 },
    { id: 'khust', name: 'Хуст', x: 60, y: 215 },
  ],
  chernivtsi: [
    { id: 'chernivtsi-city', name: 'Чернівці', x: 134, y: 218 },
    { id: 'storozhynets', name: 'Сторожинець', x: 125, y: 225 },
    { id: 'novodnistrovsk', name: 'Новодністровськ', x: 165, y: 210 },
  ],
  mykolayiv: [
    { id: 'mykolayiv-city', name: 'Миколаїв', x: 322, y: 254 },
    { id: 'pervomaisk', name: 'Первомайськ', x: 295, y: 235 },
    { id: 'voznesensk', name: 'Вознесенськ', x: 305, y: 245 },
  ],
  sumy: [
    { id: 'sumy-city', name: 'Суми', x: 412, y: 62 },
    { id: 'konotop', name: 'Конотоп', x: 395, y: 55 },
    { id: 'shostka', name: 'Шостка', x: 405, y: 25 },
  ],
  chernihiv: [
    { id: 'chernihiv-city', name: 'Чернігів', x: 334, y: 54 },
    { id: 'nizhyn', name: 'Ніжин', x: 345, y: 70 },
    { id: 'pryluky', name: 'Прилуки', x: 350, y: 95 },
  ],
  kirovohrad: [
    { id: 'kropyvnytskyi', name: 'Кропивницький', x: 326, y: 204 },
    { id: 'oleksandriia', name: 'Олександрія', x: 355, y: 200 },
    { id: 'svitlovodsk', name: 'Світловодськ', x: 355, y: 180 },
  ],
  kherson: [
    { id: 'kherson-city', name: 'Херсон', x: 376, y: 290 },
    { id: 'nova-kakhovka', name: 'Нова Каховка', x: 390, y: 295 },
    { id: 'skadovsk', name: 'Скадовськ', x: 370, y: 315 },
  ],
  donetsk: [
    { id: 'kramatorsk', name: 'Краматорськ / Слов’янськ', x: 510, y: 215 },
    { id: 'pokrovsk', name: 'Покровськ', x: 500, y: 235 },
  ],
  luhansk: [
    { id: 'sievierodonetsk', name: 'Сєвєродонецьк', x: 560, y: 175 },
    { id: 'lysyshansk', name: 'Лисичанськ', x: 555, y: 180 },
  ],
  crimea: [
    { id: 'simferopol', name: 'Сімферополь', x: 416, y: 360 },
    { id: 'sevastopol', name: 'Севастополь', x: 390, y: 395 },
    { id: 'yalta', name: 'Ялта', x: 420, y: 390 },
  ],
};
