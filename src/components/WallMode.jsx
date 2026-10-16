import SimpleView from './SimpleView.jsx';
import { PAGE_BG, BTN_SECONDARY } from '../utils/designTokens.js';
import { WALL_MIN_WIDTH } from '../utils/wallMode.js';
import { Maximize, X } from './Icons.jsx';

const { useState, useEffect, useLayoutEffect, useRef } = React;

const HINT_MS = 3000;

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

// Browser fullscreen (best effort) and an exit when the browser leaves it:
// Esc in fullscreen is taken by the browser and never reaches the page.
function useFullscreen(onExit) {
  const entered = useRef(false);
  const [isFs, setIsFs] = useState(() => !!document.fullscreenElement);
  const supported = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  const request = () => {
    if (!supported || document.fullscreenElement) return;
    try {
      const p = document.documentElement.requestFullscreen();
      if (p && p.then) p.then(() => { entered.current = true; }).catch(() => {});
    } catch { /* not allowed without a gesture: the wall still shows */ }
  };
  useEffect(() => {
    request();
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFs(fs);
      if (fs) entered.current = true;
      else if (entered.current) onExit();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    };
  }, []);
  return { supported, isFs, request };
}

// Keep the screen on while the wall is open (best effort; re-taken when the
// tab becomes visible again, since the browser drops the lock when hidden).
function useWakeLock() {
  useEffect(() => {
    if (!navigator.wakeLock?.request) return undefined;
    let alive = true;
    let lock = null;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        const l = await navigator.wakeLock.request('screen');
        if (alive) lock = l; else l.release().catch(() => {});
      } catch { /* denied (battery saver, permissions): the wall still works */ }
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', acquire);
      if (lock && !lock.released) lock.release().catch(() => {});
    };
  }, []);
}


// Smallest scale the Overview is shrunk to so it fits the screen; below it
// the page is drawn at this scale and scrolls by itself.
const WALL_MIN_SCALE = 0.6;
// Auto-scroll: pixels per tick, tick length, and the pause at each end.
const SCROLL_STEP = 1;
const SCROLL_TICK_MS = 40;
const SCROLL_PAUSE_MS = 8000;

/**
 * Lays the content out at a width that, scaled to the screen, fills it, and
 * shrinks it (never below WALL_MIN_SCALE) until it fits the screen height.
 * When even that is too tall, the page scrolls slowly down and back up.
 */
function useWallFit(vp, contentRef) {
  const [fit, setFit] = useState({ s: 1, h: 0 });
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return undefined;
    // Height of the content laid out at the width that scale `s` fills.
    const heightAt = (s) => { el.style.width = `${vp.w / s}px`; return el.offsetHeight; };
    const measure = () => {
      const keep = el.style.width;
      let s = 1;
      let h = heightAt(1);
      if (vp.w >= WALL_MIN_WIDTH && h > vp.h) {
        // Laid out at the screen's width the content is at its tallest, so
        // scaling it by vp.h / h always fits; a wider layout is shorter, so
        // try a few slightly bigger scales and keep the biggest that fits.
        s = Math.max(WALL_MIN_SCALE, vp.h / h);
        h = heightAt(s);
        for (let k = 0; k < 4 && s > WALL_MIN_SCALE; k++) {
          const next = Math.min(1, vp.h / h);
          if (next <= s + 0.005) break;
          const hn = heightAt(next);
          if (hn * next > vp.h + 1) break;
          s = next; h = hn;
        }
        if (s === WALL_MIN_SCALE) h = heightAt(s);
      }
      el.style.width = keep;
      setFit(f => (Math.abs(f.s - s) < 0.002 && f.h === h ? f : { s, h }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    // Re-fit when what is inside changes height (data arriving, a chart).
    let last = el.offsetHeight;
    const ro = new ResizeObserver(() => {
      if (Math.abs(el.offsetHeight - last) < 2) return;
      last = el.offsetHeight;
      measure();
      last = el.offsetHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [vp.w, vp.h]);
  return fit;
}

function useAutoScroll(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let pausedUntil = Date.now() + SCROLL_PAUSE_MS;
    const t = setInterval(() => {
      if (Date.now() < pausedUntil) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 2) return;
      if (window.scrollY >= max - 1) {
        pausedUntil = Date.now() + SCROLL_PAUSE_MS;
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), SCROLL_PAUSE_MS - 1000);
        return;
      }
      window.scrollBy(0, SCROLL_STEP);
    }, SCROLL_TICK_MS);
    return () => clearInterval(t);
  }, [enabled]);
}

/**
 * Full-screen wall-monitor view (#/wall): this browser's Overview (its
 * widgets, sizes and order, see Customize and Arrange) with no menus,
 * scaled to fill the screen. If it is still taller than the screen at
 * WALL_MIN_SCALE it scrolls slowly by itself. Read-only: clicks only bring
 * up the exit control. Keeps the screen awake where the browser allows.
 */
export default function WallMode({ onExit, ...overview }) {
  const vp = useViewport();
  const fs = useFullscreen(onExit);
  useWakeLock();
  const contentRef = useRef(null);
  const fit = useWallFit(vp, contentRef);
  const scaled = fit.h * fit.s;
  useAutoScroll(scaled > vp.h + 4);

  // Exit control: shown on pointer movement / tap / key, hidden after a pause.
  const [hint, setHint] = useState(true);
  const hintTimer = useRef(null);
  const poke = () => {
    setHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), HINT_MS);
  };
  useEffect(() => {
    poke();
    const onKey = (e) => { if (e.key === 'Escape') onExit(); else poke(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(hintTimer.current); };
  }, []);

  return (
    <div className={`${PAGE_BG} min-h-screen overflow-x-hidden ${hint ? '' : 'cursor-none'}`} onPointerMove={poke} onPointerDown={poke}
      style={{ height: fit.h ? Math.max(vp.h, scaled) : undefined }}>
      <div ref={contentRef} className="pointer-events-none select-none origin-top-left"
        style={{ width: `${vp.w / fit.s}px`, transform: fit.s < 1 ? `scale(${fit.s})` : undefined }}>
        <SimpleView {...overview} wall />
      </div>

      <div
        className={`fixed top-3 right-3 z-50 flex items-center gap-2 transition-opacity duration-300 ${hint ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {fs.supported && !fs.isFs && (
          <button type="button" onClick={fs.request} className={BTN_SECONDARY} title="Browser full screen">
            <Maximize size={14} /> Full screen
          </button>
        )}
        <button type="button" onClick={onExit} className={BTN_SECONDARY} title="Leave wall mode (Esc)" aria-keyshortcuts="Escape">
          <X size={14} /> Exit
        </button>
      </div>
    </div>
  );
}
