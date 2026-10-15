import { ChevronDown, RefreshCw, Settings, Users, Zap } from '../Icons.jsx';
import {
  BTN_SECONDARY, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE, TAP_TARGET,
} from '../../utils/designTokens.js';
import { API_BASE } from '../../utils/constants.js';
import {
  SOURCE_CHIPS, TYPE_CHIPS, buildQuery, detailRows, eventTone, formatWhen,
} from '../../utils/changeLog.js';

const { useState, useEffect, useRef } = React;

const SOURCE_ICON = { user: Users, automation: Zap, system: Settings };
const SOURCE_TITLE = { user: 'Person', automation: 'Automation', system: 'System' };

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${FILTER_CHIP} ${active ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
    >
      {children}
    </button>
  );
}

/**
 * Change log: one line per audit event (time, source icon, summary), newest
 * first. Filter by source or type; tap a line for its details.
 */
export default function ChangeLog({ active }) {
  const [source, setSource] = useState(null);
  const [type, setType] = useState(null);
  const [events, setEvents] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(() => new Set());
  const loadedFor = useRef(null);

  const load = async (before = null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/audit-log?${buildQuery({ source, type, before })}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setEvents(prev => (before ? prev.concat(data.events) : data.events));
      setNext(data.next || null);
    } catch (e) {
      setError(e.message || 'Could not load the change log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const key = `${source}|${type}`;
    if (!active || loadedFor.current === key) return;
    loadedFor.current = key;
    setOpen(new Set());
    load();
  }, [active, source, type]);

  const toggle = (id) => setOpen(prev => {
    const s = new Set(prev);
    if (s.has(id)) s.delete(id); else s.add(id);
    return s;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {SOURCE_CHIPS.map(c => (
          <Chip key={c.id} active={source === c.id} onClick={() => setSource(source === c.id ? null : c.id)}>{c.label}</Chip>
        ))}
        {TYPE_CHIPS.map(c => (
          <Chip key={c.id} active={type === c.id} onClick={() => setType(type === c.id ? null : c.id)}>{c.label}</Chip>
        ))}
        <button
          onClick={() => load()}
          className={`${TAP_TARGET} ${BTN_SECONDARY} !px-3 !py-1.5 ml-auto`}
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <div className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</div>}

      <ul className="divide-y divide-slate-100 dark:divide-pb-border-dark/70">
        {events.map(ev => {
          const Icon = SOURCE_ICON[ev.source] || Settings;
          const isOpen = open.has(ev.id);
          const bad = eventTone(ev.action) === 'bad';
          const when = formatWhen(ev.ts);
          return (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => toggle(ev.id)}
                aria-expanded={isOpen}
                className="w-full text-left flex items-start gap-2 py-2 min-h-[40px] sm:min-h-0 hover:bg-slate-50 dark:hover:bg-pb-hover-dark rounded"
              >
                <span className="shrink-0 w-16 sm:w-24 text-xs tabular-nums text-pb-text2 dark:text-gray-400 pt-px leading-tight">
                  {when.day && <span className="block sm:inline sm:mr-1">{when.day}</span>}
                  <span className="block sm:inline">{when.time}</span>
                </span>
                <span className="shrink-0 mt-0.5 text-pb-text2 dark:text-gray-400" title={SOURCE_TITLE[ev.source] || ev.source}>
                  <Icon size={14} />
                  <span className="sr-only">{SOURCE_TITLE[ev.source] || ev.source}</span>
                </span>
                <span className={`flex-1 min-w-0 text-sm break-words ${bad ? 'text-red-700 dark:text-red-400' : 'text-pb-text dark:text-gray-200'}`}>
                  {ev.summary}
                </span>
                <ChevronDown size={14} className={`shrink-0 mt-0.5 text-pb-text2 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <dl className="ml-[5.5rem] sm:ml-[7.5rem] mb-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-xs">
                  {detailRows(ev).map(([k, v]) => [
                    <dt key={`${k}-k`} className="text-pb-text2 dark:text-gray-400">{k}</dt>,
                    <dd key={`${k}-v`} className="font-mono text-pb-text dark:text-gray-300 whitespace-pre-wrap break-all">{v}</dd>,
                  ])}
                </dl>
              )}
            </li>
          );
        })}
      </ul>

      {!loading && events.length === 0 && !error && (
        <div className="py-6 text-center text-sm text-pb-text2 dark:text-gray-400">No changes recorded</div>
      )}
      {loading && events.length === 0 && (
        <div className="py-6 text-center text-sm text-pb-text2 dark:text-gray-400">Loading…</div>
      )}
      {next && (
        <div className="mt-3 flex justify-center">
          <button onClick={() => load(next)} disabled={loading} className={`${TAP_TARGET} ${BTN_SECONDARY} !px-3 !py-1.5 !text-xs`}>
            Older
          </button>
        </div>
      )}
    </div>
  );
}
