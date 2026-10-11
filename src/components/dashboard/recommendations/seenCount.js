// "Seen in N runs": how many consecutive automation runs have recommended
// moving this guest. Fields come from the API (seen_count, seen_required,
// seen_same_target, seen_status); they're absent when the count is unknown,
// and then nothing is shown.
//
// Automation counts per guest, not per target, so a change of target does
// not restart seen_count. seen_same_target says how many of those runs named
// the target shown now, so the UI can say when the target is newer than the
// count.

/** The seen-count summary for a rec, or null when there's nothing to show. */
export function seenCountInfo(rec) {
  const count = rec?.seen_count;
  const required = rec?.seen_required;
  if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(required) || required <= 0) return null;
  const same = Number.isFinite(rec.seen_same_target) ? rec.seen_same_target : null;
  const targetNewer = same != null && same < count;
  const met = count >= required;
  const ready = rec.seen_status === 'ready';
  return {
    count, required, same, targetNewer, met, ready,
    label: met ? `seen ${count}×` : `seen ${count} of ${required} runs`,
    color: targetNewer ? 'yellow' : ready ? 'green' : 'purple',
  };
}

/** Plain-language explanation lines for the tap/hover detail. */
export function seenCountDetail(rec, info = seenCountInfo(rec)) {
  if (!info) return [];
  const { count, required, same, met, ready, targetNewer } = info;
  const lines = [
    `Seen in ${count} consecutive automation run${count === 1 ? '' : 's'}; automation acts after ${required}.`,
  ];
  if (ready) lines.push('Count met: automation can act on its next run if the other checks pass.');
  else if (met) lines.push('Count met; automation is still waiting for its minimum data-collection time.');
  if (targetNewer) {
    lines.push(same === 0
      ? `Automation's last run suggested another node, so ${rec.target_node} hasn't been counted yet. The count is per guest: a new target doesn't restart it.`
      : `Only the ${same === 1 ? 'latest run' : `last ${same} of those runs`} named ${rec.target_node}. The count is per guest: a new target doesn't restart it.`);
  }
  return lines;
}
