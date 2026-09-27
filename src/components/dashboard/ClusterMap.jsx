import {
  Server, ChevronDown, Cpu, MemoryStick, Database, Zap, Globe,
  RefreshCw, CheckCircle, Folder, MoveRight, Search, X
} from '../Icons.jsx';
import {
  GLASS_CARD, GLASS_CARD_SUBTLE, INNER_CARD, iconBadge, BTN_PRIMARY, BTN_SECONDARY, BTN_ICON, ICON,
  INPUT_FIELD, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE,
} from '../../utils/designTokens.js';
import { HEADROOM_HINT } from '../../utils/constants.js';
import {
  QUICK_FILTERS, matchesQuery, guestMetric, isVmType, nodePreview, toConfirmMigration,
} from './clusterMapHelpers.js';
import { MovePreviewPanel, MoveToSheet } from './MovePreview.jsx';

const { useState, useRef, useEffect, useLayoutEffect } = React;

// Touch-first devices can't use HTML5 drag-and-drop, so they get a tap menu.
const detectTouch = () => {
  try { return window.matchMedia('(hover: none) and (pointer: coarse)').matches; } catch { return false; }
};

// Suitability rating → color (matches the rest of the app: higher = healthier).
const scoreHex = (r) => r >= 70 ? '#22c55e' : r >= 50 ? '#eab308' : r >= 30 ? '#f97316' : '#ef4444';
// Load ratio (0..1) → heat color for the "color by load" mode.
const heatHex = (ratio) => ratio < 0.4 ? '#22c55e' : ratio < 0.7 ? '#eab308' : ratio < 0.88 ? '#f97316' : '#ef4444';
// Narrowest a node column may get before the grid wraps to another row.
const NODE_COL_MIN = 196;

// Striped overlay on a meter showing where the value would go (move preview).
function GhostSegment({ from, to }) {
  const a = Math.min(100, Math.max(0, from));
  const b = Math.min(100, Math.max(0, to));
  if (Math.abs(b - a) < 0.5) return null;
  return (
    <div
      className={`absolute inset-y-0 rounded-full ${b > a ? 'bg-sky-400/80' : 'bg-slate-400/40 dark:bg-slate-500/40'}`}
      style={{
        left: `${Math.min(a, b)}%`,
        width: `${Math.abs(b - a)}%`,
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0 3px, transparent 3px 6px)',
      }}
    />
  );
}

// One labelled node meter: "CPU  6 vCPU / 4c  15%". `ghost` draws the
// projected value during a move preview.
function NodeMeter({ label, pct, barClass, detail, dim = false, badge = null, ghost = null }) {
  const v = Math.max(0, pct || 0);
  const solid = ghost != null ? Math.min(v, ghost) : v;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-1 text-[11px] leading-4">
        <span className="flex items-center gap-1 font-medium text-pb-text2 dark:text-gray-400">{label}{badge}</span>
        <span className="tabular-nums">
          {detail && <span className="text-[10px] text-pb-text2 dark:text-gray-500 mr-1">{detail}</span>}
          <span className="font-semibold text-pb-text dark:text-gray-100">{v < 10 ? v.toFixed(1) : Math.round(v)}%</span>
        </span>
      </div>
      <div className="relative w-full h-2 bg-pb-surface2 dark:bg-slate-700 rounded-full overflow-hidden mt-0.5">
        {ghost != null && <GhostSegment from={v} to={ghost} />}
        <div className={`relative h-full rounded-full transition-all duration-500 ${barClass} ${dim ? 'opacity-40' : ''}`} style={{ width: `${Math.min(100, solid)}%` }} />
      </div>
    </div>
  );
}

export default function ClusterMap({
  data,
  collapsedSections,
  toggleSection,
  showPoweredOffGuests,
  setShowPoweredOffGuests,
  clusterMapViewMode,
  setClusterMapViewMode,
  maintenanceNodes,
  setSelectedNode,
  setSelectedGuestDetails,
  guestsMigrating,
  migrationProgress,
  completedMigrations,
  nodeScores,
  recommendations,
  canMigrate = false,
  setConfirmMigration = null,
  embedded = false,
}) {
  if (!data) return null;

  const [colorMode, setColorMode] = useState(() => {
    try { return localStorage.getItem('clusterMapColorMode') || 'type'; } catch { return 'type'; }
  });
  const setColor = (m) => { setColorMode(m); try { localStorage.setItem('clusterMapColorMode', m); } catch {} };

  const [showPlan, setShowPlanState] = useState(() => {
    try { return localStorage.getItem('clusterMapShowPlan') === '1'; } catch { return false; }
  });
  const setShowPlan = (v) => { setShowPlanState(v); try { localStorage.setItem('clusterMapShowPlan', v ? '1' : '0'); } catch {} };

  // Find-on-map: free text + one quick filter. Matches glow, the rest dim.
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState(null);
  const q = query.trim().toLowerCase();
  const quickDef = QUICK_FILTERS.find(f => f.id === quick);
  const findActive = !!q || !!quickDef;
  const allGuests = Object.values(data.guests || {});
  const isMatch = (g) => matchesQuery(g, q) && (!quickDef || quickDef.test(g));
  const matches = findActive ? allGuests.filter(isMatch) : [];
  const visibleMatches = matches.filter(g => showPoweredOffGuests || g.status === 'running');
  const hiddenMatchCount = matches.length - visibleMatches.length;
  const matchesByNode = {};
  visibleMatches.forEach(g => { matchesByNode[g.node] = (matchesByNode[g.node] || 0) + 1; });
  const quickCounts = {};
  QUICK_FILTERS.forEach(f => { quickCounts[f.id] = allGuests.filter(g => matchesQuery(g, q) && f.test(g)).length; });
  const clearFind = () => { setQuery(''); setQuick(null); };
  const handleFindKey = (e) => {
    if (e.key === 'Escape') clearFind();
    if (e.key === 'Enter' && visibleMatches.length === 1) {
      const g = visibleMatches[0];
      setSelectedGuestDetails({ ...g, currentNode: g.node });
    }
  };

  // Move preview. Desktop: drag a bubble (`drag` while in flight, `pendingMove`
  // once dropped). Touch: tap a bubble to open the "Move to…" sheet.
  const [isTouch] = useState(detectTouch);
  const [drag, setDrag] = useState(null);               // { vmid }
  const [dragOver, setDragOver] = useState(null);       // node name under the pointer
  const [pendingMove, setPendingMove] = useState(null); // { vmid, to }
  const [touchGuest, setTouchGuest] = useState(null);   // vmid with the sheet open
  const previewPanelRef = useRef(null);
  const findGuest = (vmid) => (vmid == null ? null : allGuests.find(g => g.vmid === vmid) || null);
  const previewVmid = drag ? drag.vmid : pendingMove ? pendingMove.vmid : null;
  const previewGuest = findGuest(previewVmid);
  const pendingGuest = pendingMove ? findGuest(pendingMove.vmid) : null;
  const sheetGuest = findGuest(touchGuest);

  // Drop the preview if the guest vanished or already moved (data refresh).
  useEffect(() => {
    if (pendingMove && (!pendingGuest || pendingGuest.node === pendingMove.to)) setPendingMove(null);
  }, [data]);

  // Bring the dropped-move panel into view and let Escape cancel it.
  useEffect(() => {
    if (!pendingMove) return undefined;
    previewPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const onKey = (e) => { if (e.key === 'Escape') setPendingMove(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingMove]);

  const openConfirm = (guest, target) => {
    if (!guest || !canMigrate || !setConfirmMigration) return;
    setConfirmMigration(toConfirmMigration(guest, target));
    setPendingMove(null);
    setTouchGuest(null);
  };
  const endDrag = () => { setDrag(null); setDragOver(null); };

  const mapAreaRef = useRef(null);
  const nodeRefs = useRef({});
  const guestRefs = useRef({});
  const [arrows, setArrows] = useState([]);

  const recList = Array.isArray(recommendations)
    ? recommendations.filter(r => r && r.source_node && r.target_node && r.vmid != null)
    : [];
  const recByVmid = {};
  recList.forEach(r => { recByVmid[String(r.vmid)] = r; });

  // Measure recommended guest → target-node positions and draw connector arrows.
  useLayoutEffect(() => {
    if (!showPlan || !mapAreaRef.current || recList.length === 0) { setArrows([]); return; }
    const measure = () => {
      const c = mapAreaRef.current;
      if (!c) return;
      const cRect = c.getBoundingClientRect();
      const next = [];
      recList.forEach(r => {
        const g = guestRefs.current[String(r.vmid)];
        const n = nodeRefs.current[r.target_node];
        if (!g || !n || !g.isConnected || !n.isConnected) return;
        const gr = g.getBoundingClientRect();
        const nr = n.getBoundingClientRect();
        next.push({
          key: `${r.vmid}-${r.target_node}`,
          x1: gr.left + gr.width / 2 - cRect.left,
          y1: gr.top + gr.height / 2 - cRect.top,
          x2: nr.left + nr.width / 2 - cRect.left,
          y2: nr.bottom - cRect.top,
        });
      });
      setArrows(next);
    };
    measure();
    const t = setTimeout(measure, 80);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, [showPlan, recommendations, clusterMapViewMode, showPoweredOffGuests, colorMode, collapsedSections, data]);

  // When embedded, the parent owns the section card and header.
  const Wrapper = embedded ? React.Fragment : 'div';
  const wrapperProps = embedded ? {} : { className: `${GLASS_CARD} overflow-hidden` };
  const isCollapsed = embedded ? false : collapsedSections.clusterMap;

  return (
    <Wrapper {...wrapperProps}>
      <div className={`flex flex-wrap items-center justify-between gap-y-3 ${embedded ? 'mb-3' : 'mb-6'}`}>
        {!embedded && (
          <div className="flex items-center gap-3 min-w-0">
            <div className={iconBadge('teal', 'cyan')}>
              <Server size={ICON.section} className="text-pb-text dark:text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-pb-text dark:text-white">Cluster Map</h2>
              <p className="text-sm text-pb-text2 dark:text-gray-400 mt-0.5">Visual cluster overview</p>
            </div>
            <button
              onClick={() => toggleSection('clusterMap')}
              className="ml-2 p-2 hover:bg-pb-surface2 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
              title={collapsedSections.clusterMap ? "Expand section" : "Collapse section"}
            >
              <ChevronDown size={ICON.section} className={`text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${!collapsedSections.clusterMap ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
        {!isCollapsed && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-pb-text2 dark:text-gray-400">Show Powered Off:</span>
              <button
                onClick={() => setShowPoweredOffGuests(!showPoweredOffGuests)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  showPoweredOffGuests ? 'bg-blue-600' : 'bg-gray-600'
                }`}
                title={showPoweredOffGuests ? 'Click to hide powered off VMs/CTs' : 'Click to show powered off VMs/CTs'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    showPoweredOffGuests ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-pb-text2 dark:text-gray-400">View by:</span>
              <div className="flex flex-wrap rounded-lg bg-pb-surface2 dark:bg-slate-700 p-1">
                <button
                  onClick={() => setClusterMapViewMode('cpu')}
                  className={`flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${
                    clusterMapViewMode === 'cpu'
                      ? 'bg-blue-600 text-white'
                      : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
                  }`}
                  title="CPU"
                >
                  <Cpu size={14} /><span className="hidden sm:inline ml-1">CPU</span>
                </button>
                <button
                  onClick={() => setClusterMapViewMode('memory')}
                  className={`flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${
                    clusterMapViewMode === 'memory'
                      ? 'bg-blue-600 text-white'
                      : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
                  }`}
                  title="Memory"
                >
                  <MemoryStick size={14} /><span className="hidden sm:inline ml-1">Memory</span>
                </button>
                <button
                  onClick={() => setClusterMapViewMode('allocated')}
                  className={`flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${
                    clusterMapViewMode === 'allocated'
                      ? 'bg-blue-600 text-white'
                      : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
                  }`}
                  title="Allocated"
                >
                  <Database size={14} /><span className="hidden sm:inline ml-1">Allocated</span>
                </button>
                <button
                  onClick={() => setClusterMapViewMode('disk_io')}
                  className={`flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${
                    clusterMapViewMode === 'disk_io'
                      ? 'bg-blue-600 text-white'
                      : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
                  }`}
                  title="Disk I/O"
                >
                  <Zap size={14} /><span className="hidden sm:inline ml-1">Disk I/O</span>
                </button>
                <button
                  onClick={() => setClusterMapViewMode('network')}
                  className={`flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${
                    clusterMapViewMode === 'network'
                      ? 'bg-blue-600 text-white'
                      : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
                  }`}
                  title="Network"
                >
                  <Globe size={14} /><span className="hidden sm:inline ml-1">Network</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-pb-text2 dark:text-gray-400">Color:</span>
              <div className="flex rounded-lg bg-pb-surface2 dark:bg-slate-700 p-1">
                {[{ id: 'type', label: 'Type' }, { id: 'load', label: 'Load' }].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setColor(m.id)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      colorMode === m.id ? 'bg-blue-600 text-white' : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
                    }`}
                    title={m.id === 'type' ? 'Color circles by guest type (VM/CT)' : 'Color circles by load (green→red)'}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {recList.length > 0 && (
              <button
                onClick={() => setShowPlan(!showPlan)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                  showPlan ? 'bg-amber-500 text-white' : 'bg-pb-surface2 dark:bg-slate-700 text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
                }`}
                title="Overlay recommended migrations as arrows on the map"
              >
                <MoveRight size={14} />{showPlan ? `Plan (${recList.length})` : `Show plan (${recList.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="relative w-full sm:w-72">
            <Search size={ICON.inline} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-pb-text3-dark pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleFindKey}
              placeholder="Find by name, ID, tag or IP"
              aria-label="Find guest on map"
              className={`${INPUT_FIELD} !pl-9 !pr-8`}
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-pb-text-dark" aria-label="Clear search">
                <X size={ICON.inline} />
              </button>
            )}
          </div>
          {QUICK_FILTERS.filter(f => quickCounts[f.id] > 0 || quick === f.id).map(f => (
            <button
              key={f.id}
              onClick={() => setQuick(quick === f.id ? null : f.id)}
              className={`${FILTER_CHIP} ${quick === f.id ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
              title={`Highlight guests: ${f.label.toLowerCase()}`}
            >
              {f.label} <span className="opacity-60 tabular-nums">{quickCounts[f.id]}</span>
            </button>
          ))}
          {findActive && (
            <div className="flex items-center gap-2 text-xs text-pb-text2 dark:text-gray-400 sm:ml-auto">
              <span className="font-semibold text-pb-text dark:text-gray-200">
                {visibleMatches.length} match{visibleMatches.length === 1 ? '' : 'es'}
              </span>
              {Object.keys(matchesByNode).sort().map(n => (
                <button
                  key={n}
                  onClick={() => nodeRefs.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="tabular-nums hover:text-pb-text dark:hover:text-gray-200"
                  title={`Jump to ${n}`}
                >
                  {n} <span className="font-semibold text-sky-600 dark:text-sky-400">×{matchesByNode[n]}</span>
                </button>
              ))}
              {hiddenMatchCount > 0 && (
                <button onClick={() => setShowPoweredOffGuests(true)} className="underline decoration-dotted hover:text-pb-text dark:hover:text-gray-200">
                  +{hiddenMatchCount} powered off (show)
                </button>
              )}
              {visibleMatches.length === 1 && <span className="hidden sm:inline text-pb-text2 dark:text-gray-500">— Enter to open</span>}
              <button onClick={clearFind} className="text-pb-accent dark:text-pb-accent-dark hover:underline">Clear</button>
            </div>
          )}
        </div>
      )}

      {!isCollapsed && !pendingMove && (
        <div className="flex items-center gap-1.5 text-xs text-pb-text2 dark:text-gray-500 mb-1">
          <MoveRight size={12} className="shrink-0" />
          {isTouch
            ? 'Tap a guest to preview moving it to another node.'
            : 'Drag a guest onto another node to preview the move.'}
        </div>
      )}

      {!isCollapsed && pendingMove && pendingGuest && (
        <div className="mb-2">
          <MovePreviewPanel
            panelRef={previewPanelRef}
            guest={pendingGuest}
            targetName={pendingMove.to}
            nodes={data.nodes}
            allGuests={allGuests}
            maintenanceNodes={maintenanceNodes}
            canMigrate={canMigrate && !!setConfirmMigration}
            onReview={() => openConfirm(pendingGuest, pendingMove.to)}
            onCancel={() => setPendingMove(null)}
          />
        </div>
      )}

      {sheetGuest && (
        <MoveToSheet
          guest={sheetGuest}
          nodes={data.nodes}
          allGuests={allGuests}
          maintenanceNodes={maintenanceNodes}
          canMigrate={canMigrate && !!setConfirmMigration}
          onReview={(target) => openConfirm(sheetGuest, target)}
          onDetails={() => { setTouchGuest(null); setSelectedGuestDetails({ ...sheetGuest, currentNode: sheetGuest.node }); }}
          onClose={() => setTouchGuest(null)}
        />
      )}

      {!isCollapsed && (
        <div ref={mapAreaRef} className="relative" style={{minHeight: '400px'}}>
          {showPlan && arrows.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" style={{ overflow: 'visible' }}>
              <defs>
                <marker id="recArrowHead" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
                </marker>
              </defs>
              {arrows.map(a => (
                <line key={a.key} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                  stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,4" strokeOpacity="0.85" markerEnd="url(#recArrowHead)" />
              ))}
            </svg>
          )}
          <div
            className="grid gap-x-4 gap-y-10 items-start py-6"
            style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${NODE_COL_MIN}px), 1fr))` }}
          >
            {Object.values(data.nodes).slice().sort((a, b) => a.name.localeCompare(b.name)).map(node => {
              const allNodeGuests = Object.values(data.guests || {}).filter(g => g.node === node.name);
              const poweredOffCount = allNodeGuests.filter(g => g.status !== 'running').length;
              const nodeGuests = (showPoweredOffGuests
                ? allNodeGuests
                : allNodeGuests.filter(g => g.status === 'running'))
                .slice()
                .sort((a, b) => guestMetric(b, clusterMapViewMode) - guestMetric(a, clusterMapViewMode) || a.vmid - b.vmid);
              const runningGuests = allNodeGuests.filter(g => g.status === 'running');
              const vcpus = runningGuests.reduce((sum, g) => sum + (g.cpu_cores || 0), 0);
              const memUsedGb = (node.mem_percent || 0) / 100 * (node.total_mem_gb || 0);
              const maxResources = Math.max(...Object.values(data.guests || {})
                .filter(g => showPoweredOffGuests || g.status === 'running')
                .map(g => guestMetric(g, clusterMapViewMode)), 1);

              const ns = nodeScores && nodeScores[node.name];
              const rating = ns && typeof ns.suitability_rating === 'number' ? ns.suitability_rating : null;
              const isMaint = maintenanceNodes.has(node.name);
              const scored = node.status === 'online' && !isMaint && rating != null;
              const sc = scored ? scoreHex(rating) : null;
              const nodeIowait = node.metrics?.current_iowait || 0;

              const nodeMatchCount = matchesByNode[node.name] || 0;

              // Move preview: the source frees load; while dragging every other
              // node shows its estimate, after a drop only the chosen target does.
              const pv = previewGuest && (drag || previewGuest.node === node.name || pendingMove?.to === node.name)
                ? nodePreview(node, previewGuest, maintenanceNodes, allGuests)
                : null;
              const isDropHover = !!drag && dragOver === node.name;
              const isDropTarget = isDropHover || pendingMove?.to === node.name;
              const committedPct = node.committed_mem_gb != null && node.total_mem_gb > 0
                ? node.committed_mem_gb / node.total_mem_gb * 100 : null;

              return (
                <div
                  key={node.name}
                  className={`flex flex-col items-center gap-4 rounded-xl transition-colors ${findActive && nodeMatchCount === 0 && !pv ? 'opacity-50' : ''} ${isDropHover ? (pv?.blocked ? 'bg-red-500/10' : 'bg-sky-500/10') : ''}`}
                  onDragOver={(e) => {
                    if (!drag || pv?.role !== 'target' || pv.blocked) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOver !== node.name) setDragOver(node.name);
                  }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(d => (d === node.name ? null : d)); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (drag && pv?.role === 'target' && !pv.blocked) setPendingMove({ vmid: drag.vmid, to: node.name });
                    endDrag();
                  }}
                >
                  {/* Host Node */}
                  <div className="relative group">
                    {findActive && nodeMatchCount > 0 && (
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-20 px-1.5 py-0.5 rounded-md bg-sky-500 text-white text-[10px] font-bold tabular-nums whitespace-nowrap shadow-sm">
                        {nodeMatchCount} match{nodeMatchCount === 1 ? '' : 'es'}
                      </div>
                    )}
                    {scored && (
                      <div
                        className="absolute -top-2 -right-2 z-20 flex items-center gap-1 pl-1.5 pr-1.5 py-0.5 rounded-md bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-pb-border/70 dark:border-slate-700/70 shadow-sm"
                        title={`Headroom ${Math.round(rating)} / 100 — ${ns.suitable ? 'suitable migration target' : 'not a good target'}. ${HEADROOM_HINT}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
                        <span className="text-[8px] uppercase tracking-wide font-semibold text-pb-text2 dark:text-gray-400">Headroom</span>
                        <span className="text-[10px] font-bold tabular-nums text-pb-text dark:text-gray-100">{Math.round(rating)}</span>
                      </div>
                    )}
                    <div
                      ref={el => { if (el) nodeRefs.current[node.name] = el; }}
                      onClick={() => setSelectedNode(node)}
                      style={isDropTarget
                        ? { borderColor: '#38bdf8', boxShadow: '0 0 0 3px rgba(56,189,248,0.35)' }
                        : scored ? { borderColor: `${sc}55`, boxShadow: `0 0 14px -4px ${sc}66, inset 0 0 26px -12px ${sc}99` } : undefined}
                      className={`w-48 rounded-lg border-4 flex flex-col items-center justify-between p-2.5 cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                      isMaint
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-600 hover:border-yellow-500'
                        : scored
                        ? 'bg-pb-bg dark:bg-gray-900'
                        : node.status === 'online'
                        ? 'bg-pb-bg dark:bg-gray-900 border-blue-600 hover:border-blue-500'
                        : 'bg-white dark:bg-slate-800 border-gray-600'
                    }`}>
                      {/* Node header */}
                      <div className="flex flex-col items-center z-10">
                        <Server className={`w-5 h-5 sm:w-7 sm:h-7 ${maintenanceNodes.has(node.name) ? 'text-yellow-600 dark:text-yellow-400' : node.status === 'online' ? 'text-blue-600 dark:text-blue-400' : 'text-pb-text2 dark:text-gray-500'}`} />
                        <div className="text-sm font-bold text-pb-text dark:text-white mt-1">{node.name}</div>
                        {maintenanceNodes.has(node.name) && (
                          <div className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-500 text-white rounded mt-0.5">
                            MAINTENANCE
                          </div>
                        )}
                        <div className="text-xs text-pb-text2 dark:text-gray-400">
                          {nodeGuests.length} guests
                          {!showPoweredOffGuests && poweredOffCount > 0 && (
                            <span className="text-pb-text2 dark:text-gray-500"> (+{poweredOffCount} off)</span>
                          )}
                        </div>
                      </div>

                      {/* Capacity indicators — values shown inline, no hover needed */}
                      <div className="w-full space-y-1.5 z-10 mt-2">
                        <NodeMeter
                          label="CPU"
                          pct={node.cpu_percent}
                          detail={`${vcpus} vCPU / ${node.cpu_cores || 0}c`}
                          barClass={(node.cpu_percent || 0) > 80 ? 'bg-red-500' : (node.cpu_percent || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'}
                          ghost={pv && !pv.blocked ? pv.cpu : null}
                        />
                        <NodeMeter
                          label="MEM"
                          pct={node.mem_percent}
                          detail={node.total_mem_gb ? `${memUsedGb.toFixed(0)}/${node.total_mem_gb.toFixed(0)} GB` : null}
                          barClass={(node.mem_percent || 0) > 80 ? 'bg-red-500' : (node.mem_percent || 0) > 70 ? 'bg-yellow-500' : 'bg-blue-500'}
                          ghost={pv && !pv.blocked ? pv.mem : null}
                        />
                        <NodeMeter
                          label="IO wait"
                          pct={nodeIowait}
                          dim={node.iowait_exempt}
                          barClass={nodeIowait > 30 ? 'bg-red-500' : nodeIowait > 15 ? 'bg-yellow-500' : 'bg-orange-400'}
                          badge={node.iowait_exempt && (
                            <span className="text-amber-600 dark:text-amber-400" title={`IOWait exempt — excluded from scoring (${(node.iowait_exempt_guests || []).map(g => g.name).join(', ') || 'passthrough'})`}>⊘</span>
                          )}
                        />
                        {committedPct != null && (
                          <div
                            className={`text-[10px] text-center pt-0.5 tabular-nums ${committedPct > 100 ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-pb-text2 dark:text-gray-500'}`}
                            title="Memory allocated to running guests vs. physical RAM (over 100% = overcommitted)"
                          >
                            {node.committed_mem_gb.toFixed(0)} GB committed ({Math.round(committedPct)}%)
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Move preview readout — always labelled as an estimate */}
                  {pv && (
                    <div
                      className={`-mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tabular-nums text-center ${
                        pv.role === 'source' ? 'bg-slate-500/15 text-pb-text2 dark:text-gray-300'
                          : pv.blocked ? 'bg-red-500/15 text-red-600 dark:text-red-300'
                          : pv.warn ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                      }`}
                      title={pv.checks.map(c => c.text).join('\n') || 'Estimate from current usage'}
                    >
                      {pv.blocked
                        ? (pv.checks.find(c => c.level === 'block')?.text || 'Not available')
                        : `${pv.role === 'source' ? 'After (est.)' : 'If here (est.)'}: CPU ${Math.round(pv.cpu)}% · MEM ${Math.round(pv.mem)}%`}
                      {!pv.blocked && pv.role === 'target' && pv.committedPct != null && pv.committedPct > 100 && (
                        <div className="font-normal text-orange-600 dark:text-orange-400">{Math.round(pv.committedPct)}% RAM committed</div>
                      )}
                    </div>
                  )}

                  {/* Connection line */}
                  {nodeGuests.length > 0 && (
                    <div className="w-0.5 h-8 bg-gradient-to-b from-blue-600 to-transparent"></div>
                  )}

                  {/* No guests label */}
                  {nodeGuests.length === 0 && (
                    <div className="text-xs text-pb-text2 dark:text-gray-500 italic mt-2">No guests</div>
                  )}

                  {/* Guests */}
                  <div className="flex flex-wrap gap-2.5 justify-center w-full">
                    {nodeGuests.map(guest => {
                      const cpuUsage = guest.cpu_current || 0;
                      const memPercent = guest.mem_max_gb > 0 ? ((guest.mem_used_gb || 0) / guest.mem_max_gb) * 100 : 0;

                      const resourceValue = guestMetric(guest, clusterMapViewMode);

                      const sizeRatio = maxResources > 0 ? (resourceValue / maxResources) : 0.3;
                      const size = Math.max(36, Math.min(80, 36 + (sizeRatio * 44)));

                      const guestType = (guest.type || '').toUpperCase();
                      const isVM = isVmType(guest);
                      const hasRec = showPlan && !!recByVmid[String(guest.vmid)];
                      const getGuestColor = () => {
                        if (guestType === 'CT' || guestType === 'LXC') return 'bg-green-600';
                        if (isVM) return 'bg-purple-600';
                        return 'bg-gray-600';
                      };

                      // Check migration status for this guest
                      const isMigrating = guestsMigrating[guest.vmid] === true;
                      const progress = migrationProgress[guest.vmid];
                      const isCompleted = completedMigrations[guest.vmid] !== undefined;
                      const isStopped = guest.status !== 'running';
                      const matched = findActive && isMatch(guest);
                      const dimmed = findActive && !matched;
                      const isPreviewed = previewVmid === guest.vmid;
                      const canDrag = !isTouch && !isMigrating && !guest.local_disks?.is_pinned;

                      return (
                        <div key={guest.vmid} className={`relative group flex flex-col items-center ${dimmed ? 'opacity-20' : ''}`}>
                          <div
                            ref={el => { if (el) guestRefs.current[String(guest.vmid)] = el; }}
                            draggable={canDrag}
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', String(guest.vmid));
                              setPendingMove(null);
                              setDrag({ vmid: guest.vmid });
                            }}
                            onDragEnd={endDrag}
                            className={`rounded-full ${colorMode === 'load' ? '' : getGuestColor()} flex items-center justify-center text-pb-text dark:text-white font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer hover:ring-2 hover:ring-blue-400 ${colorMode === 'load' ? (isVM ? 'ring-2 ring-purple-400/80' : 'ring-2 ring-emerald-400/80') : ''} ${hasRec ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent' : ''} ${isMigrating ? 'animate-pulse ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50' : ''} ${isCompleted ? 'ring-2 ring-green-400' : ''} ${matched || isPreviewed ? 'ring-[3px] ring-sky-400 ring-offset-2 ring-offset-white dark:ring-offset-pb-surface-dark' : ''} ${isStopped && !matched && !isPreviewed ? 'opacity-40' : ''} ${canDrag ? 'active:cursor-grabbing' : ''}`}
                            style={{width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, size/4)}px`, ...(colorMode === 'load' ? { background: heatHex(sizeRatio) } : {})}}
                            onClick={() => {
                              if (isMigrating) return;
                              if (isTouch) setTouchGuest(guest.vmid);
                              else setSelectedGuestDetails({...guest, currentNode: node.name});
                            }}
                            aria-label={guest.name || `Guest ${guest.vmid}`}
                          >
                            {guest.vmid}
                          </div>
                          {matched && (
                            <div className="mt-1 max-w-[84px] truncate text-[10px] font-semibold text-sky-700 dark:text-sky-300" title={guest.name}>
                              {guest.name || `Guest ${guest.vmid}`}
                            </div>
                          )}

                          {/* Migration status badge */}
                          {isMigrating && (
                            <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                              <RefreshCw size={12} className="animate-spin" />
                            </div>
                          )}

                          {isCompleted && !isMigrating && (
                            <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                              <CheckCircle size={12} />
                            </div>
                          )}

                          {/* Mount Point Indicator - Square Tag (Top Right) */}
                          {guest.mount_points?.has_mount_points && !isMigrating && !isCompleted && (
                            <div
                              className={`absolute -top-0.5 -right-0.5 ${
                                guest.mount_points.has_unshared_bind_mount
                                  ? 'bg-orange-500'
                                  : 'bg-cyan-400'
                              } rounded-[2px] w-3 h-3 shadow-lg ring-2 ring-gray-800`}
                              title={`${guest.mount_points.mount_count} mount point(s)${guest.mount_points.has_shared_mount ? ' (shared - safe to migrate)' : ' (requires manual migration)'}`}
                            />
                          )}

                          {/* Pinned Disk Indicator - Square Tag (Top Left) */}
                          {guest.local_disks?.is_pinned && !isMigrating && !isCompleted && (
                            <div
                              className="absolute -top-0.5 -left-0.5 bg-red-500 rounded-[2px] w-3 h-3 shadow-lg ring-2 ring-gray-800"
                              title={`Cannot migrate: ${guest.local_disks.pinned_reason} (${guest.local_disks.total_pinned_disks} disk(s))`}
                            />
                          )}

                          {/* IOWait-exempt Indicator - Square Tag (Bottom Left) */}
                          {guest.io_exempt && !isMigrating && !isCompleted && (
                            <div
                              className="absolute -bottom-0.5 -left-0.5 bg-amber-400 rounded-[2px] w-3 h-3 shadow-lg ring-2 ring-gray-800"
                              title={`IOWait-exempt (${guest.io_exempt_reason || 'tag'}) — this guest's IOWait is excluded from its node's scoring`}
                            />
                          )}

                          {/* Guest tooltip */}
                          <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 text-pb-text dark:text-white text-xs rounded-lg shadow-2xl border border-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-10 ${isTouch || drag ? 'hidden' : ''}`}>
                            <div className="font-bold text-sm mb-2 text-blue-600 dark:text-blue-400 border-b border-gray-700 pb-2">
                              {guest.name || `Guest ${guest.vmid}`}
                              <span className="ml-2 text-pb-text2 dark:text-gray-400 font-normal text-xs">
                                ({((guest.type || '').toUpperCase() === 'VM' || (guest.type || '').toUpperCase() === 'QEMU') ? 'VM' : 'CT'})
                              </span>
                            </div>

                            {isMigrating && (
                              <div className="text-yellow-600 dark:text-yellow-400 font-bold bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded mb-2">
                                🔄 Migrating... {progress?.percentage ? `${progress.percentage}%` : ''}
                              </div>
                            )}
                            {isCompleted && !isMigrating && (
                              <div className="text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded mb-2">
                                ✓ Migration Complete
                              </div>
                            )}

                            <div className="space-y-1.5">
                              {clusterMapViewMode === 'allocated' ? (
                                <>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-pb-text dark:text-gray-300">CPU Cores:</span>
                                    <span className="font-semibold text-orange-600 dark:text-orange-400">{guest.cpu_cores || 0}</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-pb-text dark:text-gray-300">Memory Allocated:</span>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">{(guest.mem_max_gb || 0).toFixed(1)} GB</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-pb-text dark:text-gray-300">CPU Usage:</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">{cpuUsage.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-pb-text dark:text-gray-300">Memory Usage:</span>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">{memPercent.toFixed(1)}%</span>
                                  </div>
                                  <div className="text-pb-text2 dark:text-gray-400 text-xs ml-auto">
                                    ({(guest.mem_used_gb || 0).toFixed(1)} / {(guest.mem_max_gb || 0).toFixed(1)} GB)
                                  </div>
                                </>
                              )}

                              <div className="flex justify-between gap-4">
                                <span className="text-pb-text dark:text-gray-300">Status:</span>
                                <span className={`font-semibold ${guest.status === 'running' ? 'text-green-600 dark:text-green-400' : 'text-pb-text2 dark:text-gray-400'}`}>
                                  {guest.status}
                                </span>
                              </div>

                              <div className="border-t border-gray-700 pt-1.5 mt-1.5 space-y-1">
                                <div className="flex justify-between gap-4">
                                  <span className="text-pb-text dark:text-gray-300">Disk Read:</span>
                                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">{((guest.disk_read_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-pb-text dark:text-gray-300">Disk Write:</span>
                                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">{((guest.disk_write_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-pb-text dark:text-gray-300">Net In:</span>
                                  <span className="font-semibold text-purple-600 dark:text-purple-400">{((guest.net_in_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-pb-text dark:text-gray-300">Net Out:</span>
                                  <span className="font-semibold text-purple-600 dark:text-purple-400">{((guest.net_out_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                </div>
                              </div>

                              {/* Mount Point Info */}
                              {guest.mount_points?.has_mount_points && (
                                <div className={`border-t border-gray-700 pt-1.5 mt-1.5 flex items-center gap-2 ${
                                  guest.mount_points.has_unshared_bind_mount ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
                                } bg-gray-800/50 px-2 py-1 rounded`}>
                                  <Folder size={14} />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-semibold">
                                      {guest.mount_points.mount_count} mount point{guest.mount_points.mount_count > 1 ? 's' : ''}
                                      {guest.mount_points.has_shared_mount && ' (shared)'}
                                      {guest.mount_points.has_unshared_bind_mount && ' (manual migration required)'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-col items-center gap-2 mt-6 text-xs text-pb-text2 dark:text-gray-400">
            <div className="flex items-center justify-center gap-x-6 gap-y-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-600"></div>
                <span>VM</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-600"></div>
                <span>Container</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded-full ring-2 ring-white dark:ring-slate-900" style={{ background: '#22c55e' }} />
                <span className="inline-block w-4 h-4 rounded-full ring-2 ring-white dark:ring-slate-900 -ml-1.5" style={{ background: '#f97316' }} />
                <span className="inline-block w-4 h-4 rounded-full ring-2 ring-white dark:ring-slate-900 -ml-1.5" style={{ background: '#ef4444' }} />
                <span className="ml-1">node border/badge = headroom (higher = more room)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  {clusterMapViewMode === 'cpu'
                    ? 'Circle size = CPU usage (%)'
                    : clusterMapViewMode === 'memory'
                    ? 'Circle size = Memory usage (%)'
                    : clusterMapViewMode === 'allocated'
                    ? 'Circle size = CPU cores + Memory allocated (GB)'
                    : clusterMapViewMode === 'disk_io'
                    ? 'Circle size = Disk I/O (Read + Write MB/s)'
                    : clusterMapViewMode === 'network'
                    ? 'Circle size = Network I/O (In + Out MB/s)'
                    : 'Circle size = CPU usage (%)'}
                  {' · largest first'}
                </span>
              </div>
              {colorMode === 'load' && (
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#eab308' }} />
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#f97316' }} />
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                  <span className="ml-1">circle color = load (low→high)</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-x-5 gap-y-1.5 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] bg-cyan-400 ring-1 ring-gray-500" />shared mount</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] bg-orange-500 ring-1 ring-gray-500" />unshared bind mount</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] bg-red-500 ring-1 ring-gray-500" />pinned — cannot migrate</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] bg-amber-400 ring-1 ring-gray-500" />IOWait-exempt</span>
            </div>
          </div>
        </div>
      )}
    </Wrapper>
  );
}
