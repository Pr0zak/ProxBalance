import { backupDays, backupDayText } from '../../utils/backupStatus.js';

const { useState, useEffect } = React;

const DAYS = 30;

const CELL = {
  ok: 'bg-green-500 dark:bg-green-500/80',
  failed: 'bg-red-500',
  none: 'bg-pb-border dark:bg-slate-600',
  unknown: 'border border-dashed border-pb-border dark:border-slate-600',
};

/**
 * One cell per day for the last 30 days: green good, red failed, grey no
 * backup, dashed outline before ProxBalance started recording. Tap a cell
 * for that day's result. Data: GET /api/guests/<vmid>/backups.
 */
export default function BackupStrip({ vmid, API_BASE }) {
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    if (vmid == null) return undefined;
    let cancelled = false;
    setData(null); setPicked(null);
    fetch(`${API_BASE}/guests/${vmid}/backups?days=${DAYS}`)
      .then(r => r.json())
      .then(j => { if (!cancelled && j.success) setData(j); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [vmid, API_BASE]);

  // Nothing recorded for any guest yet: the Backup row already says what is known.
  if (!data || data.recorded_from == null) return null;

  const days = backupDays(data.runs, DAYS, Date.now() / 1000, data.recorded_from);
  const good = days.filter(d => d.status === 'ok').length;
  const failed = days.filter(d => d.status === 'failed').length;
  const recorded = days.filter(d => d.status !== 'unknown').length;
  const sel = picked != null ? days[picked] : null;

  return (
    <div className="py-2 border-b border-pb-border dark:border-slate-700/70 text-[13px]">
      <div className="flex items-baseline justify-between gap-4 mb-1.5">
        <span className="text-pb-text2 dark:text-gray-400">Backups, {DAYS} days</span>
        <span className="text-pb-text dark:text-gray-200">
          {good} good
          {failed > 0 && <span className="text-red-600 dark:text-red-400"> · {failed} failed</span>}
          {recorded < DAYS && <span className="text-pb-text2 dark:text-gray-400"> · {recorded} recorded</span>}
        </span>
      </div>
      <div className="flex gap-[2px]" role="list" aria-label={`Backups over the last ${DAYS} days`}>
        {days.map((d, i) => (
          <button
            key={d.start}
            type="button"
            role="listitem"
            onClick={() => setPicked(picked === i ? null : i)}
            title={backupDayText(d)}
            aria-label={backupDayText(d)}
            className={`flex-1 h-5 rounded-[3px] ${CELL[d.status]} ${picked === i ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-pb-text2 dark:text-gray-500 mt-1">
        <span>{DAYS} days ago</span><span>today</span>
      </div>
      {sel && <div className="mt-1 text-[12px] text-pb-text dark:text-gray-300">{backupDayText(sel)}</div>}
    </div>
  );
}
