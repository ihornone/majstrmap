import test from 'node:test';
import assert from 'node:assert/strict';
import { handleTelegramWebhook } from '../src/worker/bot/bot';
import { handleApiRequest } from '../src/worker/routes/api';
import { isFrontlineRegion, safeLocationDisplay, containsSensitiveGeoOrContactInfo } from '../src/shared/safety';

// Mock імітація безпечного D1
class MockD1PreparedStatement {
  public boundArgs: any[] = [];
  constructor(public query: string) {}
  bind(...args: any[]) {
    this.boundArgs = args;
    return this;
  }
  async first<T = any>(): Promise<T | null> {
    return null;
  }
  async all<T = any>(): Promise<{ results: T[] }> {
    return { results: [] };
  }
  async run(): Promise<{ meta: { changes: number; last_row_id: number } }> {
    return { meta: { changes: 0, last_row_id: 0 } };
  }
}

class MockD1Database {
  queries: { sql: string; args: any[] }[] = [];
  prepare(sql: string) {
    const stmt = new MockD1PreparedStatement(sql);
    this.queries.push({ sql, args: [] });
    return stmt;
  }
  async batch(_statements: MockD1PreparedStatement[]) {
    return [];
  }
}

test('🛡️ Захист воєнного часу (Zero Geo-Leak): фільтрація точних адрес і прифронтових міст', () => {
  // 1. Заборона номерів телефонів та точних адрес
  assert.equal(containsSensitiveGeoOrContactInfo('Мій телефон 098 765 43 21'), true, 'Має блокувати телефон в описі');
  assert.equal(containsSensitiveGeoOrContactInfo('+380501234567'), true, 'Має блокувати міжнародний номер');
  assert.equal(containsSensitiveGeoOrContactInfo('вул. Хрещатик, буд. 12, кв. 45'), true, 'Має блокувати вулицю і номер будинку');
  assert.equal(containsSensitiveGeoOrContactInfo('будинок 101'), true, 'Має блокувати номер будинку');
  assert.equal(containsSensitiveGeoOrContactInfo('Якісний ремонт сантехніки у квартирах та офісах'), false, 'Звичайний опис має проходити');

  // 2. Безпека прифронтових міст
  assert.equal(isFrontlineRegion('donetsk'), true, 'Донецька область має бути прифронтовою');
  assert.equal(isFrontlineRegion('lviv'), false, 'Львівська область не є прифронтовою');

  // 3. Маскування небезпечних локацій
  const masked = safeLocationDisplay('donetsk', 'Покровськ', 'Донецька область');
  assert.equal(masked, 'Донецька область', 'Точне прифронтове місто має маскуватися назвою області');

  const safe = safeLocationDisplay('lviv', 'Львів', 'Львівська область');
  assert.equal(safe, 'Львів', 'Безпечне місто має відображатися без змін');
});

test('🛡️ Захист Telegram Webhook: блокування неавторизованих або підроблених запитів', async () => {
  const env: any = {
    ENVIRONMENT: 'production',
    TELEGRAM_WEBHOOK_SECRET: 'super_secret_webhook_token_123',
    DB: new MockD1Database(),
  };

  // 1. Спроба відправити GET замість POST
  const getReq = new Request('https://www.mastermap.sbs/webhook/telegram/test', {
    method: 'GET',
  });
  const resGet = await handleTelegramWebhook(getReq, env, {} as any);
  assert.equal(resGet.status, 405, 'Має відхиляти non-POST методи з кодом 405');

  // 2. Спроба POST без секретного токена
  const noAuthReq = new Request('https://www.mastermap.sbs/webhook/telegram/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ update_id: 1 }),
  });
  const resNoAuth = await handleTelegramWebhook(noAuthReq, env, {} as any);
  assert.equal(resNoAuth.status, 401, 'Має повертати 401 при відсутності секретного заголовка');

  // 3. Спроба POST з підробленим секретним токеном
  const fakeAuthReq = new Request('https://www.mastermap.sbs/webhook/telegram/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-bot-api-secret-token': 'wrong_token',
    },
    body: JSON.stringify({ update_id: 1 }),
  });
  const resFakeAuth = await handleTelegramWebhook(fakeAuthReq, env, {} as any);
  assert.equal(resFakeAuth.status, 401, 'Має блокувати підроблений токен з кодом 401');
});

test('🛡️ Захист API Metrics: перевірка валідації вхідних даних та захисту від сміттєвих запитів', async () => {
  const env: any = {
    ENVIRONMENT: 'production',
    DB: new MockD1Database(),
  };

  // 1. Підроблений Origin (CSRF захист)
  const csrfReq = new Request('https://www.mastermap.sbs/api/metrics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://evil-hacker-site.com',
    },
    body: JSON.stringify({ masterId: 1, visitor: 'a5be7814-6ca0-8028-waw0-000000000000', kind: 'view' }),
  });
  const csrfRes = await handleApiRequest(csrfReq, env);
  assert.equal(csrfRes.status, 403, 'Має повертати 403 при сторонньому Origin');

  // 2. Некоректний формат UUID відвідувача (захист від SQL/NoSQL інʼєкцій та спуфінгу)
  const badUuidReq = new Request('https://www.mastermap.sbs/api/metrics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://www.mastermap.sbs',
    },
    body: JSON.stringify({
      masterId: 1,
      visitor: "'; DROP TABLE masters; --",
      kind: 'view',
    }),
  });
  const badUuidRes = await handleApiRequest(badUuidReq, env);
  assert.equal(badUuidRes.status, 400, 'Має відхиляти інвалідний UUID з кодом 400');

  // 3. Перевищення допустимого розміру пейлоада (DoS захист)
  const hugePayload = 'a'.repeat(2000);
  const largeReq = new Request('https://www.mastermap.sbs/api/metrics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://www.mastermap.sbs',
      'Content-Length': '2000',
    },
    body: hugePayload,
  });
  const largeRes = await handleApiRequest(largeReq, env);
  assert.equal(largeRes.status, 413, 'Має повертати 413 Payload Too Large');
});

test('🛡️ Захист Медіа-файлів: перевірка допустимих символів R2 ключів', async () => {
  const env: any = {
    DB: new MockD1Database(),
  };

  // Спроба Path Traversal атаки через передачу ../../ тощо
  const pathTraversalReq = new Request('https://www.mastermap.sbs/api/media/../../../etc/passwd');
  const res = await handleApiRequest(pathTraversalReq, env);
  // Завдяки регулярному виразу /^[A-Za-z0-9:._/-]+$/ або обробці ключа
  assert.ok(res.status === 400 || res.status === 404 || res.status === 502, 'Path Traversal має безпечно блокуватися');
});
