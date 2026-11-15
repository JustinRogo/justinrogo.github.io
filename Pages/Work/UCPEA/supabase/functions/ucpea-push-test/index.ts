import { db, pushConfigured, removeExpiredDevice, sendWebPush, uuid, vapid } from '../_shared/web-push.ts';
import type { PushKeys } from '../_shared/web-push.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
};

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { headers, status });
}

async function handle(request: Request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const token = /^Bearer (\S+)$/i.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return json({ error: 'Sign in first.' }, 401);
  if (!db || !pushConfigured()) {
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
  }).single<PushKeys>();
  if (error?.code === 'PT404') return json({ error: 'No active subscription for this account.' }, 404);
  if (error?.code === 'PT429') return json({ error: 'Wait one minute between tests.' }, 429);
  if (error || !subscription) throw error || new Error('Subscription lookup failed.');
  const result = await sendWebPush(subscription, { type: 'test' }, 120);
  if (result === 'unsupported') {
    return json({ error: 'This device’s push provider is unsupported.' }, 422);
  }

  if (result === 'expired') {
    const cleanupError = await removeExpiredDevice(db, { ...subscription, id: subscriptionId, user_id: user.id });
    if (cleanupError) throw cleanupError;
    return json({ error: 'This device subscription has expired.' }, 410);
  }
  if (result !== 'accepted') return json({ error: 'The push provider could not accept the test.' }, 502);

  // The push service accepted the request. Only the device can confirm it displayed an alert.
  const { error: recordError } = await db.from('push_subscriptions')
    .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
    .eq('id', subscriptionId).eq('user_id', user.id).eq('p256dh', subscription.p256dh).eq('auth_secret', subscription.auth_secret);
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
