import { createClient } from '@supabase/supabase-js';
import { isPublishableKey } from '../lib/updates.mjs';
import { allowedOrigins, clientAddress, clientHash, normalizeRequest, spamSignal } from '../lib/requests.mjs';

const fail = (status, message) => Object.assign(new Error(message), { status });

// Public, sign-in free request form. The browser posts here (cross-origin from
// GitHub Pages); this route checks spam signals and inserts with the publishable
// key, so the database's anonymous insert-only policy and throttle trigger apply.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Origin');
  try {
    const origin = req.headers.origin;
    const permitted = origin && allowedOrigins().has(origin);
    if (permitted) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') return res.status(permitted ? 204 : 403).send('');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      throw fail(405, 'Use POST to send a request.');
    }
    // Browsers always send Origin on cross-origin and same-origin POSTs.
    if (!permitted) throw fail(403, 'Requests can only be sent from the website.');
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw fail(415, 'Send the request as JSON.');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const signal = spamSignal(body);
    // Pretend a honeypot submission worked so bots learn nothing; ask people who were too fast to retry.
    if (signal === 'honeypot') return res.status(201).json({ ok: true });
    if (signal === 'too-fast') throw fail(400, 'That was quick! Please check your request and send it again.');
    let row;
    try { row = normalizeRequest(body); } catch (error) { throw fail(400, error.message); }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !isPublishableKey(key)) throw fail(503, 'Requests are not available right now. Please email me instead.');
    const salt = process.env.REQUESTS_HASH_SALT || key;
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // No .select(): anonymous visitors may insert but never read rows back.
    const { error } = await client.from('site_requests').insert({ ...row, client_hash: clientHash(clientAddress(req.headers), salt) });
    if (error) {
      if (error.message?.includes('site_requests_rate_limited')) throw fail(429, 'Too many requests have been sent recently. Please try again later.');
      if (['42P01', 'PGRST205'].includes(error.code)) throw fail(503, 'Requests are not available right now. Please email me instead.');
      if (error.code === '23514') throw fail(400, 'Please check your request and try again.');
      console.error('Request insert failed:', error.code);
      throw fail(502, 'Your request could not be saved. Please try again.');
    }
    return res.status(201).json({ ok: true });
  } catch (error) {
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    if (status === 500) console.error('Request submission failed:', error.name);
    return res.status(status).json({ error: status === 500 ? 'Your request could not be sent. Please try again.' : (error instanceof SyntaxError ? 'The request could not be read.' : error.message) });
  }
}
