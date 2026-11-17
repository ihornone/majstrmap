/**
 * Області, які безпосередньо прилягають до лінії зіткнення / тимчасово окуповані.
 * Відповідно до безпекової політики, точні назви міст у цих областях на публічній
 * мапі та у списках замінюються на загальну назву області, щоб унеможливити
 * ворожий аналіз та розвідку.
 */
export const FRONTLINE_REGIONS: ReadonlySet<string> = new Set([
  'donetsk',
  'luhansk',
  'zaporizhzhya',
  'kherson',
  'crimea',
]);

export function isFrontlineRegion(regionId: string | undefined | null): boolean {
  if (!regionId) return false;
  return FRONTLINE_REGIONS.has(regionId);
}

/**
 * Повертає безпечну назву локації для публічного відображення.
 * Якщо регіон прифронтовий — приховує конкретне місто.
 */
export function safeLocationDisplay(
  regionId: string | undefined | null,
  cityName: string,
  regionName?: string
): string {
  if (isFrontlineRegion(regionId)) {
    return regionName || 'Прифронтовий регіон (безпековий режим)';
  }
  return cityName;
}

/**
 * Валідація тексту (відгук, опис тощо) на наявність адрес, номерів квартир,
 * телефонів або координат для запобігання витоку точних геоданих.
 */
const FORBIDDEN_PATTERNS = [
  // Вулиці, проспекти, провулки, бульвари, площі, шосе
  /(?:^|\s|[.,;])(?:вул\.?|вулиця|просп\.?|проспект|пров\.?|провулок|бульв\.?|бульвар|пл\.?|площа|шосе|тупик|набережна)\s+[А-Яа-яЄєІіЇїҐґA-Za-z0-9]/iu,
  // Номери будинків, під'їздів, поверхів, квартир
  /(?:^|\s|[.,;])(?:буд\.?|будинок|кв\.?|квартира|під'їзд|під’їзд|поверх)\s*\d+/iu,
  // Адресні дроби на кшталт "12/4", "буд. 5а" поруч з цифрами
  /(?:^|\s|[.,;])буд(?:инок)?\s*\d+[а-яa-z]?(\/\d+)?/iu,
  // Номери телефонів (від 9 до 12 цифр підряд або з роздільниками)
  /(\+?380|0)\s*\(?\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/,
  // Географічні координати lat/lng
  /\b\d{2}\.\d{4,}\s*,\s*\d{2}\.\d{4,}\b/,
];

export function containsSensitiveGeoOrContactInfo(text: string): boolean {
  if (!text) return false;
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text));
}
