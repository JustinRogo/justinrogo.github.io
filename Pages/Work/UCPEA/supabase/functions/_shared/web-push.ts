import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@2.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

export const vapid = {
  subject: Deno.env.get('UCPEA_VAPID_SUBJECT') ?? '',
  publicKey: Deno.env.get('UCPEA_VAPID_PUBLIC_KEY') ?? '',
  privateKey: Deno.env.get('UCPEA_VAPID_PRIVATE_KEY') ?? '',
};
const url = Deno.env.get('SUPABASE_URL');
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const secret = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
export const db = url && secret ? createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
}) : null;

export const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export type PushKeys = { endpoint: string; p256dh: string; auth_secret: string };
export type PushDevice = PushKeys & { id: string; user_id: string };

export function pushConfigured() {
  return /^[A-Za-z0-9_-]{87}$/.test(vapid.publicKey) && /^[A-Za-z0-9_-]{43}$/.test(vapid.privateKey) &&
    /^(mailto:|https:\/\/).+/.test(vapid.subject);
}

function supportedEndpoint(endpoint: string) {
  // Endpoints come from clients. Limit outgoing requests to known push services.
  if (endpoint.length > 4096) return false;
  try {
    const { protocol, hostname, port, username, password, hash, pathname } = new URL(endpoint);
    if (protocol !== 'https:' || port || username || password || hash || pathname === '/') return false;
    return (hostname === 'fcm.googleapis.com' && /^\/(wp|fcm\/send)\//.test(pathname)) ||
      (hostname === 'updates.push.services.mozilla.com' && pathname.startsWith('/wpush/')) ||
      hostname.endsWith('.push.apple.com') || hostname.endsWith('.notify.windows.com');
  } catch {
    return false;
  }
}

export async function sendWebPush({ endpoint, p256dh, auth_secret: auth }: PushKeys, data: object, ttl: number) {
  if (!supportedEndpoint(endpoint)) return 'unsupported';
  let payload;
  try {
    payload = await buildPushPayload({ data: JSON.stringify(data), options: { ttl } }, {
      endpoint, expirationTime: null, keys: { p256dh, auth },
    }, vapid);
  } catch {
    return 'failed';
  }
  let result;
  try {
    result = await fetch(endpoint, {
      ...payload,
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // A timeout can happen after the push service accepted a request.
    return 'unconfirmed';
  }
  await result.body?.cancel().catch(() => {});
  if (result.status === 404 || result.status === 410) return 'expired';
  return result.ok ? 'accepted' : 'failed';
}

export async function removeExpiredDevice(client: NonNullable<typeof db>, device: PushDevice) {
  // A handed-down device may have changed accounts while the request was in flight.
  const { error } = await client.from('push_subscriptions').delete().eq('id', device.id)
    .eq('user_id', device.user_id).eq('p256dh', device.p256dh).eq('auth_secret', device.auth_secret)
    .abortSignal(AbortSignal.timeout(5000));
  return error;
}
