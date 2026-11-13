'use strict';

// UCPEA Bulletin Board: union-wide and area boards, as a corkboard or a list.
//
// Everyone sees published public posts. Signed-in, approved members also see
// members-only posts for the union-wide board and their own areas. Staff post
// anywhere; stewards post to their areas. The database's row-level security
// decides all of this (Pages/Work/UCPEA/supabase/migrations); this file only
// hides controls that would be refused anyway.
(() => {
  const view = document.getElementById('board');
  if (!view || !window.UCPEAAccount) return;

  const $ = id => document.getElementById(id);
  const els = {
    notice: $('board-notice'),
    error: $('board-error'),
    browse: $('board-browse'),
    filter: $('board-filter'),
    past: $('board-past'),
    layoutButtons: Array.from(view.querySelectorAll('[data-board-layout]')),
    newPost: $('board-new'),
    signin: $('board-signin'),
    offline: $('board-offline'),
    status: $('board-status'),
    posts: $('board-posts'),
    detail: $('board-detail'),
    composer: $('board-composer'),
    composerTitle: $('board-composer-title'),
    board: $('post-board'),
    category: $('post-category'),
    title: $('post-title'),
    summary: $('post-summary'),
    body: $('post-body'),
    event: $('post-event'),
    expires: $('post-expires'),
    link: $('post-link'),
    flyer: $('post-flyer'),
    flyerCurrent: $('post-flyer-current'),
    flyerName: $('post-flyer-name'),
    flyerRemove: $('post-flyer-remove'),
    altField: $('post-alt-field'),
    alt: $('post-alt'),
    pinned: $('post-pinned'),
    flyerOnlyField: $('post-flyer-only-field'),
    flyerOnly: $('post-flyer-only'),
    publish: $('post-publish'),
    draft: $('post-draft'),
    cancel: $('post-cancel'),
  };

  const COLUMNS = 'id, area_id, title, summary, body, category, image_bucket, image_path, image_alt, link_url, '
    + 'event_starts_at, expires_at, pinned, flyer_only, visibility, status, published_at, created_at, updated_at';
  const LAYOUT_KEY = 'ucpea-board-layout';
  const MOTION_KEY = 'ucpea-board-motion';
  const SNAPSHOT_KEY = 'ucpea-board-snapshot';
  const MAX_IMAGE_EDGE = 1600;
  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const SIGNED_URL_SECONDS = 60 * 60;

  const state = {
    me: null,
    areas: [],
    areaById: new Map(),
    posts: [],
    urls: new Map(),
    loadedFor: undefined, // profile id (or null) the current posts were loaded for
    loading: null,
    offline: false,
    mode: 'browse',
    editing: null,
    flyer: { file: null, removeExisting: false },
    confirmTimer: 0,
    motionPaused: false,
  };

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function writeStorage(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // Optional convenience only.
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function showError(message) {
    els.error.textContent = message || '';
    els.error.hidden = !message;
  }

  function showNotice(message) {
    els.notice.textContent = message || '';
  }

  function friendlyError(error) {
    if (error?.code === 'P0001' && error.message) return error.message;
    if (error?.code === '42501' || error?.code === 'no_rows' || /row-level security|not authorized|unauthorized/i.test(error?.message || '')) {
      return "You don't have permission to post or change things on that board.";
    }
    if (error?.code === '23514') return 'Something in the post is not allowed. Check the link starts with https:// and the dates are in order.';
    if (error?.userMessage) return error.userMessage;
    if (!navigator.onLine) return "You're offline. Connect to the internet and try again.";
    return 'Something went wrong. Please try again.';
  }

  function userError(message) {
    const error = new Error(message);
    error.userMessage = message;
    return error;
  }

  function access() {
    const profile = state.me;
    const active = profile?.status === 'active';
    const isStaff = active && (profile.role === 'staff' || profile.role === 'admin');
    const stewardAreas = active ? profile.areas.filter(area => area.role === 'steward').map(area => area.id) : [];
    const memberAreas = active ? profile.areas.map(area => area.id) : [];
    return {
      active,
      isStaff,
      stewardAreas,
      memberAreas,
      canPostAnywhere: isStaff || stewardAreas.length > 0,
      canPostTo: areaId => isStaff || (areaId != null && stewardAreas.includes(areaId)),
    };
  }

  function boardName(areaId) {
    if (areaId == null) return 'Union-wide';
    return state.areaById.get(areaId)?.name || `Area ${areaId}`;
  }

  function isPast(post) {
    return Boolean(post.expires_at) && new Date(post.expires_at) < new Date();
  }

  function isPdf(path) {
    return /\.pdf$/i.test(path || '');
  }

  function eventText(value) {
    if (!value) return '';
    const date = new Date(value);
    const day = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
    const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${day} · ${time}`;
  }

  function dateText(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // A steady, slight tilt per note so the board feels pinned up, not printed.
  function tiltFor(id) {
    let hash = 0;
    for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return ((Math.abs(hash) % 7) - 3) * 0.45;
  }

  function postURL(id) {
    const url = new URL('index.html', document.baseURI);
    url.searchParams.set('view', 'board');
    if (id) url.hash = `post-${id}`;
    return url;
  }

  // ---------------------------------------------------------------------------
  // Layout preference: corkboard or list
  // ---------------------------------------------------------------------------
  function preferredLayout() {
    const saved = readStorage(LAYOUT_KEY);
    if (saved === 'board' || saved === 'list') return saved;
    const plain = window.matchMedia?.('(prefers-reduced-motion: reduce), (forced-colors: active)').matches;
    return plain ? 'list' : 'board';
  }

  function setLayout(layout, persist = false) {
    els.posts.dataset.layout = layout;
    for (const button of els.layoutButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.boardLayout === layout));
    }
    if (persist) writeStorage(LAYOUT_KEY, layout);
  }

  // ---------------------------------------------------------------------------
  // Animated GIF flyers: playing by default, still for people who reduce motion,
  // and always pausable (motion over five seconds needs a way to stop it).
  // ---------------------------------------------------------------------------
  function isGif(path) {
    return /\.gif$/i.test(path || '');
  }

  function preferredMotion() {
    const saved = readStorage(MOTION_KEY);
    if (saved === 'paused') return true;
    if (saved === 'playing') return false;
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }

  // A still copy of the GIF's first frame, drawn once the image has loaded.
  function stillFor(img) {
    let canvas = img.nextElementSibling;
    if (!canvas?.classList.contains('board-gif-still')) {
      canvas = document.createElement('canvas');
      canvas.className = 'board-gif-still';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', img.alt);
      img.after(canvas);
      const draw = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
      };
      if (img.complete && img.naturalWidth) draw();
      else img.addEventListener('load', draw, { once: true });
    }
    return canvas;
  }

  function applyMotion() {
    const gifs = Array.from(view.querySelectorAll('img[data-gif]'));
    for (const img of gifs) {
      if (state.motionPaused) {
        img.loading = 'eager'; // a hidden lazy image would never load its frame
        stillFor(img).hidden = false;
        img.hidden = true;
      } else {
        img.hidden = false;
        if (img.nextElementSibling?.classList.contains('board-gif-still')) img.nextElementSibling.hidden = true;
      }
    }
    for (const button of view.querySelectorAll('[data-board-motion]')) {
      button.setAttribute('aria-pressed', String(state.motionPaused));
      button.textContent = state.motionPaused ? 'Play animations' : 'Pause animations';
      if (button.closest('.board-toolbar')) button.hidden = !view.querySelector('#board-posts img[data-gif]');
    }
  }

  function toggleMotion() {
    state.motionPaused = !state.motionPaused;
    writeStorage(MOTION_KEY, state.motionPaused ? 'paused' : 'playing');
    applyMotion();
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  async function loadAreas(client) {
    if (state.areas.length) return;
    const { data, error } = await client.from('areas').select('id, name').order('id');
    if (error) throw error;
    state.areas = data;
    state.areaById = new Map(data.map(area => [area.id, area]));
  }

  async function resolveImages(client, posts) {
    state.urls = new Map();
    const signed = [];
    for (const post of posts) {
      if (!post.image_path) continue;
      if (post.image_bucket === 'board-public') {
        state.urls.set(post.id, client.storage.from('board-public').getPublicUrl(post.image_path).data.publicUrl);
      } else {
        signed.push(post);
      }
    }
    if (!signed.length) return;
    const { data, error } = await client.storage.from('board-members')
      .createSignedUrls(signed.map(post => post.image_path), SIGNED_URL_SECONDS);
    if (error) return; // posts still show, without their flyers
    for (const [index, item] of data.entries()) {
      if (item?.signedUrl) state.urls.set(signed[index].id, item.signedUrl);
    }
  }

  function saveSnapshot() {
    writeStorage(SNAPSHOT_KEY, JSON.stringify({
      userId: state.me?.id || null,
      savedAt: new Date().toISOString(),
      areas: state.areas,
      posts: state.posts,
    }));
  }

  function readSnapshot() {
    try {
      const snapshot = JSON.parse(readStorage(SNAPSHOT_KEY));
      if (!snapshot || snapshot.userId !== (state.me?.id || null)) return null;
      return snapshot;
    } catch {
      return null;
    }
  }

  async function load() {
    const forId = state.me?.id || null;
    state.loading = (async () => {
      try {
        const client = await UCPEAAccount.getClient();
        await loadAreas(client);
        const { data, error } = await client.from('posts').select(COLUMNS)
          .order('pinned', { ascending: false })
          .order('published_at', { ascending: false, nullsFirst: true })
          .limit(500);
        if (error) throw error;
        state.posts = data;
        state.offline = false;
        await resolveImages(client, data);
        saveSnapshot();
      } catch (error) {
        const snapshot = readSnapshot();
        if (snapshot) {
          state.areas = snapshot.areas || [];
          state.areaById = new Map(state.areas.map(area => [area.id, area]));
          state.posts = snapshot.posts || [];
          state.urls = new Map();
          state.offline = true;
        } else {
          state.posts = [];
          showError(friendlyError(error));
        }
      }
      state.loadedFor = forId;
    })();
    await state.loading;
    state.loading = null;
  }

  // ---------------------------------------------------------------------------
  // Browse: filters and cards
  // ---------------------------------------------------------------------------
  function fillFilter() {
    const { isStaff, memberAreas } = access();
    const current = els.filter.value;
    const ids = new Set(memberAreas);
    for (const post of state.posts) if (post.area_id != null) ids.add(post.area_id);
    const areaIds = isStaff ? state.areas.map(area => area.id) : [...ids].sort((a, b) => a - b);
    els.filter.replaceChildren(new Option('All boards', ''), new Option('Union-wide', 'union'));
    for (const id of areaIds) els.filter.append(new Option(boardName(id), String(id)));
    els.filter.value = [...els.filter.options].some(option => option.value === current) ? current : '';
  }

  function visiblePosts() {
    const board = els.filter.value;
    return state.posts
      .filter(post => !board || (board === 'union' ? post.area_id == null : String(post.area_id) === board))
      .filter(post => els.past.checked || !isPast(post))
      .sort((a, b) => (b.pinned - a.pinned)
        || (b.status === 'draft') - (a.status === 'draft')
        || new Date(b.published_at || b.updated_at) - new Date(a.published_at || a.updated_at));
  }

  // Who the post is for: everyone, all members, or one area's members.
  function audienceLabel(post) {
    if (post.visibility === 'public') return 'Everyone';
    return post.area_id == null ? 'All Members' : boardName(post.area_id);
  }

  function flags(post) {
    const list = [['audience', audienceLabel(post)]];
    if (post.status === 'draft') list.push(['draft', 'Draft']);
    if (post.pinned) list.push(['pinned', 'Pinned']);
    if (isPast(post)) list.push(['past', 'Past']);
    return list;
  }

  function flagList(post) {
    const wrap = el('p', 'board-flags');
    for (const [kind, label] of flags(post)) {
      const flag = el('span', 'board-flag', label);
      flag.dataset.flag = kind;
      wrap.append(flag);
    }
    return wrap;
  }

  function media(post, { full = false } = {}) {
    if (!post.image_path) return null;
    const url = state.urls.get(post.id);
    if (isPdf(post.image_path)) {
      const box = el(url ? 'a' : 'div', 'board-pdf');
      if (url) {
        box.href = url;
        box.target = '_blank';
        box.rel = 'noopener';
      }
      box.append(el('span', 'board-pdf-label', 'PDF flyer'));
      box.append(el('span', 'board-pdf-text', full ? (url ? 'Open the flyer' : 'Flyer available when online') : (post.image_alt || 'Flyer attached')));
      return box;
    }
    if (!url) {
      return full ? el('p', 'board-media-missing', `Flyer: ${post.image_alt}`) : null;
    }
    const figure = el('figure', full ? 'board-media board-media-full' : 'board-media');
    const img = el('img');
    img.src = url;
    img.alt = post.image_alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    figure.append(img);
    if (isGif(post.image_path)) {
      img.dataset.gif = 'true';
      if (full) {
        const toggle = el('button', 'account-secondary board-motion', 'Pause animations');
        toggle.type = 'button';
        toggle.dataset.boardMotion = '';
        toggle.setAttribute('aria-pressed', 'false');
        figure.append(toggle);
      }
    }
    return figure;
  }

  function card(post) {
    const item = el('li', 'board-post');
    item.dataset.category = post.category;
    item.dataset.status = post.status;
    item.style.setProperty('--tilt', `${tiltFor(post.id)}deg`);
    const note = el('article', 'board-note');

    note.append(flagList(post));
    const heading = el('h2', 'board-note-title');
    const link = el('a', null, post.title);
    link.href = postURL(post.id).href;
    link.dataset.boardPost = post.id;
    heading.append(link);
    note.append(heading);

    const picture = media(post);
    if (picture) note.append(picture);
    // Flyer-only posts show just the flyer on the corkboard (the list still
    // shows the text). Without a loaded image, fall back to a normal note.
    if (post.flyer_only && picture?.querySelector('img')) item.classList.add('board-post-flyer-only');

    note.append(el('p', 'board-note-summary', post.summary));
    if (post.event_starts_at) {
      const meta = el('p', 'board-note-meta');
      meta.append(el('span', 'board-note-when', eventText(post.event_starts_at)));
      note.append(meta);
    }
    item.append(note);
    return item;
  }

  function renderBrowse() {
    const { canPostAnywhere, active } = access();
    fillFilter();
    els.newPost.hidden = !canPostAnywhere || state.offline;
    els.signin.hidden = Boolean(state.me);
    els.offline.hidden = !state.offline;

    const posts = visiblePosts();
    els.posts.replaceChildren(...posts.map(card));
    els.posts.hidden = !posts.length;
    if (state.loading) {
      els.status.textContent = 'Loading posts…';
    } else if (!posts.length) {
      const pastHidden = !els.past.checked && state.posts.some(isPast);
      els.status.textContent = state.posts.length
        ? (pastHidden ? 'No current posts on this board. Turn on "Show past posts" to see older ones.' : 'No posts on this board yet.')
        : (active || !state.me ? 'Nothing has been posted yet.' : 'Nothing to show yet. Members-only posts appear once your account is approved.');
    } else {
      els.status.textContent = `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`;
    }
    applyMotion();
  }

  // ---------------------------------------------------------------------------
  // Detail
  // ---------------------------------------------------------------------------
  function paragraphs(text) {
    const fragment = document.createDocumentFragment();
    for (const block of String(text || '').split(/\n\s*\n/)) {
      if (!block.trim()) continue;
      const p = el('p');
      block.trim().split('\n').forEach((line, index) => {
        if (index) p.append(el('br'));
        p.append(document.createTextNode(line));
      });
      fragment.append(p);
    }
    return fragment;
  }

  function renderDetail(id) {
    const post = state.posts.find(item => item.id === id);
    els.detail.replaceChildren();
    const back = el('a', 'board-back', '← All posts');
    back.href = postURL().href;
    back.dataset.boardPost = '';
    els.detail.append(back);

    if (!post) {
      els.detail.append(el('h2', null, "This post isn't available"));
      els.detail.append(el('p', 'account-lede', state.me
        ? 'It may have been removed, or it may be for members of a different area.'
        : 'It may have been removed, or it may be for members only. Sign in to see members-only posts.'));
      return;
    }

    els.detail.append(flagList(post));
    const title = el('h2', 'board-detail-title', post.title);
    title.id = 'board-detail-title';
    title.tabIndex = -1;
    els.detail.append(title);

    const facts = el('dl', 'board-facts');
    const fact = (term, value) => {
      if (!value) return;
      const row = el('div');
      row.append(el('dt', null, term), el('dd', null, value));
      facts.append(row);
    };
    fact('When', eventText(post.event_starts_at));
    fact('Board', boardName(post.area_id));
    fact('Posted', post.published_at ? dateText(post.published_at) : 'Not published yet');
    fact('Until', post.expires_at ? dateText(post.expires_at) : '');
    fact('Who can see it', post.visibility === 'public' ? 'Everyone' : 'Members of this board');
    els.detail.append(facts);

    els.detail.append(el('p', 'board-detail-summary', post.summary));
    const picture = media(post, { full: true });
    if (picture) els.detail.append(picture);
    if (post.body) {
      const body = el('div', 'board-detail-body');
      body.append(paragraphs(post.body));
      els.detail.append(body);
    }
    if (post.link_url) {
      const link = el('a', 'account-primary board-detail-link', 'Open link');
      link.href = post.link_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const host = el('span', 'board-link-host', new URL(post.link_url).hostname);
      const wrap = el('p', 'board-detail-actions');
      wrap.append(link, host);
      els.detail.append(wrap);
    }

    applyMotion();

    if (access().canPostTo(post.area_id) && !state.offline) {
      const tools = el('div', 'account-actions board-detail-tools');
      const edit = el('button', 'account-secondary', 'Edit post');
      edit.type = 'button';
      edit.dataset.boardAction = 'edit';
      edit.dataset.id = post.id;
      const remove = el('button', 'account-secondary board-danger', 'Delete post');
      remove.type = 'button';
      remove.dataset.boardAction = 'delete';
      remove.dataset.id = post.id;
      tools.append(edit, remove);
      els.detail.append(tools);
    }
  }

  // ---------------------------------------------------------------------------
  // Modes and routing (index.html?view=board#post-<id>)
  // ---------------------------------------------------------------------------
  function setMode(mode) {
    state.mode = mode;
    els.browse.hidden = mode !== 'browse';
    els.detail.hidden = mode !== 'detail';
    els.composer.hidden = mode !== 'compose';
  }

  function currentPostId() {
    const match = /^#post-([0-9a-f-]{36})$/i.exec(location.hash);
    return match ? match[1].toLowerCase() : null;
  }

  async function route({ focus = false } = {}) {
    const profileId = state.me?.id || null;
    if (state.loadedFor !== profileId && !state.loading) {
      els.status.textContent = 'Loading posts…';
      await load();
    } else if (state.loading) {
      await state.loading;
    }
    if (state.mode === 'compose') return;
    const id = currentPostId();
    if (id) {
      renderDetail(id);
      setMode('detail');
      if (focus) ($('board-detail-title') || els.detail.querySelector('h2'))?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      renderBrowse();
      setMode('browse');
    }
  }

  function go(id) {
    const url = postURL(id);
    if (url.href !== location.href) history.pushState(null, '', url);
    showError('');
    showNotice('');
    route({ focus: true });
  }

  // ---------------------------------------------------------------------------
  // Composer
  // ---------------------------------------------------------------------------
  function toLocalInput(value, withTime) {
    if (!value) return '';
    const date = new Date(value);
    const pad = number => String(number).padStart(2, '0');
    const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return withTime ? `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
  }

  function fillBoardOptions(selected) {
    const { isStaff, stewardAreas } = access();
    els.board.replaceChildren();
    if (isStaff) els.board.append(new Option('Union-wide', 'union'));
    const ids = isStaff ? state.areas.map(area => area.id) : stewardAreas;
    for (const id of ids) els.board.append(new Option(boardName(id), String(id)));
    const value = selected === undefined ? null : selected;
    const wanted = value == null ? 'union' : String(value);
    els.board.value = [...els.board.options].some(option => option.value === wanted) ? wanted : els.board.options[0]?.value || '';
  }

  function updateFlyerUI() {
    const existing = state.editing?.image_path && !state.flyer.removeExisting;
    const file = state.flyer.file;
    const has = Boolean(file || existing);
    els.flyerCurrent.hidden = !has;
    els.altField.hidden = !has;
    if (file) els.flyerName.textContent = `New flyer: ${file.name}`;
    else if (existing) els.flyerName.textContent = isPdf(state.editing.image_path) ? 'Current flyer (PDF)' : 'Current flyer (image)';
    // Only an image can stand in for the whole post on the board.
    const image = file ? !(file.type === 'application/pdf' || isPdf(file.name)) : Boolean(existing) && !isPdf(state.editing.image_path);
    els.flyerOnlyField.hidden = !image;
    if (!image) els.flyerOnly.checked = false;
  }

  function openComposer(post = null) {
    if (!access().canPostAnywhere) return;
    state.editing = post;
    state.flyer = { file: null, removeExisting: false };
    els.composer.reset();
    fillBoardOptions(post ? post.area_id : (els.filter.value && els.filter.value !== 'union' ? Number(els.filter.value) : undefined));
    els.composerTitle.textContent = post ? 'Edit post' : 'New post';
    els.category.value = post?.category || 'announcement';
    for (const radio of els.composer.querySelectorAll('input[name="post-visibility"]')) {
      radio.checked = radio.value === (post?.visibility || 'members');
    }
    els.title.value = post?.title || '';
    els.summary.value = post?.summary || '';
    els.body.value = post?.body || '';
    els.event.value = toLocalInput(post?.event_starts_at, true);
    els.expires.value = toLocalInput(post?.expires_at, false);
    els.link.value = post?.link_url || '';
    els.alt.value = post?.image_alt || '';
    els.pinned.checked = Boolean(post?.pinned);
    els.flyerOnly.checked = Boolean(post?.flyer_only);
    els.publish.textContent = post?.status === 'published' ? 'Update post' : 'Publish';
    els.draft.textContent = post?.status === 'published' ? 'Move to drafts' : 'Save as draft';
    updateFlyerUI();
    showError('');
    showNotice('');
    setMode('compose');
    window.scrollTo({ top: 0, behavior: 'instant' });
    els.composerTitle.focus({ preventScroll: true });
  }

  function closeComposer() {
    state.editing = null;
    state.flyer = { file: null, removeExisting: false };
    setMode('browse');
    route({ focus: true });
  }

  async function decodeImage(file) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(file); } catch { /* fall back below */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  // Phone photos of flyers are often 5–10 MB. Shrink them before upload.
  async function prepareFlyer(file) {
    if (file.type === 'application/pdf' || isPdf(file.name)) {
      if (file.size > MAX_FILE_BYTES) throw userError('That PDF is larger than 10 MB. Try a smaller copy.');
      return { blob: file, ext: 'pdf', type: 'application/pdf' };
    }
    if (!file.type.startsWith('image/')) throw userError('Attach an image (JPG, PNG, WebP, GIF) or a PDF.');
    // Re-drawing a GIF would keep only its first frame, so animated flyers
    // upload exactly as they are.
    if (file.type === 'image/gif') {
      if (file.size > MAX_FILE_BYTES) {
        throw userError('That GIF is larger than 10 MB. Animated GIFs upload as they are, so try a shorter or smaller one.');
      }
      return { blob: file, ext: 'gif', type: 'image/gif' };
    }
    let image;
    try {
      image = await decodeImage(file);
    } catch {
      throw userError("That image couldn't be opened. Try saving it as a JPG or PNG first.");
    }
    const width = image.width || image.naturalWidth;
    const height = image.height || image.naturalHeight;
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; // flatten transparency onto paper white
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close?.();
    let blob = await canvasBlob(canvas, 'image/webp', 0.82);
    let ext = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasBlob(canvas, 'image/jpeg', 0.85);
      ext = 'jpg';
    }
    if (!blob) throw userError("That image couldn't be prepared for upload.");
    if (blob.size > MAX_FILE_BYTES) throw userError('That image is still larger than 10 MB after shrinking it.');
    return { blob, ext, type: blob.type };
  }

  function newPath(folder, ext) {
    return `${folder}/${crypto.randomUUID()}.${ext}`;
  }

  async function uploadTo(client, bucket, path, blob, type) {
    const { error } = await client.storage.from(bucket).upload(path, blob, { contentType: type, upsert: false, cacheControl: '31536000' });
    if (error) throw error;
    return { bucket, path };
  }

  async function removeFile(client, file) {
    if (!file?.path) return;
    await client.storage.from(file.bucket).remove([file.path]).catch(() => {});
  }

  function readForm(status) {
    const title = els.title.value.trim();
    const summary = els.summary.value.trim();
    if (!title) throw Object.assign(userError('Give the post a title.'), { field: els.title });
    if (!summary) throw Object.assign(userError('Add a short summary. It is what people see on the board.'), { field: els.summary });

    let link = els.link.value.trim();
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
    if (link) {
      try {
        const url = new URL(link);
        if (url.protocol !== 'https:') throw new Error();
        link = url.href;
      } catch {
        throw Object.assign(userError('Links must be secure web addresses that start with https://.'), { field: els.link });
      }
    }

    const event = els.event.value ? new Date(els.event.value) : null;
    const expires = els.expires.value ? new Date(`${els.expires.value}T23:59:59`) : null;
    if (event && expires && expires < event) {
      throw Object.assign(userError('The take-down date is before the event. Choose a later date.'), { field: els.expires });
    }

    const hasFlyer = state.flyer.file || (state.editing?.image_path && !state.flyer.removeExisting);
    const alt = els.alt.value.trim();
    if (hasFlyer && !alt) throw Object.assign(userError('Describe the flyer so everyone can read it.'), { field: els.alt });

    const boardValue = els.board.value;
    const areaId = boardValue === 'union' ? null : Number(boardValue);
    if (!access().canPostTo(areaId)) throw userError("You can't post to that board.");

    return {
      area_id: areaId,
      category: els.category.value,
      visibility: els.composer.querySelector('input[name="post-visibility"]:checked')?.value || 'members',
      title,
      summary,
      body: els.body.value.trim() || null,
      event_starts_at: event ? event.toISOString() : null,
      expires_at: expires ? expires.toISOString() : null,
      link_url: link || null,
      pinned: els.pinned.checked,
      flyer_only: els.flyerOnly.checked && !els.flyerOnlyField.hidden,
      status,
      alt,
    };
  }

  async function savePost(status) {
    const form = readForm(status);
    const client = await UCPEAAccount.getClient();
    const editing = state.editing;
    const folder = form.area_id == null ? 'union' : String(form.area_id);
    const bucket = form.visibility === 'public' ? 'board-public' : 'board-members';
    const existing = editing?.image_path ? { bucket: editing.image_bucket, path: editing.image_path } : null;

    let image = existing && !state.flyer.removeExisting ? existing : null;
    const uploaded = [];
    const obsolete = [];
    try {
      if (state.flyer.file) {
        const prepared = await prepareFlyer(state.flyer.file);
        const file = await uploadTo(client, bucket, newPath(folder, prepared.ext), prepared.blob, prepared.type);
        uploaded.push(file);
        if (existing) obsolete.push(existing);
        image = file;
      } else if (image && (image.bucket !== bucket || image.path.split('/')[0] !== folder)) {
        // The board or audience changed: move the flyer to match, so storage
        // permissions keep following the post.
        const { data: blob, error } = await client.storage.from(image.bucket).download(image.path);
        if (error) throw error;
        const ext = image.path.split('.').pop();
        const types = { pdf: 'application/pdf', gif: 'image/gif', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
        const file = await uploadTo(client, bucket, newPath(folder, ext), blob, blob.type || types[ext] || 'image/webp');
        uploaded.push(file);
        obsolete.push(image);
        image = file;
      }
      if (state.flyer.removeExisting && existing) obsolete.push(existing);

      const { alt, ...fields } = form;
      const record = {
        ...fields,
        image_bucket: image?.bucket || null,
        image_path: image?.path || null,
        image_alt: image ? alt : null,
      };
      const query = editing
        ? client.from('posts').update(record).eq('id', editing.id).select('id').single()
        : client.from('posts').insert(record).select('id').single();
      const { data, error } = await query;
      if (error) throw error;

      for (const file of obsolete) await removeFile(client, file);
      return data.id;
    } catch (error) {
      for (const file of uploaded) await removeFile(client, file);
      throw error;
    }
  }

  els.composer.addEventListener('submit', async event => {
    event.preventDefault();
    const status = event.submitter?.value === 'draft' ? 'draft' : 'published';
    const controls = els.composer.querySelectorAll('button, input, select, textarea');
    showError('');
    let id;
    try {
      for (const control of controls) control.disabled = true;
      els.composer.setAttribute('aria-busy', 'true');
      showNotice(state.flyer.file ? 'Uploading the flyer and saving…' : 'Saving…');
      id = await savePost(status);
    } catch (error) {
      showNotice('');
      showError(friendlyError(error));
      error.field?.focus();
      return;
    } finally {
      for (const control of controls) control.disabled = false;
      els.composer.removeAttribute('aria-busy');
    }
    const wasEditing = Boolean(state.editing);
    state.editing = null;
    setMode('browse');
    await load();
    go(id);
    showNotice(status === 'draft'
      ? 'Saved as a draft. Only people who can post to this board can see it.'
      : (wasEditing ? 'Your changes are published.' : 'Your post is published.'));
  });

  els.cancel.addEventListener('click', closeComposer);

  els.flyer.addEventListener('change', () => {
    const file = els.flyer.files?.[0] || null;
    showError('');
    if (file && file.size > 40 * 1024 * 1024) {
      showError('That file is too large. Choose one under 40 MB; images are shrunk before upload.');
      els.flyer.value = '';
      return;
    }
    state.flyer.file = file;
    updateFlyerUI();
    if (file && !els.alt.value) els.alt.focus();
  });

  els.flyerRemove.addEventListener('click', () => {
    if (state.flyer.file) {
      state.flyer.file = null;
      els.flyer.value = '';
    } else {
      state.flyer.removeExisting = true;
    }
    updateFlyerUI();
    els.flyer.focus();
  });

  // ---------------------------------------------------------------------------
  // Clicks: open posts, edit, delete
  // ---------------------------------------------------------------------------
  function plainClick(event) {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }

  async function deletePost(target) {
    if (target.dataset.armed !== 'true') {
      target.dataset.armed = 'true';
      target.dataset.label = target.textContent;
      target.textContent = 'Delete this post? Click again';
      clearTimeout(state.confirmTimer);
      state.confirmTimer = setTimeout(() => {
        target.dataset.armed = 'false';
        target.textContent = target.dataset.label;
      }, 5000);
      return;
    }
    clearTimeout(state.confirmTimer);
    const post = state.posts.find(item => item.id === target.dataset.id);
    if (!post) return;
    target.disabled = true;
    showError('');
    try {
      const client = await UCPEAAccount.getClient();
      const { data, error } = await client.from('posts').delete().eq('id', post.id).select('id');
      if (error) throw error;
      if (!data?.length) throw Object.assign(new Error('No rows'), { code: 'no_rows' });
      await removeFile(client, post.image_path ? { bucket: post.image_bucket, path: post.image_path } : null);
      await load();
      go(null);
      showNotice(`"${post.title}" was deleted.`);
    } catch (error) {
      showError(friendlyError(error));
      target.disabled = false;
    }
  }

  view.addEventListener('click', event => {
    const postLink = event.target.closest('a[data-board-post]');
    if (postLink && plainClick(event)) {
      // Handled here so the dashboard's own router doesn't reload the view.
      event.preventDefault();
      event.stopPropagation();
      go(postLink.dataset.boardPost || null);
      return;
    }
    if (event.target.closest('button[data-board-motion]')) {
      toggleMotion();
      return;
    }
    const action = event.target.closest('button[data-board-action]');
    if (!action || action.disabled) return;
    if (action.dataset.boardAction === 'edit') {
      openComposer(state.posts.find(post => post.id === action.dataset.id));
    } else if (action.dataset.boardAction === 'delete') {
      deletePost(action);
    }
  });

  els.newPost.addEventListener('click', () => openComposer());
  els.filter.addEventListener('change', renderBrowse);
  els.past.addEventListener('change', renderBrowse);
  for (const button of els.layoutButtons) {
    button.addEventListener('click', () => setLayout(button.dataset.boardLayout, true));
  }

  // ---------------------------------------------------------------------------
  // Start-up
  // ---------------------------------------------------------------------------
  window.addEventListener('popstate', () => {
    if (view.hidden) return;
    if (state.mode === 'compose') {
      state.editing = null;
      setMode('browse');
    }
    route();
  });

  new MutationObserver(() => {
    if (!view.hidden) route();
  }).observe(view, { attributes: true, attributeFilter: ['hidden'] });

  document.addEventListener('ucpea-account', event => {
    const profile = event.detail.profile;
    const changed = (profile?.id || null) !== (state.me?.id || null)
      || profile?.status !== state.me?.status
      || JSON.stringify(profile?.areas || []) !== JSON.stringify(state.me?.areas || []);
    state.me = profile;
    if (!profile) writeStorage(SNAPSHOT_KEY, null); // members-only posts leave with the person
    if (!changed) return;
    state.loadedFor = undefined;
    if (!view.hidden) {
      if (state.mode === 'compose' && !access().canPostAnywhere) setMode('browse');
      route();
    }
  });

  state.me = UCPEAAccount.profile;
  state.motionPaused = preferredMotion();
  setLayout(preferredLayout());
  setMode('browse');
  if (!view.hidden) route();
})();
