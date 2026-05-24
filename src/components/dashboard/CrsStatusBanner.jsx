import { Info, AlertTriangle, Server } from '../Icons.jsx';

const CRS_MODE_LABEL = {
  basic: 'Basic (guest count)',
  static: 'Static (configured CPU/RAM)',
  dynamic: 'Dynamic (live utilization)',
};

const CRS_METHOD_LABEL = {
  bruteforce: 'Brute-force (CPU+RAM equal)',
  topsis: 'TOPSIS (memory-weighted)',
};

/**
 * Surfaces the live PVE Cluster Resource Scheduler (CRS) config alongside
 * ProxBalance's own state. Two states:
 *
 *  1. Dueling — CRS `dynamic` mode + auto-rebalance is on AND ProxBalance
 *     automigrate is enabled. Both engines will race on HA-managed guests.
 *     Yellow warning banner explaining the overlap.
 *
 *  2. Informational — CRS is using anything other than vanilla `basic` mode,
 *     OR `ha-rebalance-on-start` is on, OR auto-rebalance is on (but our
 *     automigrate is off). Quiet blue chip-style banner so the user knows
 *     the integration is detected.
 *
 * Hidden entirely when PVE is on the default basic/no-rebalance config —
 * nothing to say, no clutter.
 */
export default function CrsStatusBanner({ pveCrs, automationEnabled, onEdit }) {
  if (!pveCrs || typeof pveCrs !== 'object') return null;

  const mode = pveCrs.ha || 'basic';
  const autoRebalance = !!pveCrs['ha-auto-rebalance'];
  const rebalanceOnStart = !!pveCrs['ha-rebalance-on-start'];
  const dynamicActive = !!pveCrs.dynamic_balancer_active;

  const isDefault = mode === 'basic' && !autoRebalance && !rebalanceOnStart;

  // At the vanilla default, stay unobtrusive — a single muted row that still
  // exposes the editor (otherwise it'd be unreachable until CRS is non-default).
  if (isDefault) {
    return (
      <div className="mb-3 flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-pb-text2 dark:text-gray-500">
        <span className="flex items-center gap-1.5">
          <Server size={12} /> PVE CRS: <span className="font-mono">basic</span> (no auto-balancing)
        </span>
        {onEdit && (
          <button onClick={onEdit} className="underline hover:text-pb-text dark:hover:text-gray-300">Edit</button>
        )}
      </div>
    );
  }

  const dueling = dynamicActive && automationEnabled;

  const tone = dueling
    ? {
        wrap: 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500',
        icon: 'text-yellow-600 dark:text-yellow-400',
        title: 'text-yellow-900 dark:text-yellow-200',
        body: 'text-yellow-800 dark:text-yellow-300/80',
        Icon: AlertTriangle,
      }
    : {
        wrap: 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500',
        icon: 'text-blue-600 dark:text-blue-400',
        title: 'text-blue-900 dark:text-blue-200',
        body: 'text-blue-800 dark:text-blue-300/80',
        Icon: Info,
      };

  const modeLabel = CRS_MODE_LABEL[mode] || mode;
  const methodLabel = CRS_METHOD_LABEL[pveCrs['ha-auto-rebalance-method']] || pveCrs['ha-auto-rebalance-method'];

  return (
    <div className={`mb-3 ${tone.wrap} p-3 rounded-r-lg`}>
      <div className="flex items-start gap-3">
        <tone.Icon size={18} className={`${tone.icon} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Server size={14} className={tone.icon} />
            <h3 className={`text-sm font-semibold ${tone.title}`}>
              {dueling ? 'PVE CRS Dynamic Load Balancer is dueling with ProxBalance' : 'PVE Cluster Resource Scheduler detected'}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-800/60 ${tone.title} font-mono`}>
              ha={mode}
            </span>
            {autoRebalance && (
              <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-800/60 ${tone.title} font-mono`}>
                auto-rebalance ON
              </span>
            )}
            {rebalanceOnStart && !autoRebalance && (
              <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-800/60 ${tone.title} font-mono`}>
                rebalance-on-start
              </span>
            )}
            {onEdit && (
              <button onClick={onEdit} className={`text-xs underline ${tone.title} hover:opacity-80 ml-auto`}>Edit</button>
            )}
          </div>
          <p className={`text-xs mt-1.5 ${tone.body}`}>
            {dueling ? (
              <>
                PVE's HA Manager runs a ~10s reactive loop and will autonomously migrate HA-managed guests when imbalance exceeds <strong>{pveCrs['ha-auto-rebalance-threshold']}%</strong> for{' '}
                <strong>{pveCrs['ha-auto-rebalance-hold-duration']}</strong> rounds. ProxBalance's 5-minute automigrate timer can't compete on the same workloads. ProxBalance now excludes HA-managed guests from its recommendations to avoid thrashing.
              </>
            ) : autoRebalance ? (
              <>
                PVE CRS will autonomously rebalance HA-managed guests at <strong>{pveCrs['ha-auto-rebalance-threshold']}%</strong> imbalance using <strong>{methodLabel}</strong>. ProxBalance complements this by covering non-HA guests, IOWait, forecasting, and outcome tracking.
              </>
            ) : (
              <>
                Mode: <strong>{modeLabel}</strong>. {rebalanceOnStart && 'CRS picks the best start node when HA guests transition from stopped to running. '}This affects start-node selection only; ProxBalance still owns periodic rebalancing.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
