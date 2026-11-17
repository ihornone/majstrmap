export interface PortfolioWorkItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  description?: string;
  tag?: string;
}

// Високоякісні тематичні фото прикладів робіт майстрів за категоріями:
// манікюр, сантехніка, електрика, ремонт/оздоблення, авто, перукарські послуги тощо.
export const CATEGORY_WORK_PHOTOS: Record<string, PortfolioWorkItem[]> = {
  manicure: [
    {
      id: 'mani-1',
      title: 'Апаратний манікюр + нюдове покриття',
      category: 'manicure',
      imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=80',
      description: 'Чистий апаратний манікюр з укріпленням гелем та базовим нюдовим відтінком.',
      tag: 'Манікюр',
    },
    {
      id: 'mani-2',
      title: 'Френч та мінімалістичний дизайн',
      category: 'manicure',
      imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80',
      description: 'Класичний французький манікюр на мигдалеподібну форму нігтів.',
      tag: 'Френч',
    },
    {
      id: 'mani-3',
      title: 'Гелеве моделювання та укріплення',
      category: 'manicure',
      imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=1200&q=80',
      description: 'Корекція архітектури нігтів, глибокий глянцевий фініш.',
      tag: 'Укріплення',
    },
    {
      id: 'mani-4',
      title: 'Арт-дизайн та стемпінг',
      category: 'manicure',
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
      description: 'Авторський розпис та сучасна геометрія.',
      tag: 'Дизайн',
    },
  ],

  plumbing: [
    {
      id: 'plumb-1',
      title: 'Монтаж інсталяції та вузла водопостачання',
      category: 'plumbing',
      imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
      description: 'Колекторна розводка Rehau, захист від протікання, фільтри тонкої очистки.',
      tag: 'Колекторний вузол',
    },
    {
      id: 'plumb-2',
      title: 'Встановлення санфаянсу та змішувача прихованого монтажу',
      category: 'plumbing',
      imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=1200&q=80',
      description: 'Акуратне підключення душової системи та кераміки з перевіркою тиску.',
      tag: 'Чистова сантехніка',
    },
    {
      id: 'plumb-3',
      title: 'Обв’язка та заміна трубопроводу',
      category: 'plumbing',
      imageUrl: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
      description: 'Якісна заміна аварійних труб та установка надійних кульових кранів.',
      tag: 'Трубопровід',
    },
    {
      id: 'plumb-4',
      title: 'Монтаж бойлера та редуктора тиску',
      category: 'plumbing',
      imageUrl: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80',
      description: 'Підключення водонагрівача зі зворотним клапаном та стабілізатором тиску.',
      tag: 'Водонагрівачі',
    },
  ],

  electric: [
    {
      id: 'elec-1',
      title: 'Збірка та маркування електрощита',
      category: 'electric',
      imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
      description: 'Розподільчий щит Hager: ПЗВ, реле напруги Zubr, акуратний кабельний менеджмент.',
      tag: 'Електрощит',
    },
    {
      id: 'elec-2',
      title: 'Монтаж трекового та світлодіодного освітлення',
      category: 'electric',
      imageUrl: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1200&q=80',
      description: 'Прихована підсвітка стелі та магнітні треки для зонального світла.',
      tag: 'Освітлення',
    },
    {
      id: 'elec-3',
      title: 'Штроблення та розводка підрозетників',
      category: 'electric',
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
      description: 'Безпилове штроблення, прокладання негорючого мідного кабелю ВВГнг-LS.',
      tag: 'Чорнова електрика',
    },
  ],

  finishing: [
    {
      id: 'fin-1',
      title: 'Укладання великоформатного керамограніту',
      category: 'finishing',
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      description: 'Запил кутів під 45 градусів, епоксидна затирка швів.',
      tag: 'Плитка',
    },
    {
      id: 'fin-2',
      title: 'Малярні роботи та фарбування стін',
      category: 'finishing',
      imageUrl: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=80',
      description: 'Шпаклювання під лампу Лосєва, безповітряне нанесення фарби.',
      tag: 'Оздоблення',
    },
    {
      id: 'fin-3',
      title: 'Настил паркетної дошки та ламінату',
      category: 'finishing',
      imageUrl: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=1200&q=80',
      description: 'Ідеальна стиковка без порогів, безшумна коркова підкладка.',
      tag: 'Підлога',
    },
  ],

  appliances: [
    {
      id: 'app-1',
      title: 'Діагностика та ремонт плати керування пральної машини',
      category: 'appliances',
      imageUrl: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80',
      description: 'Заміна підшипників, насоса, відновлення електронного модуля.',
      tag: 'Пральні машини',
    },
    {
      id: 'app-2',
      title: 'Обслуговування та заправка кондиціонера фреоном',
      category: 'appliances',
      imageUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80',
      description: 'Глибока антибактеріальна чистка парогенератором та перевірка тиску.',
      tag: 'Кондиціонери',
    },
  ],

  auto: [
    {
      id: 'auto-1',
      title: 'Комплексна поліровка кузова та керамічний захист',
      category: 'auto',
      imageUrl: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=80',
      description: 'Відновлення глибокого кольору лаку, гідрофобне захисне покриття 9H.',
      tag: 'Детейлінг',
    },
    {
      id: 'auto-2',
      title: 'Діагностика та ремонт ходової частини',
      category: 'auto',
      imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
      description: 'Заміна сайлентблоків, амортизаторів та гальмівних дисків.',
      tag: 'Ходова частина',
    },
  ],

  hairdresser: [
    {
      id: 'hair-1',
      title: 'Складне фарбування Airtouch / Балаяж',
      category: 'hairdresser',
      imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=1200&q=80',
      description: 'М’який плавний перехід кольору без пошкодження структури волосся.',
      tag: 'Фарбування',
    },
    {
      id: 'hair-2',
      title: 'Модельна жіноча стрижка та укладка',
      category: 'hairdresser',
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
      description: 'Підбір форми за типом обличчя, доглядова процедура зволоження.',
      tag: 'Стрижка',
    },
  ],

  cosmetology: [
    {
      id: 'cosm-1',
      title: 'Апаратний догляд та чистка обличчя',
      category: 'cosmetology',
      imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
      description: 'Ультразвукова та атравматична чистка із заспокійливою маскою.',
      tag: 'Догляд',
    },
  ],
};

// Запасні фото на випадок кастомних категорій або "Інше"
export const DEFAULT_WORK_PHOTOS: PortfolioWorkItem[] = [
  {
    id: 'default-1',
    title: 'Якісно виконана робота та увага до деталей',
    category: 'other',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    description: 'Професійний інструмент, охайність і гарантія на кожне замовлення.',
    tag: 'Майстерність',
  },
  {
    id: 'default-2',
    title: 'Індивідуальний підхід до кожного клієнта',
    category: 'other',
    imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80',
    description: 'Дотримання узгоджених термінів та контроль якості.',
    tag: 'Якість',
  },
];

export function getPortfolioForCategory(categoryId: string | undefined): PortfolioWorkItem[] {
  if (!categoryId) return DEFAULT_WORK_PHOTOS;
  return CATEGORY_WORK_PHOTOS[categoryId] || DEFAULT_WORK_PHOTOS;
}
