export const BOT_URL = 'https://t.me/majstrmap_bot';
export const CHANNEL_URL = 'https://t.me/ihornone_official';
export const PORTFOLIO_URL = 'https://t.me/ihornone_portfolio';

export function botUrl(startParam?: string): string {
  return startParam ? `${BOT_URL}?start=${startParam}` : BOT_URL;
}
