import { db, pushConfigured, removeExpiredDevice, sendWebPush } from '../_shared/web-push.ts';
import type { PushDevice } from '../_shared/web-push.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

type Claim = { status: 'not_pending' | 'already_sent' | 'limited' } | { status: 'send'; devices: PushDevice[] };

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
  // Anyone can start a sign-up with any address. Only alert staff once the
  // person has proved they own it.
  if (!user.email_confirmed_at) return json({ error: 'Confirm your email first.' }, 403);

  const { data, error } = await client.rpc('claim_signup_push', { p_user: user.id });
  if (error || !data) throw error || new Error('Sign-up alert unavailable.');
  const claim = data as Claim;
  if (claim.status !== 'send') return json({ status: claim.status });

  const counts = { accepted: 0, failed: 0 };
  // Send in small groups so a large staff list does not open hundreds of
  // connections at once.
  for (let start = 0; start < claim.devices.length; start += 20) {
    await Promise.all(claim.devices.slice(start, start + 20).map(async device => {
      // A day of TTL: staff whose phone is off still hear about it when it wakes.
      const result = await sendWebPush(device, { type: 'signup' }, 86400);
      if (result === 'expired') {
        try {
          const cleanupError = await removeExpiredDevice(client, device);
          if (cleanupError) console.error('Could not remove an expired push subscription.', cleanupError.code);
        } catch {
          console.error('Could not remove an expired push subscription.');
        }
      }
      ++counts[result === 'accepted' ? 'accepted' : 'failed'];
    }));
  }
  return json({ status: 'sent', ...counts });
}

Deno.serve(async request => {
  try {
    return await handle(request);
  } catch {
    // Provider errors can contain subscription URLs. Keep them out of logs and responses.
    return json({ error: 'Could not complete the notification request.' }, 502);
  }
});
