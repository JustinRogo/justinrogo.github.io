// Compose actual event titles and optional posters into the gallery's image texture.
// The ordinary DOM cards remain available when motion/WebGL are disabled.
function wrapTitle(context, title, width) {
  const lines = [];
  for (const word of title.split(/\s+/)) {
    const last = lines.at(-1);
    if (!last || context.measureText(`${last} ${word}`).width > width) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  return lines;
}

function loadPoster(url, signal) {
  if (!url || signal.aborted) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const finish = (result) => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      image.onload = image.onerror = null;
      resolve(result);
    };
    const abort = () => { finish(null); image.src = ""; };
    const timeout = setTimeout(() => finish(null), 8000);
    signal.addEventListener("abort", abort, { once: true });
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = url;
  });
}

export async function composeEventCard(event, theme, signal) {
  await document.fonts.ready;
  if (signal.aborted) return null;
  const poster = await loadPoster(event.image, signal);
  if (signal.aborted) return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const dark = theme === "dark";
  context.fillStyle = dark ? "#102b50" : "#f1f6ff";
  context.fillRect(0, 0, 720, 720);

  let size = 42;
  let lines;
  do {
    context.font = `600 ${size}px Geist, Arial, sans-serif`;
    lines = wrapTitle(context, event.title, 624);
    if (lines.length <= 6 || size <= 32) break;
    size -= 2;
  } while (true);
  const lineHeight = size * 1.27;
  const shown = lines.slice(0, 8);
  if (lines.length > shown.length) shown[shown.length - 1] += "…";
  context.fillStyle = dark ? "#eef5ff" : "#112847";
  context.textAlign = "center";
  shown.forEach((line, index) => context.fillText(line, 360, 84 + index * lineHeight, 624));

  const posterTop = 84 + (shown.length - 1) * lineHeight + 42;
  const available = 672 - posterTop;
  if (poster && available > 72) {
    const scale = Math.min(624 / poster.naturalWidth, available / poster.naturalHeight);
    const width = poster.naturalWidth * scale;
    const height = poster.naturalHeight * scale;
    try {
      context.drawImage(poster, (720 - width) / 2, posterTop, width, height);
      return canvas.toDataURL("image/png");
    } catch {
      // A poster that cannot be used as a texture still keeps its event title.
      return null;
    }
  }
  return canvas.toDataURL("image/png");
}
