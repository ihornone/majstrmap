const SITEVERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileEnv {
  TURNSTILE_SECRET_KEY?: string;
}

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

/**
 * Валідація Turnstile-токена через siteverify.
 * Секрет не налаштований (локал/тести) — перевірка пропускається (fail-open).
 * Секрет налаштований — невалідний токен або помилка siteverify відхиляє запит (fail-closed).
 * Токен одноразовий і живе 300 с; повторне використання повертає `timeout-or-duplicate`.
 */
export async function verifyTurnstileToken(env: TurnstileEnv, token: unknown, ip?: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (ip) body.set('remoteip', ip);
    const res = await fetch(SITEVERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      console.error('[turnstile] siteverify HTTP error:', res.status);
      return false;
    }
    const data = (await res.json()) as SiteverifyResponse;
    if (!data.success) {
      // 4xx — очікувані відмови клієнта; логуємо без шуму, щоб не засмічувати моніторинг.
      console.info('[turnstile] verification rejected:', data['error-codes']?.join(',') || 'unknown');
      return false;
    }
    return true;
  } catch (err) {
    console.error('[turnstile] siteverify request failed:', err);
    return false;
  }
}
