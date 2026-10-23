const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const preview = params.get('preview') === '1';
const state = { session: null, client: null, author: false, userId: null, view: 'published', posts: [], editing: null, dirty: false, offset: 0, configured: false, ready: false };
let quill;
let previewData;
const previewComments = new Map();
const date = value => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined && text !== null) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function button(text, onClick, className = 'quiet-button') {
  const element = node('button', text, className);
  element.type = 'button';
  element.addEventListener('click', onClick);
  return element;
}
function notice(message, error = false) {
  $('#notice').textContent = message;
  $('#notice').classList.toggle('error', error);
  $('#notice').hidden = !message;
}
function postUrl(id) {
  return `/updates?${preview ? 'preview=1&' : ''}post=${encodeURIComponent(id)}`;
}
async function api(action, { method = 'GET', body, query = {} } = {}) {
  const search = new URLSearchParams({ action, ...query });
  const response = await fetch(`/api/updates?${search}`, {
    method,
    headers: { ...(state.session ? { Authorization: `Bearer ${state.session.access_token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('Updates could not be reached. Please try again.'); }
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}
function safeBody(body) {
  const div = node('div', null, 'post-body');
  div.innerHTML = DOMPurify.sanitize(body, {
    ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'target', 'rel']
  });
  div.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  div.querySelectorAll('img').forEach(img => { img.loading = 'lazy'; });
  return div;
}
function empty(title, message, retry) {
  const div = node('div', null, 'empty-state');
  div.append(node('h2', title), node('p', message));
  if (retry) div.append(button('Try again', () => loadFeed(), 'outline-button'));
  return div;
}
function syncControls() {
  $('#write-post').hidden = !state.author;
  $('#author-tabs').hidden = !state.author;
  $('#sign-in').hidden = Boolean(state.session) || preview;
  $('#sign-in').disabled = !state.configured;
  $('#sign-out').hidden = !state.session || preview;
  $('#account-label').textContent = preview ? 'Previewing the author view' : state.session ? `Signed in as ${state.session.user.email}` : '';
  document.querySelectorAll('[data-view]').forEach(tab => {
    if (tab.dataset.view === state.view) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
}
let feedRequest = 0;
async function loadFeed(append = false) {
  const requestId = ++feedRequest;
  $('#feed').setAttribute('aria-busy', 'true');
  $('#load-more').hidden = true;
  if (!append) { state.offset = 0; state.posts = []; }
  try {
    if (state.view === 'moderation') { document.title = 'Comment queue · Updates · Justin Rogowski'; await renderModeration(); return; }
    const id = new URLSearchParams(location.search).get('post');
    let data;
    if (preview) {
      let posts = previewData.filter(p => p.status === (state.view === 'drafts' ? 'draft' : 'published'));
      if (id && state.view === 'published') posts = posts.filter(p => p.id === id);
      posts = posts.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.published_at || b.updated_at) - new Date(a.published_at || a.updated_at));
      data = { posts, hasMore: false };
    } else {
      data = await api(state.view === 'drafts' ? 'drafts' : 'posts', { query: { ...(id && state.view === 'published' ? { id } : {}), offset: String(state.offset) } });
    }
    if (requestId !== feedRequest) return;
    state.posts = append ? [...state.posts, ...data.posts] : data.posts;
    const feed = $('#feed');
    feed.replaceChildren();
    if (id && state.view === 'published') {
      const back = node('a', 'Back to all updates', 'back-link');
      back.href = `/updates${preview ? '?preview=1' : ''}`;
      back.addEventListener('click', event => { event.preventDefault(); history.pushState({}, '', back.href); loadFeed(); });
      feed.append(back);
    }
    if (!state.posts.length) feed.append(empty(
      id ? 'Post not found' : state.view === 'drafts' ? 'No drafts yet' : 'No updates yet',
      id ? 'This post may have been removed or is no longer published.' : state.view === 'drafts' ? 'Save an unfinished update here, then publish it when it is ready.' : 'New posts will appear here. Check back soon.'
    ));
    for (const post of state.posts) feed.append(renderPost(post, Boolean(id)));
    $('#load-more').hidden = !data.hasMore;
    state.offset = state.posts.length;
    document.title = id && state.posts[0] ? `${state.posts[0].title} · Justin Rogowski` : state.view === 'drafts' ? 'Drafts · Updates · Justin Rogowski' : 'Updates · Justin Rogowski';
  } catch (error) {
    if (requestId !== feedRequest) return;
    $('#feed').replaceChildren(empty('Updates are unavailable', error.message, true));
  } finally {
    if (requestId === feedRequest) $('#feed').setAttribute('aria-busy', 'false');
  }
}
function renderPost(post, expanded) {
  const article = node('article', null, 'post');
  article.id = `post-${post.id}`;
  const meta = node('div', null, 'post-meta');
  meta.append(node('strong', 'Justin Rogowski'));
  const time = node('time', date(post.published_at || post.updated_at));
  time.dateTime = post.published_at || post.updated_at;
  meta.append(time);
  if (post.pinned) meta.append(node('span', 'Pinned', 'pin-label'));
  if (post.status === 'draft') meta.append(node('span', 'Draft · only you can see this', 'draft-label'));
  const heading = node('h2', null, 'post-title');
  const link = node('a', post.title);
  link.href = postUrl(post.id);
  if (post.status === 'draft') link.addEventListener('click', event => { event.preventDefault(); openComposer(post); });
  else link.addEventListener('click', event => { event.preventDefault(); openPost(post.id); });
  heading.append(link);
  article.append(meta, heading, safeBody(post.body));
  const actions = node('div', null, 'post-actions');
  if (post.status === 'published' && !expanded) {
    const discuss = node('a', post.comments_enabled ? 'Read & comment' : 'Open post');
    discuss.href = postUrl(post.id);
    discuss.addEventListener('click', event => { event.preventDefault(); openPost(post.id); });
    actions.append(discuss);
  }
  if (post.status === 'published') actions.append(button('Copy link', () => copyText(new URL(postUrl(post.id), location.origin).href, 'Post link copied.')));
  if (state.author) {
    const authorActions = node('div', null, 'post-author-actions');
    authorActions.append(button('Edit', () => openComposer(post)), button('Delete', () => removePost(post)));
    actions.append(authorActions);
  }
  article.append(actions);
  if (expanded && post.status === 'published') {
    const discussion = node('section', null, 'discussion');
    discussion.setAttribute('aria-label', 'Comments');
    article.append(discussion);
    loadComments(post, discussion);
  }
  return article;
}
function openPost(id) {
  state.view = 'published';
  history.pushState({}, '', postUrl(id));
  syncControls();
  loadFeed().then(() => $('#feed').focus({ preventScroll: true }));
}
async function loadComments(post, target) {
  target.replaceChildren(node('h3', 'Conversation'), node('p', 'Loading comments…', 'field-help'));
  try {
    const { comments } = preview ? { comments: previewComments.get(post.id) || [] } : await api('comments', { query: { post: post.id } });
    target.replaceChildren(node('h3', 'Conversation'));
    if (!comments.length) target.append(node('p', 'No comments yet.', 'field-help'));
    comments.forEach(comment => {
      const div = node('div', null, 'comment');
      const meta = node('div', null, 'post-meta');
      const time = node('time', date(comment.created_at));
      time.dateTime = comment.created_at;
      meta.append(node('strong', comment.author_name), time);
      div.append(meta, node('p', comment.body));
      if (comment.status === 'pending') div.append(node('p', 'Awaiting approval · visible to you and the author', 'pending-label'));
      if (state.author || comment.user_id === state.userId) div.append(button('Delete comment', async () => {
        if (!await confirmAction('Delete this comment?', 'This cannot be undone.')) return;
        try {
          if (preview) previewComments.set(post.id, comments.filter(c => c.id !== comment.id));
          else await api('comments', { method: 'DELETE', query: { id: comment.id } });
          await loadComments(post, target);
        } catch (error) { notice(error.message, true); }
      }));
      target.append(div);
    });
    if (!post.comments_enabled) { target.append(node('p', 'Comments are closed for this post.', 'field-help')); return; }
    if (!state.session && !preview) {
      target.append(button('Sign in to comment', () => $('#auth-dialog').showModal(), 'outline-button'));
      return;
    }
    const form = node('form', null, 'comment-form');
    const nameId = `comment-name-${post.id}`;
    const bodyId = `comment-body-${post.id}`;
    const nameLabel = node('label', 'Your name'); nameLabel.htmlFor = nameId;
    const name = node('input'); name.id = nameId; name.maxLength = 80; name.required = true; name.autocomplete = 'name';
    try { name.value = localStorage.getItem('updates-comment-name') || ''; } catch { /* Storage is optional. */ }
    const bodyLabel = node('label', 'Add a comment'); bodyLabel.htmlFor = bodyId;
    const text = node('textarea'); text.id = bodyId; text.rows = 3; text.maxLength = 4000; text.required = true;
    const submit = node('button', 'Submit for approval', 'primary-button'); submit.type = 'submit';
    const status = node('p', 'Comments appear publicly after approval.', 'field-help'); status.setAttribute('role', 'status');
    form.append(nameLabel, name, bodyLabel, text, submit, status);
    form.addEventListener('submit', async event => {
      event.preventDefault(); submit.disabled = true;
      try {
        const body = { post_id: post.id, body: text.value.trim(), author_name: name.value.trim() };
        if (!body.body || !body.author_name) throw new Error('Enter your name and a comment.');
        if (preview) previewComments.set(post.id, [...(previewComments.get(post.id) || []), { ...body, id: crypto.randomUUID(), user_id: 'preview', status: 'pending', created_at: new Date().toISOString() }]);
        else await api('comments', { method: 'POST', body });
        try { localStorage.setItem('updates-comment-name', body.author_name); } catch { /* Storage is optional. */ }
        await loadComments(post, target);
        notice(preview ? 'Preview comment added locally. Nothing was published.' : 'Your comment was sent for approval.');
      } catch (error) { status.textContent = error.message; submit.disabled = false; }
    });
    target.append(form);
  } catch (error) {
    target.replaceChildren(node('h3', 'Conversation'), node('p', error.message, 'field-help'), button('Try again', () => loadComments(post, target), 'outline-button'));
  }
}
async function renderModeration() {
  const { comments } = preview ? { comments: [...previewComments.values()].flat().filter(c => c.status === 'pending') } : await api('moderation');
  const feed = $('#feed');
  feed.replaceChildren();
  if (!comments.length) feed.append(empty('All caught up', 'New comments will wait here for your approval.'));
  for (const comment of comments) {
    const article = node('article', null, 'moderation-item');
    article.append(node('h2', comment.author_name), node('p', date(comment.created_at), 'field-help'), node('p', comment.body));
    const postLink = node('a', 'Open the post'); postLink.href = postUrl(comment.post_id);
    postLink.addEventListener('click', e => { e.preventDefault(); openPost(comment.post_id); });
    article.append(postLink);
    const actions = node('div', null, 'moderation-actions');
    for (const [label, method] of [['Approve', 'PATCH'], ['Delete', 'DELETE']]) actions.append(button(label, async event => {
      const clicked = event.currentTarget;
      if (method === 'DELETE' && !await confirmAction('Delete this comment?', 'This cannot be undone.')) return;
      clicked.disabled = true;
      try {
        if (preview) {
          if (method === 'PATCH') comment.status = 'approved';
          else previewComments.set(comment.post_id, (previewComments.get(comment.post_id) || []).filter(c => c.id !== comment.id));
        } else await api('moderation', { method, query: { id: comment.id } });
        await loadFeed();
        notice(method === 'PATCH' ? 'Comment approved.' : 'Comment deleted.');
      } catch (error) { notice(error.message, true); clicked.disabled = false; }
    }, label === 'Approve' ? 'primary-button' : 'outline-button'));
    article.append(actions); feed.append(article);
  }
}
function editor() {
  if (quill) return quill;
  quill = new Quill('#editor', {
    theme: 'snow', placeholder: 'Write your update…',
    modules: { toolbar: { container: '#editor-toolbar', handlers: { image: () => $('#image-picker').click() } } },
    formats: ['header', 'bold', 'italic', 'underline', 'list', 'blockquote', 'link', 'image']
  });
  quill.root.setAttribute('aria-labelledby', 'editor-label');
  quill.root.setAttribute('role', 'textbox');
  quill.root.setAttribute('aria-multiline', 'true');
  quill.on('text-change', (_, __, source) => { if (source === 'user') markDirty(); });
  // Uploaded images use the controlled image picker. Drop/pasted data URLs are not stored in posts.
  quill.root.addEventListener('paste', event => { if ([...event.clipboardData.items].some(item => item.type.startsWith('image/'))) { event.preventDefault(); notice('Use the image button to upload an image.', true); } }, true);
  quill.root.addEventListener('drop', event => { if (event.dataTransfer.files.length) { event.preventDefault(); notice('Use the image button to upload an image.', true); } });
  return quill;
}
function markDirty() { state.dirty = true; $('#save-state').textContent = 'Unsaved changes'; }
async function openComposer(post = null) {
  if (state.dirty && !await confirmAction('Discard your unsaved changes?', 'Save the current post first if you want to keep these changes.', 'Discard changes')) return;
  const q = editor();
  state.editing = post?.id || null;
  $('#composer-title').textContent = post ? 'Edit update' : 'Write an update';
  $('#post-title').value = post?.title || '';
  $('#post-excerpt').value = post?.excerpt || '';
  $('#post-pinned').checked = post?.pinned || false;
  $('#post-comments').checked = post?.comments_enabled !== false;
  q.clipboard.dangerouslyPasteHTML(DOMPurify.sanitize(post?.body || ''), 'silent');
  $('#publish-post').textContent = post?.status === 'published' ? 'Save published update' : 'Publish update';
  $('#save-draft').textContent = post?.status === 'published' ? 'Move to drafts' : 'Save draft';
  $('#save-state').textContent = 'Changes are saved when you choose an action.';
  $('#upload-status').textContent = '';
  state.dirty = false;
  $('#composer').hidden = false;
  $('#composer').scrollIntoView({ block: 'start', behavior: 'smooth' });
  $('#post-title').focus({ preventScroll: true });
}
async function closeComposer() {
  if (state.dirty && !await confirmAction('Discard your unsaved changes?', 'Save this post first if you want to keep these changes.', 'Discard changes')) return;
  state.dirty = false;
  state.editing = null;
  $('#composer').hidden = true;
  $('#write-post').focus();
}
async function savePost(status) {
  if (!$('#post-form').reportValidity()) return;
  const body = { title: $('#post-title').value.trim(), body: DOMPurify.sanitize(editor().getSemanticHTML()), excerpt: $('#post-excerpt').value.trim(), pinned: $('#post-pinned').checked, comments_enabled: $('#post-comments').checked, status };
  if (!body.title || (!editor().getText().trim() && !body.body.includes('<img'))) { notice('Enter a title and write something before saving.', true); return; }
  const controls = [...$('#post-form').querySelectorAll('button,input,textarea')];
  controls.forEach(control => { control.disabled = true; });
  quill.enable(false);
  $('#save-state').textContent = 'Saving…';
  try {
    if (preview) {
      const old = previewData.find(p => p.id === state.editing);
      const post = { ...body, id: state.editing || crypto.randomUUID(), body: DOMPurify.sanitize(body.body), excerpt: body.excerpt || editor().getText().trim().slice(0, 260), published_at: old?.published_at || (status === 'published' ? new Date().toISOString() : null), updated_at: new Date().toISOString() };
      previewData = [post, ...previewData.filter(p => p.id !== post.id)];
      try { sessionStorage.setItem('updates-preview-posts', JSON.stringify(previewData)); } catch { /* Preview remains usable without storage. */ }
    } else await api('posts', { method: state.editing ? 'PATCH' : 'POST', query: state.editing ? { id: state.editing } : {}, body });
    state.dirty = false;
    state.editing = null;
    $('#composer').hidden = true;
    state.view = status === 'draft' ? 'drafts' : 'published';
    history.pushState({}, '', `/updates${preview ? '?preview=1' : ''}`);
    syncControls(); await loadFeed();
    notice(preview ? 'Preview saved in this tab. Nothing was published.' : status === 'draft' ? 'Draft saved. Only you can see it.' : 'Your update is published. The widget and RSS feed will pick it up.');
  } catch (error) { notice(error.message, true); $('#save-state').textContent = 'Not saved. Your changes are still here.'; }
  finally { controls.forEach(control => { control.disabled = false; }); quill.enable(true); }
}
async function removePost(post) {
  if (!await confirmAction('Delete this post?', 'This also removes its comments. This cannot be undone.')) return;
  try {
    if (preview) {
      previewData = previewData.filter(p => p.id !== post.id);
      try { sessionStorage.setItem('updates-preview-posts', JSON.stringify(previewData)); } catch { /* Optional storage. */ }
    } else await api('posts', { method: 'DELETE', query: { id: post.id } });
    if (state.editing === post.id) { state.dirty = false; state.editing = null; $('#composer').hidden = true; }
    history.replaceState({}, '', `/updates${preview ? '?preview=1' : ''}`);
    await loadFeed(); notice('Post deleted.');
  } catch (error) { notice(error.message, true); }
}
async function confirmAction(title, description, action = 'Delete') {
  $('#confirm-title').textContent = title;
  $('#confirm-description').textContent = description;
  $('#confirm-dialog button[value=delete]').textContent = action;
  $('#confirm-dialog').returnValue = '';
  $('#confirm-dialog').showModal();
  return new Promise(resolve => $('#confirm-dialog').addEventListener('close', () => resolve($('#confirm-dialog').returnValue === 'delete'), { once: true }));
}
async function copyText(text, success) {
  try { await navigator.clipboard.writeText(text); notice(success); }
  catch { notice(`Copy this address: ${text}`); }
}
$('#write-post').addEventListener('click', () => openComposer());
$('#close-composer').addEventListener('click', closeComposer);
$('#post-form').addEventListener('submit', event => { event.preventDefault(); savePost('published'); });
$('#save-draft').addEventListener('click', () => savePost('draft'));
$('#post-form').addEventListener('input', markDirty);
$('#sign-in').addEventListener('click', () => $('#auth-dialog').showModal());
$('#close-auth').addEventListener('click', () => $('#auth-dialog').close());
$('#auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('#send-link').disabled = true; $('#auth-message').textContent = 'Sending your link…';
  const post = new URLSearchParams(location.search).get('post');
  try {
    const { error } = await state.client.auth.signInWithOtp({ email: $('#auth-email').value.trim(), options: { emailRedirectTo: `${location.origin}/updates${post ? `?post=${encodeURIComponent(post)}` : ''}` } });
    if (error) throw error;
    $('#auth-message').textContent = 'Check your inbox for a sign-in link. You can close this window.';
  } catch (error) { $('#auth-message').textContent = error.message || 'The link could not be sent. Please try again.'; }
  finally { $('#send-link').disabled = false; }
});
$('#sign-out').addEventListener('click', async () => {
  if (state.dirty && !await confirmAction('Discard your unsaved changes?', 'Signing out closes the editor.', 'Discard & sign out')) return;
  try {
    const { error } = await state.client.auth.signOut();
    if (error) throw error;
    state.dirty = false; $('#composer').hidden = true; state.view = 'published';
  } catch (error) { notice(error.message, true); }
});
document.querySelectorAll('[data-view]').forEach(tab => tab.addEventListener('click', () => {
  state.view = tab.dataset.view;
  history.pushState({}, '', `/updates${preview ? '?preview=1' : ''}`);
  syncControls(); loadFeed();
}));
$('#load-more').addEventListener('click', () => loadFeed(true));
$('#embed-url').value = `${location.origin}/updates/embed?limit=3&theme=light`;
$('#copy-embed').addEventListener('click', () => copyText($('#embed-url').value, 'Widget URL copied. Paste it into Confluence’s iFrame macro.'));
$('#image-picker').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { notice('Choose a PNG, JPEG, GIF, or WebP image smaller than 5 MB.', true); return; }
  if (preview) { notice('Image uploads become available after Supabase is connected. Preview edits stay in this tab.'); return; }
  $('#upload-status').textContent = 'Uploading image…';
  $('#publish-post').disabled = true; $('#save-draft').disabled = true;
  try {
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' }[file.type];
    const path = `${state.userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await state.client.storage.from('updates-images').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = state.client.storage.from('updates-images').getPublicUrl(path);
    const range = editor().getSelection(true);
    editor().insertEmbed(range?.index ?? editor().getLength() - 1, 'image', data.publicUrl, 'user');
    $('#upload-status').textContent = 'Image uploaded.';
  } catch (error) { $('#upload-status').textContent = error.message || 'Image upload failed. Try again.'; }
  finally { $('#publish-post').disabled = false; $('#save-draft').disabled = false; }
});
let light = false;
try { light = localStorage.getItem('updates-theme') === 'light'; } catch { /* Optional preference. */ }
function applyTheme() {
  document.body.classList.toggle('light', light);
  $('#theme-toggle').textContent = light ? 'Dark theme' : 'Light theme';
  $('#theme-toggle').setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
}
applyTheme();
$('#theme-toggle').addEventListener('click', () => { light = !light; applyTheme(); try { localStorage.setItem('updates-theme', light ? 'light' : 'dark'); } catch { /* Optional preference. */ } });
window.addEventListener('popstate', () => { state.view = 'published'; syncControls(); loadFeed(); });
window.addEventListener('beforeunload', event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });

let accountVersion = 0;
async function syncAccount(session) {
  const version = ++accountVersion;
  state.session = session; state.author = false; state.userId = session?.user?.id || null;
  if (session) {
    try {
      const profile = await api('profile');
      if (version !== accountVersion) return;
      state.author = profile.isAuthor;
    } catch (error) { notice(error.message, true); }
  }
  if (version !== accountVersion) return;
  if (!state.author) { state.view = 'published'; state.dirty = false; $('#composer').hidden = true; }
  syncControls();
  await loadFeed();
}
async function init() {
  try {
    if (!window.DOMPurify || !window.Quill || !window.supabase) throw new Error('The page could not finish loading. Please reload and try again.');
    if (preview) {
      previewData = (await import('./preview.js')).previewPosts.map(p => ({ ...p }));
      try {
        const saved = JSON.parse(sessionStorage.getItem('updates-preview-posts'));
        if (Array.isArray(saved)) previewData = saved;
      } catch { /* Fresh preview if storage is unavailable. */ }
      state.author = true; state.userId = 'preview';
      $('#preview-banner').hidden = false;
      $('.embed-details a').href = '/updates/embed?preview=1';
      syncControls(); await loadFeed(); return;
    }
    const config = await api('config');
    state.configured = config.configured;
    if (!config.configured) {
      syncControls();
      $('#feed').replaceChildren(empty('A new space for updates', 'Posts and conversation will be available here soon.'));
      $('#feed').setAttribute('aria-busy', 'false');
      return;
    }
    state.client = window.supabase.createClient(config.url, config.key);
    const { data, error } = await state.client.auth.getSession();
    if (error) throw error;
    await syncAccount(data.session);
    state.client.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION') setTimeout(() => syncAccount(session), 0);
    });
    state.ready = true;
  } catch (error) {
    syncControls();
    $('#feed').replaceChildren(empty('Updates could not be loaded', error.message));
    $('#feed').setAttribute('aria-busy', 'false');
  }
}
init();
