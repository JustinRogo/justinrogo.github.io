export const EMBED_ATTRIBUTES = ['data-update-embed','data-url','data-title','data-description','data-image'];
export function webUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !url.hostname.includes('.') || /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(url.hostname)) return null;
    if (/^(?:0|10|127)\.|^169\.254\.|^192\.168\.|^172\.(?:1[6-9]|2\d|3[01])\./.test(url.hostname)) return null;
    return url;
  } catch { return null; }
}
export function youtubeVideo(value) {
  const url = webUrl(value);
  if (!url) return null;
  let id;
  if (url.hostname === 'youtu.be') id = url.pathname.split('/')[1];
  else if (['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com','youtube-nocookie.com'].includes(url.hostname)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (/^\/(?:shorts|live|embed)\//.test(url.pathname)) id = url.pathname.split('/')[2];
  }
  if (!/^[\w-]{11}$/.test(id || '')) return null;
  const raw = url.searchParams.get('t') || url.searchParams.get('start') || '';
  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
  const start = Math.min(86400, Math.max(0, /^\d+$/.test(raw) ? Number(raw) : parts ? Number(parts[1] || 0)*3600 + Number(parts[2] || 0)*60 + Number(parts[3] || 0) : 0));
  return { id, start };
}
export function readEmbed(figure) {
  const kind = figure.dataset.updateEmbed;
  const url = webUrl(figure.dataset.url);
  if (!url || !['link','youtube'].includes(kind) || (kind === 'youtube' && !youtubeVideo(url.href))) return null;
  return { kind, url:url.href, title:(figure.dataset.title || url.hostname).slice(0,240), description:(figure.dataset.description || '').slice(0,360), image:webUrl(figure.dataset.image)?.href || '' };
}
const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
export function serializeEmbeds(values) {
  return values.map(embed => `<figure data-update-embed="${escape(embed.kind)}" data-url="${escape(embed.url)}" data-title="${escape(embed.title)}" data-description="${escape(embed.description)}" data-image="${escape(embed.image)}"><a href="${escape(embed.url)}" target="_blank" rel="noopener noreferrer"><strong>${escape(embed.title)}</strong></a></figure>`).join('');
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function renderEmbed(embed, { editor = false } = {}) {
  const wrap = element('div', null, 'post-embed');
  const video = embed.kind === 'youtube' ? youtubeVideo(embed.url) : null;
  if (video && !editor) {
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${video.id}${video.start ? `?start=${video.start}` : ''}`;
    frame.title = embed.title || 'YouTube video';
    frame.className = 'youtube-player';
    frame.loading = 'lazy';
    frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    wrap.append(frame);
    const fallback = element('a', 'Watch on YouTube', 'video-fallback');
    fallback.href = embed.url; fallback.target = '_blank'; fallback.rel = 'noopener noreferrer';
    wrap.append(fallback);
    return wrap;
  }
  const card = element('a', null, 'link-preview');
  card.href = embed.url; card.target = '_blank'; card.rel = 'noopener noreferrer';
  if (embed.image && webUrl(embed.image)) {
    const image = document.createElement('img');
    image.src = embed.image; image.alt = ''; image.className = 'link-preview-image';
    image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => image.remove(), { once:true });
    card.append(image);
  }
  const content = element('span', null, 'link-preview-content');
  content.append(element('strong', embed.title || new URL(embed.url).hostname, 'link-preview-title'));
  if (embed.description) content.append(element('span', embed.description, 'link-preview-description'));
  content.append(element('span', new URL(embed.url).hostname.replace(/^www\./,''), 'link-preview-domain'));
  card.append(content); wrap.append(card);
  return wrap;
}
export function upgradeEmbeds(container) {
  for (const figure of container.querySelectorAll('figure[data-update-embed]')) {
    const embed = readEmbed(figure);
    if (embed) figure.replaceWith(renderEmbed(embed));
    else figure.remove();
  }
}
