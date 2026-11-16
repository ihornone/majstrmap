import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const clean = name.trim();
  if (!clean) return '?';

  const getGraphemes = (str: string): string[] => {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const segmenter = new Intl.Segmenter('uk', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(str), (s) => s.segment);
    }
    return Array.from(str);
  };

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const firstWord = words[0];
  if (!firstWord) return '?';

  if (words.length === 1) {
    const chars = getGraphemes(firstWord);
    const c0 = chars[0];
    const c1 = chars[1];
    if (chars.length >= 2 && c0 && c1 && c0.length === 1 && c1.length === 1) {
      return (c0 + c1).toUpperCase();
    }
    return (c0 ?? '?').toUpperCase();
  }
  const secondWord = words[1];
  const first = getGraphemes(firstWord)[0] ?? '';
  const second = secondWord ? getGraphemes(secondWord)[0] ?? '' : '';
  return (first + second).toUpperCase();
}

const ukPluralRules = new Intl.PluralRules('uk-UA');

export function formatPlural(
  count: number,
  forms: { one: string; few: string; many: string }
): string {
  const rule = ukPluralRules.select(count);
  switch (rule) {
    case 'one':
      return `${count} ${forms.one}`;
    case 'few':
      return `${count} ${forms.few}`;
    case 'many':
    default:
      return `${count} ${forms.many}`;
  }
}
