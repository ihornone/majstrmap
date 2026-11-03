import type { Availability } from '../../shared/master-tools';
import type { WorkConditions } from '../../shared/work-conditions';
import type { MasterContacts } from "../../shared/contacts";
export interface ApiCategory {
  id: string;
  name: string;
  is_custom: number;
  approved: number;
}

export interface ApiMasterService {
  id: number;
  name: string;
  price: string;
}

export interface ApiReview {
  id: number;
  client_name: string;
  collaboration_confirmed?: number;
  rating: number;
  text?: string | null;
  created_at: string;
}

export interface ApiMaster {
  id: number;
  slug: string;
  name: string;
  region_id: string;
  city: string;
  category_primary: string;
  category_primary_name?: string;
  category_secondary?: string | null;
  price_min?: number | null;
  work_conditions?: WorkConditions;
  availability?: Availability;
  contacts: MasterContacts;
  avatar_key?: string | null;
  description: string;
  about?: string | null;
  experience_years: number;
  rating: number;
  reviews_count: number;
  status: string;
  services?: ApiMasterService[];
  reviews?: ApiReview[];
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number };

const REQUEST_TIMEOUT_MS = 15000;

async function request<T>(
  url: string,
  init?: RequestInit & { json?: unknown }
): Promise<ApiResult<T>> {
  try {
    const { json, ...rest } = init ?? {};
    const res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { 'Content-Type': 'application/json', ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function fetchRegionStats(): Promise<ApiResult<Record<string, number>>> {
  const res = await request<{ ok: boolean; stats?: Record<string, number> }>('/api/regions/stats', { cache: 'no-store' });
  if (!res.ok) return res;
  return { ok: true, data: res.data.stats || {} };
}

export async function fetchRegionFilters(regionId: string): Promise<ApiResult<{ cities: string[]; categories: ApiCategory[]; emergencyCategories: string[] }>> {
  const res = await request<{ ok: boolean; cities?: string[]; categories?: ApiCategory[]; emergencyCategories?: string[] }>(
    `/api/regions/${encodeURIComponent(regionId)}/filters`
  );
  if (!res.ok) return res;
  return {
    ok: true,
    data: { cities: res.data.cities || [], categories: res.data.categories || [], emergencyCategories: res.data.emergencyCategories || [] },
  };
}

export async function fetchMasters(params: {
  region?: string;
  category?: string;
  city?: string;
  sort?: string;
  visits?: boolean;
  sunday?: boolean;
  emergency?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ApiResult<{ masters: ApiMaster[]; total: number }>> {
  const query = new URLSearchParams();
  for (const key of ['visits','sunday','emergency'] as const) if (params[key]) query.set(key,'1');
  if (params.region) query.set('region', params.region);
  if (params.category && params.category !== 'all') query.set('category', params.category);
  if (params.city && params.city !== 'all') query.set('city', params.city);
  if (params.sort) query.set('sort', params.sort);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const res = await request<{ ok: boolean; masters?: ApiMaster[]; total?: number }>(`/api/masters?${query.toString()}`);
  if (!res.ok) return res;
  return { ok: true, data: { masters: res.data.masters || [], total: res.data.total || 0 } };
}

export async function fetchMasterBySlug(slug: string): Promise<ApiResult<ApiMaster>> {
  const res = await request<{ ok: boolean; master?: ApiMaster }>(`/api/masters/${encodeURIComponent(slug)}`);
  if (!res.ok) return res;
  return { ok: true, data: res.data.master as ApiMaster };
}

export async function fetchMastersBySlugs(slugs: string[]): Promise<ApiResult<{ masters: ApiMaster[] }>> {
  const res = await request<{ ok: boolean; masters?: ApiMaster[] }>('/api/masters/by-slugs', {
    method: 'POST',
    json: { slugs: slugs.slice(0, 100) },
  });
  if (!res.ok) return res;
  return { ok: true, data: { masters: res.data.masters || [] } };
}

export function getAvatarUrl(avatarKey?: string | null): string | null {
  if (!avatarKey) return null;
  if (avatarKey.startsWith('https://')) return avatarKey;
  if (avatarKey.startsWith('http://')) return null;
  return `/api/media/${avatarKey}`;
}
