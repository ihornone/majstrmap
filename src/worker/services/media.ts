export interface MediaServiceEnv {
  BUCKET?: R2Bucket;  
  TELEGRAM_BOT_TOKEN?: string;
}

export async function saveAvatarFromTelegram(
  bucket: R2Bucket | undefined,
  botToken: string,
  fileId: string,
  prefix: string = 'avatars'
): Promise<string> {
  if (bucket) {
    try {
      const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`;
      const metaRes = await fetch(getFileUrl);
      if (!metaRes.ok) throw new Error(`getFile failed: ${metaRes.status}`);

      const metaData = (await metaRes.json()) as {
        ok: boolean;
        result?: { file_path?: string };
        description?: string;
      };

      if (!metaData.ok || !metaData.result?.file_path) {
        throw new Error(`Telegram getFile error: ${metaData.description || 'unknown'}`);
      }

      const filePath = metaData.result.file_path;
      const extMatch = filePath.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch?.[1]?.toLowerCase() || 'jpg';

      let contentType = 'image/jpeg';
      if (ext === 'png') contentType = 'image/png';
      else if (ext === 'webp') contentType = 'image/webp';

      const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
      const downloadRes = await fetch(downloadUrl);
      if (!downloadRes.ok) throw new Error(`download failed: ${downloadRes.status}`);

      const arrayBuffer = await downloadRes.arrayBuffer();

      const uniqueKey = `${prefix}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await bucket.put(uniqueKey, arrayBuffer, {
        httpMetadata: { contentType },
      });

      return uniqueKey;
    } catch (err) {
      console.error('[media] R2 save failed, falling back to file_id proxy:', err);
    }
  }

  return `tg:${fileId}`;
}

export async function serveMedia(
  bucket: R2Bucket | undefined,
  key: string,
  botToken?: string
): Promise<Response> {
  if (key.startsWith('tg:')) {
    const fileId = key.slice(3);
    if (!botToken) {
      return new Response('Media temporarily unavailable', { status: 503 });
    }

    const cache = (caches as any).default as Cache;
    const cacheUrl = new URL(`https://media.internal/${key}`);
    const cached = await cache.match(cacheUrl);
    if (cached) {
      return cached;
    }

    try {
      const metaRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
      );
      const metaData = (await metaRes.json()) as {
        ok: boolean;
        result?: { file_path?: string };
      };
      if (!metaData.ok || !metaData.result?.file_path) {
        return new Response('Image Not Found', { status: 404 });
      }

      const filePath = metaData.result.file_path;
      const downloadRes = await fetch(
        `https://api.telegram.org/file/bot${botToken}/${filePath}`
      );
      if (!downloadRes.ok) {
        return new Response('Image Not Found', { status: 404 });
      }

      const contentType = downloadRes.headers.get('content-type') || 'image/jpeg';
      const headers = new Headers({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });

      const response = new Response(downloadRes.body, { headers });

      if (response.status === 200) {
        await cache.put(cacheUrl, response.clone());
      }

      return response;
    } catch (err) {
      console.error('[media] Telegram proxy failed:', err);
      return new Response('Image Not Found', { status: 404 });
    }
  }

  if (!bucket) {
    return new Response('Storage Not Configured', { status: 503 });
  }

  const object = await bucket.get(key);
  if (!object) {
    return new Response('Image Not Found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  if (!headers.get('content-type')) {
    headers.set('content-type', 'image/jpeg');
  }

  return new Response(object.body, { headers });
}
