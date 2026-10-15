/**
 * Pure helpers for the wall-monitor view (#/wall).
 *
 * The wall is laid out on a fixed virtual canvas (WALL_BASE) and scaled up to
 * the screen, so a 1080p and a 1440p monitor show the same layout, just larger.
 */

// Virtual canvas the wall is designed for (16:9).
export const WALL_BASE = { width: 1280, height: 720 };
// Below this viewport width the wall does not scale and the page may scroll
// (phones, small tablets).
export const WALL_MIN_WIDTH = 1024;

/** True when a location hash opens the wall: "#/wall", "#wall", "#/wall/". */
export function isWallHash(hash) {
  const page = String(hash || '').replace(/^#?\/?/, '').split(/[/?]/)[0];
  return page === 'wall';
}

/**
 * Scale factor and virtual size for a viewport.
 * Returns { scale, width, height, fixed }: render the wall at width × height
 * CSS px and transform it by `scale`. `fixed` is false on narrow screens,
 * where the wall renders unscaled and may scroll.
 */
export function wallScale(viewWidth, viewHeight, base = WALL_BASE) {
  const w = Number(viewWidth) || 0;
  const h = Number(viewHeight) || 0;
  if (w < WALL_MIN_WIDTH || h <= 0) return { scale: 1, width: w, height: h, fixed: false };
  const raw = Math.min(w / base.width, h / base.height);
  const scale = Math.max(0.75, Math.min(3, raw));
  return { scale, width: w / scale, height: h / scale, fixed: true };
}

/**
 * Scale that fits content into a box without growing it (max 1). Used to keep
 * the cluster map on screen when a node has many guests. Below `min` the
 * content would be unreadable, so `min` wins.
 */
export function fitScale(contentWidth, contentHeight, boxWidth, boxHeight, min = 0.4) {
  if (!(contentWidth > 0) || !(contentHeight > 0) || !(boxWidth > 0) || !(boxHeight > 0)) return 1;
  const s = Math.min(1, boxWidth / contentWidth, boxHeight / contentHeight);
  return Math.max(min, s);
}
