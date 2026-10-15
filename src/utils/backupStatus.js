// Guest backup line for the guest panel, from the collector's `backup`
// summary (vzdump task logs, see proxbalance/backups.py) and `has_backup`
// (a backup job covers the guest).

// Must match BACKUP_LOOKBACK_DAYS in proxbalance/backups.py.
export const BACKUP_LOOKBACK_DAYS = 14;
// A good backup older than this is shown amber.
export const BACKUP_STALE_DAYS = 3;

export function fmtAge(epochSec, nowSec) {
  const s = Math.max(0, nowSec - epochSec);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function fmtDuration(sec) {
  if (sec == null) return null;
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Returns { text, tone, detail } where tone is ok | warn | bad | neutral.
 * `guest.backup` undefined: the task logs were not read (older collector or
 * no permission), so only job coverage is known. null: none found.
 */
export function backupView(guest, nowSec = Date.now() / 1000) {
  const inJob = guest?.has_backup !== false;
  const b = guest?.backup;
  const days = BACKUP_LOOKBACK_DAYS;

  if (b === undefined) {
    return inJob
      ? { text: 'In a backup job', tone: 'neutral', detail: "Backup results weren't read; this only says a job covers it." }
      : { text: 'Not in a backup job', tone: 'warn', detail: null };
  }
  if (b === null) {
    return inJob
      ? { text: `None in ${days} days`, tone: 'warn', detail: `A backup job covers it, but no backup of it ran in the last ${days} days.` }
      : { text: 'Not backed up', tone: 'warn', detail: `No backup job covers it and no backup of it ran in the last ${days} days.` };
  }

  const counts = `${b.ok_count} good, ${b.fail_count} failed in ${days} days.`;
  const manual = inJob ? '' : ' Not in a backup job: these were run by hand.';

  if (b.last_attempt_ok === false) {
    const lastGood = b.last_ok ? `last good ${fmtAge(b.last_ok, nowSec)}` : `none good in ${days} days`;
    return {
      text: `Failed ${fmtAge(b.last_attempt, nowSec)} · ${lastGood}`,
      tone: 'bad',
      detail: `${b.last_error || 'No error text in the log'}${b.last_node ? ` (on ${b.last_node})` : ''}. ${counts}${manual}`,
    };
  }

  const stale = nowSec - b.last_ok > BACKUP_STALE_DAYS * 86400;
  const took = fmtDuration(b.last_ok_duration_s);
  return {
    text: [fmtAge(b.last_ok, nowSec), b.last_ok_storage].filter(Boolean).join(' · '),
    tone: stale ? 'warn' : 'ok',
    detail: `${took ? `Took ${took}` : 'Finished'}${b.last_node ? ` on ${b.last_node}` : ''}. ${counts}${manual}`,
  };
}
