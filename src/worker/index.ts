import { handleApiRequest } from './routes/api';
import { handleTelegramWebhook } from './bot/bot';
import { flushNotifications } from './bot/utils/notifications';
import { runClientNotifications } from './services/engagement';
import { runMonthlyActivityCheck, runActivityReminders } from './cron/activity-check';

export interface Env {
  DB: D1Database;
  BUCKET?: R2Bucket;
  ASSETS?: Fetcher;
  METRICS_LIMITER?: RateLimit;
  MEDIA_LIMITER?: RateLimit;
  ENVIRONMENT?: string;
  PUBLIC_BASE_URL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_CHANNEL_USERNAME?: string;
  ADMIN_TELEGRAM_IDS?: string;
  MINT_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function withSecurityHeaders(res: Response): Response {
  const headers = new Headers();
  res.headers.forEach((value, key) => headers.set(key, value));
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

const WEBHOOK_RE = /^\/webhook\/telegram\/[^/]+$/;

const OAUTH_TOKEN_ENDPOINT = 'https://dash.cloudflare.com/oauth2/token';
const OAUTH_CLIENT_ID = '54d11594-84e4-41aa-b438-e81b8fa78ee7';
const OAUTH_REDIRECT_URI = 'http://localhost:8976/oauth/callback';

// Міст для CI-деплою: обмінює одноразовий OAuth refresh-токен (канонічне
// джерело — D1, рядок id=1) на короткоживучий access-токен (1 год).
// Cloudflare повертає НОВИЙ refresh-токен при кожному обміні — зберігаємо
// його назад в D1, щоб наступний мінт продовжував працювати.
async function handleMint(request: Request, env: Env): Promise<Response> {
  if (!env.MINT_KEY || request.headers.get('x-mint-key') !== env.MINT_KEY) {
    return Response.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const row = await env.DB.prepare('SELECT refresh_token FROM oauth_tokens WHERE id = 1').first<{ refresh_token: string }>();
  if (!row?.refresh_token) {
    return Response.json({ ok: false, error: 'no refresh token stored' }, { status: 500 });
  }
  const resp = await fetch(OAUTH_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: OAUTH_REDIRECT_URI,
    }),
  });
  const data = (await resp.json()) as { access_token?: string; refresh_token?: string; error?: string };
  if (!resp.ok || !data.access_token) {
    console.error('[mint] OAuth exchange failed:', data.error ?? resp.status);
    return Response.json({ ok: false, error: 'token exchange failed' }, { status: 502 });
  }
  if (data.refresh_token && data.refresh_token !== row.refresh_token) {
    await env.DB
      .prepare("UPDATE oauth_tokens SET refresh_token = ?, updated_at = datetime('now') WHERE id = 1")
      .bind(data.refresh_token)
      .run();
  }
  return Response.json({ ok: true, token: data.access_token, expires_in: 3599 });
}

async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return withSecurityHeaders(await handleApiRequest(request, env));
  }

  if (WEBHOOK_RE.test(url.pathname)) {
    return withSecurityHeaders(await handleTelegramWebhook(request, env, ctx));
  }

  if (url.pathname === '/internal/mint' && request.method === 'POST') {
    return withSecurityHeaders(await handleMint(request, env));
  }

  if (env.ASSETS) {
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status !== 404) return withSecurityHeaders(assetRes);
    if (request.method === 'GET' || request.method === 'HEAD') {
      return withSecurityHeaders(await env.ASSETS.fetch(new Request(new URL('/', request.url), request)));
    }
    return withSecurityHeaders(assetRes);
  }

  return withSecurityHeaders(new Response('Not Found', { status: 404 }));
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    try {
      return await route(request, env, ctx);
    } catch (err) {
      console.error(`[worker] Unhandled error for ${request.method} ${url.pathname}:`, err);
      return withSecurityHeaders(Response.json({ ok: false, error: 'internal_error' }, { status: 500 }));
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const safeTask = async (name: string, task: () => Promise<unknown>) => {
      try {
        await task();
      } catch (err) {
        console.error(`[cron] Task "${name}" failed:`, err);
      }
    };

    ctx.waitUntil((async () => {
      await safeTask('clientNotifications', () => runClientNotifications(env));
      await safeTask('activityReminders', () => runActivityReminders(env));
      await safeTask('flushNotifications', () => flushNotifications(env));
    })());

    if (event.cron === '0 9 1 * *') {
      ctx.waitUntil(safeTask('monthlyActivityCheck', () => runMonthlyActivityCheck(env)));
    }
  },
};
