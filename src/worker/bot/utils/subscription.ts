import type { Api } from 'grammy';
import type { Env } from '../../index';
import { channelUsername } from '../../config';

type BotIdentity = { botInfo: { id: number } };

const CACHE_TTL_MS = 60_000;
const memberCache = new Map<string, { value: SubscriptionStatus; expiresAt: number }>();

export function clearSubscriptionCache(): void {
  memberCache.clear();
}

export type SubscriptionStatus = 'subscribed' | 'missing' | 'unavailable';

export async function checkSubscription(api: Api, me: BotIdentity['botInfo'], env: Env, userId: number): Promise<SubscriptionStatus> {
  const channel = channelUsername(env);
  const cacheKey = `${channel}:${userId}`;
  const now = Date.now();
  const cached = memberCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;

  try {
    const botMember = await api.getChatMember(channel, me.id);
    if (botMember.status !== 'administrator' && botMember.status !== 'creator') return 'unavailable';
    const member = await api.getChatMember(channel, userId);
    const result: SubscriptionStatus =
      member.status === 'creator' || member.status === 'administrator' || member.status === 'member' || (member.status === 'restricted' && member.is_member)
        ? 'subscribed'
        : 'missing';
    memberCache.set(cacheKey, { value: result, expiresAt: now + CACHE_TTL_MS });
    return result;
  } catch (err) {
    const e = err as { error_code?: number; description?: string };
    const description = e.description || '';
    if (e.error_code === 400 && /PARTICIPANT_ID_INVALID|USER_ID_INVALID|user not found/i.test(description)) {
      return 'missing';
    }
    return 'unavailable';
  }
}
