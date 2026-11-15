import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@2.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
};

const vapid = {
  subject: Deno.env.get('UCPEA_VAPID_SUBJECT') ?? '',
  publicKey: Deno.env.get('UCPEA_VAPID_PUBLIC_KEY') ?? '',
  privateKey: Deno.env.get('UCPEA_VAPID_PRIVATE_KEY') ?? '',
};
const url = Deno.env.get('SUPABASE_URL');
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const secret = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const db = url && secret ? createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
}) : null;

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { headers, status });
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

async function handle(request: Request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const token = /^Bearer (\S+)$/i.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return json({ error: 'Sign in first.' }, 401);
  if (!db || !/^[A-Za-z0-9_-]{87}$/.test(vapid.publicKey) || !/^[A-Za-z0-9_-]{43}$/.test(vapid.privateKey) ||
      !/^(mailto:|https:\/\/).+/.test(vapid.subject)) {
    return json({ error: 'Push notifications are unavailable.' }, 503);
  }

  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (!user || authError) return json({ error: 'Sign in again.' }, 401);

  if (request.method === 'GET') {
    const { data, error } = await db.from('profiles').select('status').eq('id', user.id).maybeSingle();
    if (error) throw error;
    return data?.status === 'active'
      ? json({ publicKey: vapid.publicKey })
      : json({ error: 'Only approved members can turn on notifications.' }, 403);
  }

  const body = await request.json().catch(() => null);
  const subscriptionId = body?.subscriptionId;
  if (typeof subscriptionId !== 'string' || !uuid.test(subscriptionId)) {
    return json({ error: 'A valid device subscription is required.' }, 400);
  }

  const { data: subscription, error } = await db.rpc('claim_push_test', {
    p_user: user.id,
    p_subscription: subscriptionId,
  }).single<{ endpoint: string; p256dh: string; auth_secret: string }>();
  if (error?.code === 'PT404') return json({ error: 'No active subscription for this account.' }, 404);
  if (error?.code === 'PT429') return json({ error: 'Wait one minute between tests.' }, 429);
  if (error) throw error;
  if (!subscription || !supportedEndpoint(subscription.endpoint)) {
    return json({ error: 'This device’s push provider is unsupported.' }, 422);
  }

  const { endpoint, p256dh, auth_secret: auth } = subscription;
  const payload = await buildPushPayload({ data: JSON.stringify({ type: 'test' }), options: { ttl: 120 } }, {
    endpoint,
    expirationTime: null,
    keys: { p256dh, auth },
  }, vapid);
  const result = await fetch(endpoint, {
    ...payload,
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  await result.body?.cancel().catch(() => {});

  // A handed-down device may have changed accounts while the request was in flight.
  const row = db.from('push_subscriptions');
  if (result.status === 404 || result.status === 410) {
    const { error: cleanupError } = await row.delete().eq('id', subscriptionId)
      .eq('user_id', user.id).eq('p256dh', p256dh).eq('auth_secret', auth);
    if (cleanupError) throw cleanupError;
    return json({ error: 'This device subscription has expired.' }, 410);
  }
  if (!result.ok) return json({ error: 'The push provider could not accept the test.' }, 502);

  // The push service accepted the request. Only the device can confirm it displayed an alert.
  const { error: recordError } = await row.update({ last_success_at: new Date().toISOString(), failure_count: 0 })
    .eq('id', subscriptionId).eq('user_id', user.id).eq('p256dh', p256dh).eq('auth_secret', auth);
  if (recordError) console.error('Could not record test acceptance.', recordError.code);
  return json({ sent: true });
}

Deno.serve(async request => {
  try {
    return await handle(request);
  } catch {
    // Provider errors can contain subscription URLs. Keep them out of logs and responses.
    return json({ error: 'Could not complete the notification request.' }, 502);
  }
});
