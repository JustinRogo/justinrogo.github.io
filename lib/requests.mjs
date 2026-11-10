import { createHmac } from 'node:crypto';

// Keep these limits in step with supabase/migrations/20261109_site_requests.sql
// and the form's maxLength attributes.
export const REQUEST_LIMITS = { name: 100, email: 254, subject: 150, details: 5000 };
export const MIN_FILL_MS = 2000;
const MAX_LINKS = 3;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const DEFAULT_ORIGINS = [
  'https://justinrogo.github.io',
  'https://justinrogo.vercel.app',
  'http://127.0.0.1:4388', 'http://localhost:4388',
  'http://127.0.0.1:4391', 'http://localhost:4391',
  'http://127.0.0.1:4392', 'http://localhost:4392',
];
export function allowedOrigins(env = process.env) {
  const extra = String(env.REQUESTS_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, env.UPDATES_SITE_URL, ...extra].filter(Boolean).map(value => value.replace(/\/+$/, '')));
}

const invalid = message => Object.assign(new Error(message), { status: 400 });
// Single-line fields: no control characters, collapsed whitespace.
const line = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
// Details keep line breaks and tabs but drop other control characters.
const text = value => String(value ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\n{4,}/g, '\n\n\n').trim();

/** Validates a submission and returns the row to insert. Throws a 400 error with a readable message. */
export function normalizeRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalid('The request could not be read.');
  const row = { name: line(body.name), email: line(body.email).toLowerCase(), subject: line(body.subject), details: text(body.details) };
  if (!row.name) throw invalid('Enter your name.');
  if (!row.email || !EMAIL.test(row.email)) throw invalid('Enter a valid email address.');
  if (!row.subject) throw invalid('Enter a subject.');
  if (!row.details) throw invalid('Tell me a little about your request.');
  for (const [field, limit] of Object.entries(REQUEST_LIMITS)) {
    if (row[field].length > limit) throw invalid(`The ${field === 'details' ? 'message' : field} can be up to ${limit.toLocaleString('en-US')} characters.`);
  }
  if ((`${row.subject} ${row.details}`.match(/https?:\/\/|www\./gi) || []).length > MAX_LINKS) {
    throw invalid(`Please include no more than ${MAX_LINKS} links.`);
  }
  return row;
}

/** Spam signals that need no sign-in: a filled honeypot or a form sent faster than a person could fill it. */
export function spamSignal(body) {
  if (String(body?.website ?? '').trim()) return 'honeypot';
  const elapsed = Number(body?.elapsed);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) return 'too-fast';
  return null;
}

export function clientAddress(headers = {}) {
  const forwarded = String(headers['x-forwarded-for'] || '').split(',')[0].trim();
  return String(headers['x-real-ip'] || '').trim() || forwarded || null;
}

/** A salted hash lets the database throttle repeat senders without storing their address. */
export function clientHash(address, salt) {
  if (!address || !salt) return null;
  return createHmac('sha256', salt).update(address).digest('hex');
}
