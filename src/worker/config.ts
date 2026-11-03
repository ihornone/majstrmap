
export const DEFAULT_PUBLIC_BASE_URL = 'https://majstrmap.majstrmap.workers.dev';
export const DEFAULT_CHANNEL_USERNAME = '@ihornone_official';

export function publicBaseUrl(env: { PUBLIC_BASE_URL?: string }): string {
  return env.PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL;
}

export function channelUsername(env: { TELEGRAM_CHANNEL_USERNAME?: string }): string {
  return env.TELEGRAM_CHANNEL_USERNAME || DEFAULT_CHANNEL_USERNAME;
}
