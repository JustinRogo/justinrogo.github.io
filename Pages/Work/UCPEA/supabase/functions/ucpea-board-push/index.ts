import { db, pushConfigured, removeExpiredDevice, sendWebPush, uuid } from '../_shared/web-push.ts';
import type { PushDevice } from '../_shared/web-push.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

type ClaimedDevice = PushDevice & { claim_id: string };
type PreparedPush = Record<string, unknown> & { batch?: ClaimedDevice[] };

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { headers, status });
}

async function handle(request: Request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const token = /^Bearer (\S+)$/i.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return json({ error: 'Sign in first.' }, 401);
  const client = db;
  if (!client || !pushConfigured()) return json({ error: 'Notifications are unavailable.' }, 503);
  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user) return json({ error: 'Sign in again.' }, 401);

  const body = await request.json().catch(() => null);
  const { postId, action, version } = body || {};
  if (typeof postId !== 'string' || !uuid.test(postId) || !['status', 'start', 'resume'].includes(action) ||
      typeof version !== 'string' || !Number.isFinite(Date.parse(version))) {
    return json({ error: 'A valid post and notification action are required.' }, 400);
  }

  const { data, error } = await client.rpc('prepare_board_push', {
    p_actor: user.id,
    p_post: postId,
    p_action: action,
    p_version: version,
  });
  if (error && /^PT(400|403|404|409|429)$/.test(error.code)) {
    return json({ error: error.message }, Number(error.code.slice(2)));
  }
  if (error || !data) throw error || new Error('Notification status unavailable.');
  const { batch, ...summary } = data as PreparedPush;
  if (!batch?.length) return json(summary);

  const results = await Promise.all(batch.map(async device => {
    const result = await sendWebPush(device, { type: 'board', postId }, 3600);
    if (result === 'expired') {
      try {
        const cleanupError = await removeExpiredDevice(client, device);
        if (cleanupError) console.error('Could not remove an expired push subscription.', cleanupError.code);
      } catch {
        console.error('Could not remove an expired push subscription.');
      }
    }
    const status = result === 'accepted' || result === 'unconfirmed' ? result : 'failed';
    return { claim_id: device.claim_id, status };
  }));

  const { data: recorded, error: recordError } = await client.rpc('finish_board_push', {
    p_post: postId, p_results: results,
  });
  if (recordError || !recorded) throw recordError || new Error('Notification result unavailable.');
  return json(recorded as Record<string, unknown>);
}

Deno.serve(async request => {
  try {
    return await handle(request);
  } catch {
    // Provider errors can contain subscription URLs. Keep them out of logs and responses.
    return json({ error: 'Could not complete the notification request.' }, 502);
  }
});
