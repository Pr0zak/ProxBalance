import { Save, RotateCcw, Loader } from './Icons.jsx';
import { BTN_PRIMARY, BTN_SECONDARY } from '../utils/designTokens.js';
import { notify, errorToastCount } from './Toast.jsx';

const { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } = React;

/**
 * One save model for a settings page.
 *
 * Every editable group registers { count, save, discard } under a key. The page
 * renders <UnsavedBar> which shows "N unsaved changes · Discard · Save" and
 * runs every registered saver in registration order. Groups never save on
 * their own.
 *
 * A saver resolves to { ok, error? }. For older savers, `false` means failed
 * and `true`/undefined means ok, unless the saver raised an error toast while
 * it ran (hooks report failures that way). saveAll then shows one toast:
 * "Saved", or "Couldn't save <group>: <error>" for each group that failed.
 */
export const UnsavedContext = createContext(null);

// Human names for the save groups, used in "Couldn't save <group>" toasts.
const GROUP_LABELS = {
  general: 'general settings',
  notifications: 'notification settings',
  collection: 'collection settings',
  recommendationThresholds: 'recommendation thresholds',
  automationConfig: 'automation settings',
  migrationSettings: 'scoring settings',
  penaltyConfig: 'penalty weights',
};
const groupLabel = (key) => GROUP_LABELS[key]
  || key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

/** Normalise whatever a saver returned (or threw) into { ok, error? }. */
async function runSaver(save) {
  const before = errorToastCount();
  let result;
  try {
    result = await save();
  } catch (err) {
    return { ok: false, error: err?.message || String(err), reported: false };
  }
  const reported = errorToastCount() > before;
  if (result && typeof result === 'object' && 'ok' in result) {
    return { ok: !!result.ok, error: result.error, reported };
  }
  if (result === false) return { ok: false, reported };
  return reported ? { ok: false, reported } : { ok: true };
}

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
    const failures = [];
    try {
      const keys = orderRef.current
        .map((k, i) => [k, i])
        .sort((a, b) => (saversRef.current[a[0]]?.order ?? 0) - (saversRef.current[b[0]]?.order ?? 0) || a[1] - b[1])
        .map(([k]) => k);
      // Snapshot the savers now: earlier saves update state and re-register
      // fresh closures, which would no longer see the user's pending edits.
      const savers = { ...saversRef.current };
      for (const key of keys) {
        if (!counts[key] || !savers[key]?.save) continue;
        const res = await runSaver(savers[key].save);
        if (!res.ok) failures.push({ key, ...res });
      }
    } finally {
      setSaving(false);
    }
    // A saver that already raised its own error toast isn't reported twice.
    for (const f of failures) {
      if (f.reported) continue;
      notify({ tone: 'error', message: `Couldn't save ${groupLabel(f.key)}${f.error ? `: ${f.error}` : ''}` });
    }
    if (!failures.length) notify({ tone: 'success', message: 'Saved' });
    return failures.length ? { ok: false, failures } : { ok: true };
  }, [counts]);

  const discardAll = useCallback(() => {
    for (const key of orderRef.current) {
      if (counts[key]) saversRef.current[key]?.discard();
    }
  }, [counts]);

  const context = useMemo(() => ({ register, unregister }), [register, unregister]);
  return { context, counts, total, saving, saveAll, discardAll };
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
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-4 z-40 mt-4">
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
