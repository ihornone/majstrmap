# 🇺🇦 MajstrMap — Мапа майстрів України

Відкритий каталог майстрів: замовники обирають область, місто та напрямок на
інтерактивній мапі України, бачать картку майстра й зв'язуються напряму
(телефон, Telegram, Viber, WhatsApp тощо) — без посередників і комісій.

Реєстрація та self-service керування анкетою — через Telegram-бота з
модерацією; публічний сайт — SPA з читанням даних через JSON API.

## Стек

- **Worker**: Cloudflare Workers (TypeScript, [grammY](https://grammy.dev) webhook-бот)
- **БД**: Cloudflare D1 (SQLite), міграції в `migrations/`, сід — `scripts/seed.sql`
- **Медіа**: проксі телеграм-файлів через `/api/media/*` з edge-кешем; R2
  опційний (увімкніть і розкоментуйте `r2_buckets` у `wrangler.jsonc`)
- **Frontend**: React 19 + Vite + Tailwind 4 (SPA в `src/client/**`)
- **Тести**: власний ранер `scripts/test-bot.mjs` (vite SSR-бандл + node:sqlite in-memory)

## Швидкий старт

```bash
pnpm install
pnpm worker:dev          # wrangler dev (воркер + локальні D1/KV)
pnpm dev                 # vite dev (SPA)
```

Локальна БД і сід:

```bash
pnpm db:migrate:local    # wrangler d1 migrations apply DB --local
pnpm db:seed:local       # категорії з scripts/seed.sql
```

Прод-секрети (не зберігаються в репозиторії):

```bash
wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
```

## Turnstile (захист телефонів від скрейпінга)

Публічне API **не віддає контакти** у відповідях `/api/masters*` — щоб бот не
міг зібрати номери curl'ом. Контакти віддає лише `GET /api/masters/:slug/contacts`
і лише за одноразовим [Turnstile](https://developers.cloudflare.com/turnstile/)-токеном
(fail-closed, ліміт CONTACTS_LIMITER 10/хв + перевірка Origin). На клієнті
віджет Managed з `appearance: 'interaction-only'`: звичайний користувач нічого
не бачить, інтерактивна перевірка з'являється тільки коли сигнали Cloudflare
підозрілі; розкриті контакти кешуються в сесії.

Налаштування з нуля:

1. Cloudflare Dashboard → **Turnstile → Add widget**: режим **Managed**,
   домени `majstrmap.majstrmap.workers.dev` (+ свій домен, якщо додається).
2. Секрет — у воркер: `npx wrangler secret put TURNSTILE_SECRET_KEY`.
3. Сайткей (публічний) — у GitHub **Settings → Secrets and variables →
   Actions → Variables** як `VITE_TURNSTILE_SITE_KEY` (читається на Build
   кроці `deploy.yml`; без нього контакти в проді не розкриються).
4. Локально все працює на тестових ключах уже з коробки: секрет
   `1x0000000000000000000000000000000AA` у `.dev.vars` і dummy-сайткей у
   `src/client/lib/turnstile.ts`.

Коли секрет не заданий (локал/тести), воркер пропускає перевірку (fail-open).


Після деплою зареєструйте вебхук Telegram на
`https://<ваш-worker>/webhook/telegram/<випадковий-сегмент>` (сегмент —
просто частина URL; автентикація оновлень — заголовок
`x-telegram-bot-api-secret-token`, у проді без секрету оновлення
відхиляються з 503).

## Скрипти

| Скрипт | Що робить |
| --- | --- |
| `pnpm dev` | Vite dev-сервер для SPA |
| `pnpm build` | Прод-білд SPA (та воркера через `@cloudflare/vite-plugin`) |
| `pnpm worker:dev` | `wrangler dev` — локальний воркер з D1 |
| `pnpm db:migrate:local` | Застосувати нумеровані міграції з `migrations/` локально |
| `pnpm db:migrate:remote` | Застосувати міграції на прод-D1 |
| `pnpm db:seed:local` | Засіяти категорії (`scripts/seed.sql`) локально |
| `pnpm typecheck` | `tsc --noEmit` (включно з `tests/`) |
| `pnpm test:bot` | Повний набір бот-тестів (`tests/bot-workflows.ts`) |
| `pnpm test:markers` | Тест розкладання маркерів мапи (`tests/marker-placement.ts`) |
| `pnpm lint` | ESLint (мінімальний recommended-набір; typescript-eslint працює з typescript 6 side-by-side у `tools/eslint/`, бо TS 7 API ним ще не підтримується) |
| `pnpm format` / `pnpm format:check` | Prettier (налаштування за замовчуванням) |

## Деплой

```bash
pnpm build
npx wrangler deploy
```

CI (`.github/workflows/ci.yml`) на кожен push/PR виконує
`pnpm install --frozen-lockfile`, `pnpm typecheck`, тести та збірку `pnpm build`.

Деплой виконується автоматично через інтеграцію Cloudflare з репозиторієм (Git Integration) або вручну командою `pnpm build && npx wrangler deploy`.

Міграції D1 запускаються окремо за потреби — перед деплоєм нової схеми виконайте
`pnpm db:migrate:remote` вручну.

## Архітектура

- `src/worker/index.ts` — точка входу: безпекові заголовки на всіх
  відповідях, централізований обробник помилок (JSON 500), маршрутизація
  `/api/*` → `routes/api.ts`, точний маршрут
  `/webhook/telegram/<сегмент>` → бот, статика/SPA через біндинг `ASSETS`
  (спершу ассет як є, на 404 для GET-навігації — `index.html`), cron:
  щомісячна перевірка активності (`0 9 1 * *`) і 5-хвилинний цикл
  (щотижневі дайджести, нагадування активності, флаш сповіщень; кожна
  задача в окремому try/catch).
- `src/worker/bot/**` — grammY-бот: реєстрація з модератора, відгуки з
  deep-link, підписки на оновлення, особистий кабінет майстра. Обробники
  будують тексти й клавіатуру; репозиторії не залежать від grammy.
- `src/worker/db/*.repo.ts` — D1-репозиторії; атомарні зміни через
  `db.batch`. `db/notifications.ts` — чистий SQL-конструктор для
  `notification_outbox` (сповіщення пишуться тим самим batch, що й
  основна зміна; доставка — фоновим воркером з attempts/dead-letter).
- `src/worker/routes/api.ts` — публічне JSON API: `/api/categories`
  (кешується 1 год), `/api/regions/*`, `/api/masters` (без контактів),
  `/api/masters/:slug/contacts` (лише з Turnstile-токеном,
  CONTACTS_LIMITER + Origin), `/api/metrics`
  (native rate limit METRICS_LIMITER + in-memory фолбек), `/api/media/*`
  (валідація ключа + MEDIA_LIMITER, помилки апстріму → 502 JSON).
- `src/worker/services/engagement.ts` — щотижневі дайджести підписок
  (один JOIN замість N+1), одноразові нагадування після співпраці,
  добове очищення метрик (UTC 03:xx).
- `src/worker/cron/activity-check.ts` — перевірка активності майстрів:
  res.ok-перевірені надсилання, 429 → пропуск майстра цього запуску;
  машина станів `notified_day_0 → reminded_day_3 → inactive`, реактивація
  через `/start`.
- `src/shared/**` — типи/логіка, спільні для клієнта й воркера
  (регіони, контакти, умови роботи, прайсинг).

## Відомі обмеження (навмисно пропущені)

- **ENUM CHECK-обмеження**: `masters.status`, `reviews.status` тощо
  не мають `CHECK (... IN (...))` у схемі — валідація на рівні коду.
- **Сесії бота** ключуються на `telegram_id`, а не на `chat_id` —
  сесії в групах/каналах матимуть спільний стан із приватним чатом.
- **Пагінація** списку майстрів — offset-базована (`?offset=`),
  без курсора: при частих вставках можливі зсуви сторінок.
- **Staging-оточування немає**: `wrangler.jsonc` описує лише прод
  (`ENVIRONMENT=production`); тестуйте локально через `wrangler dev`.
- **Захист від перезапису сесії** покриває лише крос-контекстні потоки
  (deep-link відгуку, підписка, нова реєстрація); повторний вхід у
  редагування анкети навмисно перечитує чернетку з виробничих даних.
- **R2 вимкнено** за замовчуванням: аватарки зберігаються як
  `tg:<file_id>` і проксюються через `/api/media/*` з edge-кешем.
- **Метрики** — анонімні події браузера без ідентичностей; лімітери
  native-binding eventually-consistent, in-memory фолбек живе per-isolate.
