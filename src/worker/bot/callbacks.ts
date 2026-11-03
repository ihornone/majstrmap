export interface BotCallback {
  domain: 'reg' | 'master' | 'review' | 'admin' | 'cron' | 'client';
  action: string;
  id?: string;
  val?: string | number;
}

export function packCallback(data: BotCallback): string {
  const json=JSON.stringify(data);
  if(new TextEncoder().encode(json).length<=64)return json;
  const compact=JSON.stringify({d:data.domain,a:data.action,...(data.id?{i:data.id}:{}),...(data.val!==undefined?{v:data.val}:{})});
  if(new TextEncoder().encode(compact).length>64)throw new Error('Callback data is too long');
  return compact;
}

export function unpackCallback(payload: string): BotCallback | null {
  try {
    let parsed = JSON.parse(payload);
    if(parsed?.d && parsed?.a)parsed={domain:parsed.d,action:parsed.a,id:parsed.i,val:parsed.v};
    if (parsed && typeof parsed.domain === 'string' && typeof parsed.action === 'string') {
      return parsed as BotCallback;
    }
    return null;
  } catch {
    return null;
  }
}
