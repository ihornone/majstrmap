import { CONTACT_KINDS } from '../../shared/contacts';
import { todayKyiv } from '../../shared/master-tools';
import { minServicePrice } from '../../shared/pricing';
import type { Master, Review } from '../db/types';
import { CategoriesRepository } from '../db/categories.repo';
import { MastersRepository } from '../db/masters.repo';
import { ServicesRepository } from '../db/services.repo';
import { ReviewsRepository } from '../db/reviews.repo';
import { PortfolioRepository } from '../db/portfolio.repo';
import { serveMedia } from '../services/media';
import { verifyTurnstileToken } from '../services/turnstile';

export interface ApiEnv {
  DB: D1Database;
  METRICS_LIMITER?: RateLimit;
  MEDIA_LIMITER?: RateLimit;
  CONTACTS_LIMITER?: RateLimit;
  BUCKET?: R2Bucket;
  TELEGRAM_BOT_TOKEN?: string;
  TURNSTILE_SECRET_KEY?: string;
}

const MAX_PAGE_SIZE = 100;

function createInMemoryRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (ip: string): boolean => {
    const now = Date.now();
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    }
    const entry = hits.get(ip);
    if (!entry || entry.resetAt < now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return false;
    }
    entry.count++;
    return entry.count > limit;
  };
}
const metricsRateLimited = createInMemoryRateLimiter(30, 60_000);
const mediaRateLimited = createInMemoryRateLimiter(60, 60_000);
const contactsRateLimited = createInMemoryRateLimiter(10, 60_000);

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toPublicMaster(m: Master, categoryName?: string, priceMin?: number | null) {
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    region_id: m.region_id,
    city: m.city,
    category_primary: m.category_primary,
    category_secondary: m.category_secondary,
    category_primary_name: categoryName || m.category_primary,
    price_min: priceMin ?? null,
    avatar_key: m.avatar_key,
    description: m.description,
    about: m.about,
    experience_years: m.experience_years,
    rating: m.rating,
    reviews_count: m.reviews_count,
    work_conditions: safeParseJson(m.work_conditions, {}),
    availability: safeParseJson(m.availability, {}),
  };
}

function toPublicReview(r: Review) {
  // З міркувань приватності показуємо тільки перше ім'я або першу літеру прізвища (Олександр М.)
  const rawName = (r.client_name || 'Клієнт').trim();
  const parts = rawName.split(/\s+/);
  const first = parts[0] || 'Клієнт';
  const second = parts[1];
  const safeName = second && second.length > 0
    ? `${first} ${second.charAt(0).toUpperCase()}.`
    : first;

  return {
    id: r.id,
    client_name: safeName,
    rating: r.rating,
    text: r.text,
    created_at: r.created_at,
    collaboration_confirmed: r.collaboration_confirmed,
  };
}

const MEDIA_KEY_RE = /^[A-Za-z0-9:._/-]+$/;

export async function handleApiRequest(request: Request, env: ApiEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.startsWith('/api/media/')) {
    const key = path.slice('/api/media/'.length);
    if (!key || key.length > 512 || !MEDIA_KEY_RE.test(key)) {
      return Response.json({ ok: false, error: 'invalid_media_key' }, { status: 400 });
    }
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (env.MEDIA_LIMITER) {
      const { success } = await env.MEDIA_LIMITER.limit({ key: ip });
      if (!success) return new Response(null, { status: 429 });
    } else if (mediaRateLimited(ip)) {
      return new Response(null, { status: 429 });
    }
    try {
      return await serveMedia(env.BUCKET, key, env.TELEGRAM_BOT_TOKEN);
    } catch (err) {
      console.error('[media] serving failed:', err);
      return Response.json({ ok: false, error: 'media_upstream_error' }, { status: 502 });
    }
  }

  if (path === '/api/metrics' && request.method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (env.METRICS_LIMITER) {
      const { success } = await env.METRICS_LIMITER.limit({ key: ip });
      if (!success) return new Response(null, { status: 429 });
    } else if (metricsRateLimited(ip)) {
      return new Response(null, { status: 429 });
    }
    if (request.headers.get('Origin') !== url.origin) return new Response(null, { status: 403 });
    if (Number(request.headers.get('Content-Length') || 0) > 1000) return new Response(null, { status: 413 });
    let event: { masterId?: number; visitor?: string; kind?: string; contact?: string };
    try { const raw = await request.text(); if (raw.length > 1000) return new Response(null, { status: 413 }); event = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
    if (!Number.isInteger(event.masterId) || !event.visitor || !/^[a-f0-9-]{36}$/i.test(event.visitor) || !['view', 'contact'].includes(event.kind || '') || (event.kind === 'contact' && !CONTACT_KINDS.includes(event.contact as typeof CONTACT_KINDS[number]))) return new Response(null, { status: 400 });
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${todayKyiv()}:${event.visitor}`));
    const visitor = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
    await env.DB.prepare(`INSERT OR IGNORE INTO master_metrics (master_id,visitor_key,event_kind,contact_kind,day) SELECT id,?,?,?,? FROM masters WHERE id=? AND status='active'`).bind(visitor, event.kind, event.kind === 'contact' ? event.contact : '', todayKyiv(), event.masterId).run();
    return new Response(null, { status: 204 });
  }

  if (path === '/api/categories' && request.method === 'GET') {
    const repo = new CategoriesRepository(env.DB);
    const categories = await repo.listApproved();
    return Response.json({ ok: true, categories }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600',
      },
    });
  }

  if (path === '/api/stats/overview' && request.method === 'GET') {
    const nowSec = Math.floor(Date.now() / 1000);
    const onlineThreshold = nowSec - 180; // 3 хвилини

    // 1. Кількість активних майстрів
    const mastersRow = await env.DB.prepare("SELECT COUNT(*) as c FROM masters WHERE status = 'active'").first<{ c: number }>();
    const totalMasters = mastersRow?.c ?? 0;

    // 2. Кількість онлайн (користувачі з сигналом активності за останні 3 хв)
    const onlineRow = await env.DB.prepare("SELECT COUNT(*) as c FROM site_heartbeats WHERE last_seen >= ?").bind(onlineThreshold).first<{ c: number }>();
    // Завжди як мінімум 1 (той хто робить запит)
    const onlineCount = Math.max(1, onlineRow?.c ?? 1);

    // 3. Загальна кількість відвідувачів сайту (за весь час)
    const totalVisitorsRow = await env.DB.prepare("SELECT val FROM site_stats WHERE key = 'total_visitors'").first<{ val: number }>();
    const totalVisitors = totalVisitorsRow?.val ?? 1;

    return Response.json({
      ok: true,
      stats: {
        totalMasters,
        totalVisitors,
        onlineCount,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  if (path === '/api/stats/heartbeat' && request.method === 'POST') {
    let visitorId = '';
    let isNewVisitor = false;
    try {
      const data = (await request.json()) as { visitor?: string; isNew?: boolean };
      visitorId = data.visitor || '';
      isNewVisitor = Boolean(data.isNew);
    } catch {}

    if (!visitorId || !/^[a-f0-9-]{36}$/i.test(visitorId)) {
      return new Response(null, { status: 400 });
    }

    const nowSec = Math.floor(Date.now() / 1000);

    const statements: D1PreparedStatement[] = [
      env.DB.prepare('INSERT INTO site_heartbeats (visitor_key, last_seen) VALUES (?, ?) ON CONFLICT(visitor_key) DO UPDATE SET last_seen = ?')
        .bind(visitorId, nowSec, nowSec),
    ];

    if (isNewVisitor) {
      statements.push(
        env.DB.prepare("UPDATE site_stats SET val = val + 1 WHERE key = 'total_visitors'")
      );
    }

    // Періодичне очищення старих записів старше 1 години
    if (Math.random() < 0.05) {
      statements.push(
        env.DB.prepare('DELETE FROM site_heartbeats WHERE last_seen < ?').bind(nowSec - 3600)
      );
    }

    await env.DB.batch(statements);
    return new Response(null, { status: 204 });
  }

  if (path === '/api/regions/stats' && request.method === 'GET') {
    const repo = new MastersRepository(env.DB);
    const stats = await repo.getRegionStats();
    return Response.json({ ok: true, stats }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  const filtersMatch = path.match(/^\/api\/regions\/([a-zA-Z0-9_-]+)\/filters$/);
  if (filtersMatch && request.method === 'GET') {
    const regionId = filtersMatch[1];
    if (!regionId) return Response.json({ ok: false, error: 'Invalid region' }, { status: 400 });
    const filters = await new MastersRepository(env.DB).getRegionFilters(regionId);
    return Response.json({ ok: true, ...filters });
  }

  if (path === '/api/masters' && request.method === 'GET') {
    const repo = new MastersRepository(env.DB);
    const regionId = url.searchParams.get('region') || undefined;
    const categoryId = url.searchParams.get('category') || undefined;
    const city = url.searchParams.get('city') || undefined;
    const sort = (url.searchParams.get('sort') as any) || 'rating';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, MAX_PAGE_SIZE);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);

    const { masters, total } = await repo.getFiltered({
      regionId,
      categoryId,
      city,
      sort,
      limit,
      offset,
    });

    const categoryNames = new Map((await new CategoriesRepository(env.DB).listApproved()).map((c) => [c.id, c.name]));
    const ids = masters.map((m) => m.id);
    const priceMinByMaster = new Map<number, number | null>();
    if (ids.length) {
      const { results: priceRows } = await env.DB
        .prepare(`SELECT master_id, price FROM services WHERE master_id IN (${ids.map(() => '?').join(',')})`)
        .bind(...ids)
        .all<{ master_id: number; price: string }>();
      for (const id of ids) {
        priceMinByMaster.set(id, minServicePrice(priceRows.filter((r) => r.master_id === id)));
      }
    }
    const parsedMasters = masters.map((m) => toPublicMaster(m, categoryNames.get(m.category_primary), priceMinByMaster.get(m.id) ?? null));

    return Response.json({ ok: true, masters: parsedMasters, total });
  }

  if (path === '/api/masters/by-slugs' && request.method === 'POST') {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }
    const slugs = (body as { slugs?: unknown } | null)?.slugs;
    if (!Array.isArray(slugs) || slugs.length === 0 || slugs.length > 100 || slugs.some((s) => typeof s !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(s))) {
      return Response.json({ ok: false, error: 'Invalid slugs' }, { status: 400 });
    }
    const masters = await new MastersRepository(env.DB).getBySlugs(slugs as string[]);
    const ids = masters.map((m) => m.id);
    const priceMinByMaster = new Map<number, number | null>();
    if (ids.length) {
      const { results: priceRows } = await env.DB
        .prepare(`SELECT master_id, price FROM services WHERE master_id IN (${ids.map(() => '?').join(',')})`)
        .bind(...ids)
        .all<{ master_id: number; price: string }>();
      for (const id of ids) {
        priceMinByMaster.set(id, minServicePrice(priceRows.filter((r) => r.master_id === id)));
      }
    }
    const categoryNames = new Map((await new CategoriesRepository(env.DB).listApproved()).map((c) => [c.id, c.name]));
    return Response.json({
      ok: true,
      masters: masters.map((m) => toPublicMaster(m, categoryNames.get(m.category_primary), priceMinByMaster.get(m.id) ?? null)),
    });
  }

  // Контакти (телефони тощо) віддаємо лише за валідним Turnstile-токеном:
  // у списках вище їх немає, тож бот не може зібрати номери curl'ом.
  const contactsMatch = path.match(/^\/api\/masters\/([a-zA-Z0-9_-]+)\/contacts$/);
  if (contactsMatch && request.method === 'GET') {
    const slug = contactsMatch[1];
    if (!slug) return Response.json({ ok: false, error: 'Master not found' }, { status: 404 });
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return new Response(null, { status: 403 });
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (env.CONTACTS_LIMITER) {
      const { success } = await env.CONTACTS_LIMITER.limit({ key: ip });
      if (!success) return new Response(null, { status: 429 });
    } else if (contactsRateLimited(ip)) {
      return new Response(null, { status: 429 });
    }
    const token = request.headers.get('cf-turnstile-token') ?? url.searchParams.get('cf_token');
    const verified = await verifyTurnstileToken(env, token, ip === 'unknown' ? null : ip);
    if (!verified) return Response.json({ ok: false, error: 'turnstile_failed' }, { status: 403 });
    const master = await new MastersRepository(env.DB).getBySlug(slug);
    if (!master) {
      return Response.json({ ok: false, error: 'Master not found' }, { status: 404 });
    }
    return Response.json({ ok: true, contacts: safeParseJson(master.contacts, {}) }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  const masterMatch = path.match(/^\/api\/masters\/([a-zA-Z0-9_-]+)$/);
  if (masterMatch && request.method === 'GET') {
    const slug = masterMatch[1];
    if (!slug) return Response.json({ ok: false, error: 'Master not found' }, { status: 404 });
    const mastersRepo = new MastersRepository(env.DB);
    const servicesRepo = new ServicesRepository(env.DB);
    const reviewsRepo = new ReviewsRepository(env.DB);

    const master = await mastersRepo.getBySlug(slug);
    if (!master) {
      return Response.json({ ok: false, error: 'Master not found' }, { status: 404 });
    }

    const [services, reviews, portfolio] = await Promise.all([
      servicesRepo.getByMasterId(master.id),
      reviewsRepo.getByMasterId(master.id, 50),
      new PortfolioRepository(env.DB).getByMasterId(master.id, true),
    ]);

    const category = await new CategoriesRepository(env.DB).getById(master.category_primary);
    return Response.json({
      ok: true,
      master: {
        ...toPublicMaster(master, category?.name, minServicePrice(services)),
        services,
        reviews: reviews.map(toPublicReview),
        portfolio: portfolio.map((p) => ({
          id: p.id,
          title: p.title,
          image_key: p.image_key,
          imageUrl: `/api/media/${encodeURI(p.image_key)}`,
          description: p.description,
          tag: p.tag,
        })),
      },
    });
  }

  return Response.json({ ok: false, error: 'API route not found' }, { status: 404 });
}
