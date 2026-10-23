import { createClient } from '@supabase/supabase-js';
import { UUID, normalizePost, publicPost, makeFeed, isPublishableKey } from '../lib/updates.mjs';
import { fetchLinkPreview } from '../lib/link-previews.mjs';

const POST_FIELDS = 'id,title,body,excerpt,status,pinned,comments_enabled,published_at,created_at,updated_at';
const COMMENT_FIELDS = 'id,post_id,user_id,author_name,body,status,created_at';
const fail = (status, message) => Object.assign(new Error(message), { status });
function validId(id) {
  if (!UUID.test(String(id || ''))) throw fail(400, 'That post or comment link is invalid.');
  return id;
}
function dbResult(result) {
  if (result.error) {
    if (result.error.message?.includes('Please wait 30 seconds')) throw fail(429, 'Please wait 30 seconds before adding another comment.');
    if (result.error.code === 'PGRST116') throw fail(404, 'This item is no longer available.');
    if (['42P01', 'PGRST205'].includes(result.error.code)) throw fail(503, 'Updates are not ready yet. Please check back soon.');
    console.error('Updates database error:', result.error.code);
    throw fail(502, 'The update could not be completed. Please try again.');
  }
  return result.data;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const query = new URL(req.url, 'http://localhost').searchParams;
    // Vercel also exposes rewrite query parameters on req.query.
    const action = req.query?.action || query.get('action') || 'posts';
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    const configured = Boolean(url && isPublishableKey(key));
    if (action === 'config') {
      if (req.method !== 'GET') throw fail(405, 'Use GET for this request.');
      return res.status(200).json({ configured, ...(configured ? { url, key } : {}) });
    }
    if (!configured) throw fail(503, 'Updates are being prepared. Please check back soon.');
    const method = req.method;
    const allowed = { posts: ['GET', 'POST', 'PATCH', 'DELETE'], comments: ['GET', 'POST', 'DELETE'], profile: ['GET'], drafts: ['GET'], moderation: ['GET', 'PATCH', 'DELETE'], feed: ['GET'], preview: ['POST'] };
    if (!Object.hasOwn(allowed, action)) throw fail(404, 'This endpoint does not exist.');
    if (!allowed[action].includes(method)) {
      res.setHeader('Allow', allowed[action].join(', '));
      throw fail(405, 'This request method is not supported.');
    }
    const authorization = req.headers.authorization;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      ...(authorization ? { global: { headers: { Authorization: authorization } } } : {})
    });
    const requireUser = async () => {
      if (!authorization?.startsWith('Bearer ')) throw fail(401, 'Sign in to continue.');
      const { data, error } = await client.auth.getUser(authorization.slice(7));
      if (error || !data.user) throw fail(401, 'Your session has expired. Please sign in again.');
      return data.user;
    };
    const requireAuthor = async () => {
      const user = await requireUser();
      if (!dbResult(await client.rpc('updates_is_author'))) throw fail(403, 'Only the author can publish or moderate updates.');
      return user;
    };
    let body = {};
    if (['POST', 'PATCH'].includes(method)) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    }
    const id = req.query?.id || query.get('id');
    if (action === 'preview') {
      await requireAuthor();
      try { return res.status(200).json(await fetchLinkPreview(body.url)); }
      catch (error) { throw fail(400, error.message); }
    }
    if (action === 'profile') {
      const user = await requireUser();
      const isAuthor = Boolean(dbResult(await client.rpc('updates_is_author')));
      return res.status(200).json({ isAuthor, id: user.id, email: user.email });
    }
    if (action === 'posts' && method === 'GET') {
      let request = client.from('updates_posts').select(POST_FIELDS).eq('status', 'published');
      if (id) request = request.eq('id', validId(id));
      const offset = Math.max(0, Math.min(100000, Number(query.get('offset')) || 0));
      const posts = dbResult(await request.order('pinned', { ascending: false })
        .order('published_at', { ascending: false }).order('id').range(offset, offset + 19));
      return res.status(200).json({ posts: posts.map(publicPost), hasMore: !id && posts.length === 20 });
    }
    if (action === 'feed') {
      const posts = dbResult(await client.from('updates_posts').select(POST_FIELDS).eq('status', 'published')
        .order('published_at', { ascending: false }).limit(50));
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      return res.status(200).send(makeFeed(posts, process.env.UPDATES_SITE_URL || 'https://justinrogo.vercel.app'));
    }
    if (action === 'drafts') {
      await requireAuthor();
      const posts = dbResult(await client.from('updates_posts').select(POST_FIELDS)
        .eq('status', 'draft').order('updated_at', { ascending: false }).limit(100));
      return res.status(200).json({ posts: posts.map(publicPost) });
    }
    if (action === 'posts') {
      const user = await requireAuthor();
      if (method === 'DELETE') {
        const deleted = dbResult(await client.from('updates_posts').delete().eq('id', validId(id)).select('id').single());
        return res.status(200).json(deleted);
      }
      let post;
      try { post = normalizePost(body); } catch (error) { throw fail(400, error.message); }
      const request = method === 'POST'
        ? client.from('updates_posts').insert({ ...post, author_id: user.id })
        : client.from('updates_posts').update(post).eq('id', validId(id));
      const saved = dbResult(await request.select(POST_FIELDS).single());
      return res.status(method === 'POST' ? 201 : 200).json({ post: publicPost(saved) });
    }
    if (action === 'comments' && method === 'GET') {
      const postId = validId(req.query?.post || query.get('post'));
      const comments = dbResult(await client.from('updates_comments').select(COMMENT_FIELDS)
        .eq('post_id', postId).order('created_at').limit(200));
      return res.status(200).json({ comments });
    }
    if (action === 'comments' && method === 'POST') {
      const user = await requireUser();
      const text = String(body.body || '').trim();
      const name = String(body.author_name || '').trim();
      if (!text || text.length > 4000 || !name || name.length > 80) throw fail(400, 'Enter your name and a comment of up to 4,000 characters.');
      const comment = dbResult(await client.from('updates_comments').insert({
        post_id: validId(body.post_id), user_id: user.id, author_name: name, body: text, status: 'pending'
      }).select(COMMENT_FIELDS).single());
      return res.status(201).json({ comment });
    }
    if (action === 'comments' && method === 'DELETE') {
      await requireUser();
      dbResult(await client.from('updates_comments').delete().eq('id', validId(id)).select('id').single());
      return res.status(200).json({ deleted: true });
    }
    if (action === 'moderation') {
      await requireAuthor();
      if (method === 'GET') {
        const comments = dbResult(await client.from('updates_comments').select(COMMENT_FIELDS)
          .eq('status', 'pending').order('created_at').limit(200));
        return res.status(200).json({ comments });
      }
      const request = method === 'DELETE' ? client.from('updates_comments').delete()
        : client.from('updates_comments').update({ status: 'approved' });
      dbResult(await request.eq('id', validId(id)).select('id').single());
      return res.status(200).json({ updated: true });
    }
  } catch (error) {
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    if (status === 500) console.error('Updates request failed:', error.name);
    return res.status(status).json({ error: status === 500 ? 'Updates could not be loaded. Please try again.' : (error instanceof SyntaxError ? 'The request could not be read.' : error.message) });
  }
}
