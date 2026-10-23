import sanitizeHtml from 'sanitize-html';
import { decodeHTML } from 'entities';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isPublishableKey(key) {
  if (typeof key !== 'string') return false;
  if (key.startsWith('sb_publishable_')) return true;
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; }
  catch { return false; }
}
export function cleanBody(html) {
  return sanitizeHtml(String(html || ''), {
    allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img'],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    exclusiveFilter: frame => frame.tag === 'img' && !frame.attribs.src,
    transformTags: {
      a: (tag, attrs) => ({ tagName: tag, attribs: { ...attrs, target: '_blank', rel: 'noopener noreferrer' } })
    },
    enforceHtmlBoundary: true
  });
}
export function plainText(html) {
  return decodeHTML(sanitizeHtml(String(html || '').replace(/<\/(?:p|h[1-6]|li|blockquote)>/gi, ' '), {
    allowedTags: [], allowedAttributes: {}
  })).replace(/\s+/g, ' ').trim();
}
export function normalizePost(value) {
  if (!value || typeof value !== 'object') throw new Error('Enter a post title and some text.');
  const title = String(value.title || '').trim();
  const input = String(value.body || '');
  if (!title || title.length > 180) throw new Error('Use a title between 1 and 180 characters.');
  if (input.length > 100000) throw new Error('This post is too long. Keep it under 100,000 characters.');
  const body = cleanBody(input);
  if (!plainText(body) && !body.includes('<img ')) throw new Error('Write something before saving the post.');
  if (!['draft', 'published'].includes(value.status)) throw new Error('Choose draft or published.');
  const excerpt = String(value.excerpt || '').trim();
  if (excerpt.length > 500) throw new Error('Keep the preview under 500 characters.');
  return {
    title, body, excerpt: excerpt || plainText(body).slice(0, 260), status: value.status,
    pinned: value.pinned === true, comments_enabled: value.comments_enabled !== false
  };
}
export function publicPost(post) {
  const { author_id, ...safe } = post;
  return { ...safe, body: cleanBody(post.body) };
}
export function xml(value) {
  return String(value ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]))
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}
export function makeFeed(posts, siteUrl) {
  const site = new URL(siteUrl).origin;
  const items = posts.filter(post => post.status === 'published' && post.published_at)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at)).map(post => {
      const url = `${site}/updates?post=${encodeURIComponent(post.id)}`;
      return `<item><title>${xml(post.title)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid><pubDate>${new Date(post.published_at).toUTCString()}</pubDate><description>${xml(post.excerpt)}</description><content:encoded>${xml(cleanBody(post.body))}</content:encoded></item>`;
    }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Justin Rogowski — Updates</title><link>${xml(site)}/updates</link><description>Updates from Justin Rogowski.</description><language>en-us</language><atom:link href="${xml(site)}/updates/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}
