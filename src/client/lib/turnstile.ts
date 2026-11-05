// Провайдер Turnstile-токенів. Один прихований віджет (Managed, appearance
// 'interaction-only'): звичайний користувач нічого не бачить, а якщо Cloudflare
// вимагає інтеракції — картка з віджетом з'являється внизу праворуч.
// Токени одноразові (життя 300 с), тому видача серіалізована: кожен виклик
// повертає свіжий токен після завершення попереднього.

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const DEV_DUMMY_SITE_KEY = '2x00000000000000000000AB'; // always-pass, невидимий
const PROD_SITE_KEY = '0x4AAAAAAF1AV5NpGBaN2XUr';
const SCRIPT_LOAD_TIMEOUT_MS = 15_000;
const TOKEN_TIMEOUT_MS = 120_000;

// Публічний сайткей: пріоритет у VITE_TURNSTILE_SITE_KEY, fallback на прод-ключ віджета або dummy в dev
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? DEV_DUMMY_SITE_KEY : PROD_SITE_KEY);

interface TurnstileApi {
  render: (container: HTMLElement, params: Record<string, unknown>) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export class TurnstileUnavailableError extends Error {
  constructor(message = 'Перевірка не вдалася, спробуйте ще раз') {
    super(message);
    this.name = 'TurnstileUnavailableError';
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;
let widgetId: string | null = null;
let anchor: HTMLElement | null = null;
let active: { resolve: (token: string) => void; reject: (err: Error) => void } | null = null;
let chain: Promise<unknown> = Promise.resolve();

function showAnchor(visible: boolean): void {
  if (anchor) anchor.style.display = visible ? 'block' : 'none';
}

function mountAnchor(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483000;display:none;max-width:calc(100vw - 32px);';
  wrap.innerHTML = `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 10px 30px rgba(2,6,23,.15);padding:10px 12px 6px;">
      <p style="margin:0 0 2px;font:600 12px/1.4 system-ui,sans-serif;color:#0f172a;">Швидка перевірка</p>
      <p style="margin:0 0 8px;font:400 11px/1.4 system-ui,sans-serif;color:#64748b;">Підтвердіть, що ви не робот</p>
      <div data-mm-turnstile-widget></div>
    </div>`;
  document.body.appendChild(wrap);
  anchor = wrap;
  return wrap.querySelector<HTMLElement>('[data-mm-turnstile-widget]')!;
}

function loadApi(): Promise<TurnstileApi> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TurnstileUnavailableError('Turnstile не завантажився вчасно')), SCRIPT_LOAD_TIMEOUT_MS);
    const onload = '__mmTurnstileOnload';
    (window as unknown as Record<string, unknown>)[onload] = () => {
      clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile);
      else reject(new TurnstileUnavailableError());
    };
    const script = document.createElement('script');
    script.src = `${SCRIPT_SRC}?render=explicit&onload=${onload}`;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timer);
      scriptPromise = null; // наступна спроба може вдатися
      reject(new TurnstileUnavailableError('Не вдалося завантажити Turnstile'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function renderWidget(turnstile: TurnstileApi): void {
  const container = mountAnchor();
  widgetId = turnstile.render(container, {
    sitekey: SITE_KEY,
    appearance: 'interaction-only',
    execution: 'execute',
    language: 'uk',
    callback: (token: string) => {
      showAnchor(false);
      active?.resolve(token);
      active = null;
    },
    'before-interactive-callback': () => showAnchor(true),
    'after-interactive-callback': () => showAnchor(false),
    'expired-callback': () => {
      showAnchor(false);
      active?.reject(new TurnstileUnavailableError('Токен прострочений, спробуйте ще раз'));
      active = null;
    },
    'timeout-callback': () => {
      showAnchor(false);
      active?.reject(new TurnstileUnavailableError('Перевірка не завершена, спробуйте ще раз'));
      active = null;
    },
    'error-callback': (code?: string) => {
      showAnchor(false);
      console.info('[turnstile] widget error:', code);
      active?.reject(new TurnstileUnavailableError());
      active = null;
      return true;
    },
  });
}

async function obtainToken(): Promise<string> {
  const turnstile = await loadApi();
  if (!widgetId) renderWidget(turnstile);
  else turnstile.reset(widgetId); // токен одноразовий: перед новим execute скидаємо стан
  const id = widgetId;
  if (!id) return Promise.reject(new TurnstileUnavailableError('Віджет не ініціалізований'));
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TurnstileUnavailableError('Перевірка триває надто довго'));
      active = null;
    }, TOKEN_TIMEOUT_MS);
    const settle = (done: (token: string) => void) => (token: string) => {
      clearTimeout(timer);
      done(token);
    };
    const fail = (err: Error) => {
      clearTimeout(timer);
      reject(err);
    };
    active = { resolve: settle(resolve), reject: fail };
    turnstile.execute(id);
  });
}

/**
 * Повертає одноразовий Turnstile-токен. У 99% випадків — непомітно; якщо
 * Cloudflare вимагає інтеракції, користувач побачить картку з віджетом.
 * Кидає TurnstileUnavailableError, якщо скрипт заблоковано або сайткей не задано.
 */
export function getTurnstileToken(): Promise<string> {
  if (!SITE_KEY) return Promise.reject(new TurnstileUnavailableError('Сайткей не налаштований'));
  const run = chain.then(obtainToken, obtainToken);
  chain = run.then(
    () => {},
    () => {},
  ); // ланцюжок живе після невдач
  return run;
}
