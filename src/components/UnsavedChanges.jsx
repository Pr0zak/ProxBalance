import { Save, RotateCcw, Loader } from './Icons.jsx';
import { BTN_PRIMARY, BTN_SECONDARY } from '../utils/designTokens.js';

const { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } = React;

/**
 * One save model for a settings page.
 *
 * Every editable group registers { count, save, discard } under a key. The page
 * renders <UnsavedBar> which shows "N unsaved changes · Discard · Save" and
 * runs every registered saver in registration order. Groups never save on
 * their own.
 */
export const UnsavedContext = createContext(null);

export function useUnsavedRegistry() {
  const saversRef = useRef({});
  const orderRef = useRef([]);
  const [counts, setCounts] = useState({});
  const [saving, setSaving] = useState(false);

  // `order` sets save order (lower first); ties keep registration order.
  const register = useCallback((key, count, save, discard, order = 0) => {
    saversRef.current[key] = { save, discard, order };
    if (!orderRef.current.includes(key)) orderRef.current.push(key);
    setCounts(prev => (prev[key] === count ? prev : { ...prev, [key]: count }));
  }, []);

  const unregister = useCallback((key) => {
    delete saversRef.current[key];
    orderRef.current = orderRef.current.filter(k => k !== key);
    setCounts(prev => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);

  const saveAll = useCallback(async () => {
    setSaving(true);
    try {
      const keys = orderRef.current
        .map((k, i) => [k, i])
        .sort((a, b) => (saversRef.current[a[0]]?.order ?? 0) - (saversRef.current[b[0]]?.order ?? 0) || a[1] - b[1])
        .map(([k]) => k);
      for (const key of keys) {
        if (!counts[key]) continue;
        await saversRef.current[key]?.save();
      }
    } finally {
      setSaving(false);
    }
  }, [counts]);

  const discardAll = useCallback(() => {
    for (const key of orderRef.current) {
      if (counts[key]) saversRef.current[key]?.discard();
    }
  }, [counts]);

  const context = useMemo(() => ({ register, unregister }), [register, unregister]);
  return { context, total, saving, saveAll, discardAll };
}

/** Register an editable group with the nearest UnsavedContext. */
export function useUnsaved(key, count, save, discard, order = 0) {
  const ctx = useContext(UnsavedContext);
  // Re-register every render so the registry always holds fresh closures;
  // the registry only re-renders when the count actually changes.
  useEffect(() => { ctx?.register(key, count, save, discard, order); });
  useEffect(() => () => ctx?.unregister(key), [ctx, key]);
}

/** Count differing leaf values between two plain JSON-ish objects. */
export function countChanges(a, b) {
  if (a === b) return 0;
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  if (isObj(a) && isObj(b)) {
    let n = 0;
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) n += countChanges(a[k], b[k]);
    return n;
  }
  return JSON.stringify(a) === JSON.stringify(b) ? 0 : 1;
}

/** Warn before closing the tab while changes are pending. */
export function useBeforeUnload(active) {
  useEffect(() => {
    if (!active) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}

export function UnsavedBar({ total, saving, onSave, onDiscard }) {
  if (!total && !saving) return null;
  return (
    <div className="sticky bottom-[84px] sm:bottom-4 z-40 mt-4">
      <div className="mx-auto max-w-3xl flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-pb-modal">
        <span className="text-sm text-pb-text dark:text-gray-200">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2 align-middle" />
          {saving ? 'Saving…' : `${total} unsaved change${total !== 1 ? 's' : ''}`}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onDiscard} disabled={saving} className={`${BTN_SECONDARY} text-sm`}>
            <RotateCcw size={14} /> Discard
          </button>
          <button onClick={onSave} disabled={saving} className={`${BTN_PRIMARY} text-sm`}>
            {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />} Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
