import { Eye, AlertTriangle, CheckCircle } from '../../Icons.jsx';
import { statusBadge } from '../../../utils/designTokens.js';
import { seenCountInfo, seenCountDetail } from './seenCount.js';

/**
 * "seen 2 of 3 runs" chip for a recommendation row. Hover shows the
 * explanation as a tooltip; tapping toggles it as a line under the row, since
 * phones never see title tooltips. Renders nothing when the count is unknown.
 *
 * Meant to sit inside a `flex flex-wrap` row: the detail line takes the full
 * width (basis-full) so it wraps onto its own line.
 */
export default function SeenCountChip({ rec }) {
  const [open, setOpen] = React.useState(false);
  const info = seenCountInfo(rec);
  if (!info) return null;
  const detail = seenCountDetail(rec, info);
  const Icon = info.targetNewer ? AlertTriangle : info.ready ? CheckCircle : Eye;
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={`${statusBadge(info.color)} !gap-1 !px-1.5 !text-[10px] tabular-nums cursor-pointer`}
        title={detail.join(' ')}
        aria-expanded={open}
        aria-label={`${info.label}. ${detail.join(' ')}`}
        data-seen-chip
      >
        <Icon size={10} /> {info.label}
      </button>
      {open && (
        <div className="basis-full text-[11px] leading-snug text-pb-text2 dark:text-gray-400 space-y-0.5">
          {detail.map((t, i) => <p key={i}>{t}</p>)}
        </div>
      )}
    </>
  );
}
