import { CheckCircle, XCircle, AlertCircle, Info, X } from './Icons.jsx';

const { useState, useEffect } = React;

/**
 * App-wide toasts for the result of user actions (saves, restarts, migrations,
 * tag changes). Connection problems with /api/analyze stay on cluster.error and
 * the TopNav badge; everything else goes here.
 *
 * A tiny module-level store, so any hook or component can call notify()
 * without threading a callback through props. <Toaster /> renders the stack.
 */
let nextId = 1;
let toasts = [];
let errorsRaised = 0;
const listeners = new Set();

const emit = () => listeners.forEach(fn => fn(toasts));

export function dismissToast(id) {
  toasts = toasts.filter(t => t.id !== id);
  emit();
}

/**
 * Show a toast.
 * @param {{tone?: 'success'|'error'|'warn'|'info', message: string, duration?: number}} opts
 *   Errors stay 8s, everything else 4s, unless `duration` is given (0 = sticky).
 * @returns {number} toast id
 */
export function notify({ tone = 'info', message, duration } = {}) {
  if (!message) return null;
  const text = String(message);
  if (tone === 'error') errorsRaised += 1;
  // Collapse an identical toast that is already showing instead of stacking it.
  const dup = toasts.find(t => t.tone === tone && t.message === text);
  if (dup) dismissToast(dup.id);
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, tone, message: text }];
  emit();
  const ms = duration ?? (tone === 'error' ? 8000 : 4000);
  if (ms > 0) setTimeout(() => dismissToast(id), ms);
  return id;
}

/** Shorthand used as the `setError` of action hooks: ignores null/empty. */
export function notifyError(message) {
  if (message) notify({ tone: 'error', message });
}

/** Number of error toasts raised so far (lets callers tell if a step already reported). */
export function errorToastCount() {
  return errorsRaised;
}

const TONES = {
  success: { Icon: CheckCircle, cls: 'border-green-300 dark:border-green-600/50', icon: 'text-green-600 dark:text-green-400' },
  error: { Icon: XCircle, cls: 'border-red-300 dark:border-red-600/50', icon: 'text-red-600 dark:text-red-400' },
  warn: { Icon: AlertCircle, cls: 'border-amber-300 dark:border-amber-500/50', icon: 'text-amber-600 dark:text-amber-400' },
  info: { Icon: Info, cls: 'border-blue-300 dark:border-blue-600/50', icon: 'text-blue-600 dark:text-blue-400' },
};

export function Toaster() {
  const [items, setItems] = useState(toasts);
  useEffect(() => {
    listeners.add(setItems);
    return () => listeners.delete(setItems);
  }, []);
  if (!items.length) return null;
  return (
    <div
      className="fixed z-[80] left-4 right-4 top-16 sm:left-auto sm:right-4 sm:top-auto sm:bottom-16 sm:w-96 flex flex-col gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {items.map(t => {
        const { Icon, cls, icon } = TONES[t.tone] || TONES.info;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 px-3 py-2.5 rounded-xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-pb-modal ${cls}`}
          >
            <Icon size={16} className={`shrink-0 mt-0.5 ${icon}`} />
            <span className="flex-1 min-w-0 text-sm text-pb-text dark:text-gray-200 break-words">{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 -mr-1 p-0.5 rounded text-pb-text2 dark:text-gray-500 hover:text-pb-text dark:hover:text-gray-200"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
