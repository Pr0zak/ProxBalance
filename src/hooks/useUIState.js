import { isWallHash } from '../utils/wallMode.js';
import { readViewMode, writeViewMode } from '../utils/simpleView.js';

const { useState, useEffect, useCallback } = React;

const PAGES = ['dashboard', 'simple', 'insights', 'automation', 'settings'];

// Hash routes: #/<page>[/<sub>], e.g. #/automation/filters, #/dashboard/map.
// Reload keeps your place, Back/Forward work, and any view can be linked.
function parseHash() {
  // #/wall: the full-screen wall-monitor view (no sub-pages).
  if (isWallHash(window.location.hash)) return { page: 'wall', sub: null };
  const [raw, sub] = window.location.hash.replace(/^#\/?/, '').split('/');
  // #/overview is the Overview's name in the top bar; #/simple is its page id.
  const page = raw === 'overview' ? 'simple' : raw;
  // No page in the address: open the view this browser last chose.
  const home = readViewMode() === 'simple' ? 'simple' : 'dashboard';
  return {
    page: PAGES.includes(page) ? page : home,
    sub: PAGES.includes(page) && sub ? decodeURIComponent(sub) : null,
  };
}

function writeHash(page, sub, replace = false) {
  const next = `#/${page}${sub ? `/${encodeURIComponent(sub)}` : ''}`;
  if (window.location.hash === next) return;
  if (replace) window.history.replaceState(null, '', next);
  else window.location.hash = next;
}

export function useUIState() {
  const [route, setRoute] = useState(parseHash);
  // A page with unsaved edits can install a guard: () => boolean (true = leave).
  const navGuardRef = React.useRef(null);
  const setNavGuard = useCallback((fn) => { navGuardRef.current = fn; }, []);
  const allowLeave = (nextPage) => nextPage === route.page || !navGuardRef.current || navGuardRef.current();
  const routeRef = React.useRef(route);
  routeRef.current = route;
  const currentPage = route.page;
  const subPage = route.sub;

  useEffect(() => {
    const onHash = () => {
      const next = parseHash();
      // Back/Forward away from a guarded page: undo the hash change if declined.
      if (navGuardRef.current && next.page !== routeRef.current.page && !navGuardRef.current()) {
        writeHash(routeRef.current.page, routeRef.current.sub, true);
        return;
      }
      setRoute(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Returns false when a page guard (unsaved edits) declined the move.
  const setCurrentPage = useCallback((page) => {
    if (page === route.page && !route.sub) return true;
    if (!allowLeave(page)) return false;
    setRoute({ page, sub: null });
    writeHash(page, null);
    window.scrollTo(0, 0);
    return true;
  }, [route.page, route.sub]);

  // Navigate to a sub-view; optional page switch in the same step.
  const setSubPage = useCallback((sub, page = route.page) => {
    if (!allowLeave(page)) return;
    setRoute({ page, sub });
    writeHash(page, sub);
    if (page !== route.page) window.scrollTo(0, 0);
  }, [route.page]);
  // Simple or Full, per browser. The Dashboard tab opens whichever was chosen last.
  const [viewMode, setViewModeState] = useState(readViewMode);
  const setViewMode = useCallback((mode) => {
    writeViewMode(mode);
    setViewModeState(mode);
  }, []);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [scrollToApiConfig, setScrollToApiConfig] = useState(false);

  const [nodeGridColumns, setNodeGridColumns] = useState(() => {
    const saved = localStorage.getItem('nodeGridColumns');
    return saved ? parseInt(saved) : 3;
  });

  const [collapsedSections, setCollapsedSections] = useState(() => {
    const defaults = {
      clusterMap: false,
      maintenance: true,
      nodeOverview: false,
      nodeStatus: true,
      recommendations: false,
      aiRecommendations: false,
      taggedGuests: true,
      analysisDetails: true,
      mainSettings: false,
      scheduleSection: true,
      guestSelectionSection: true,
      migrationBehaviorSection: true,
      smartMigrations: true,
      safetyRules: false,
      additionalRules: false,
      automatedMigrations: true,
      howItWorks: true,
      decisionTree: true,
      penaltyScoring: true,
      distributionBalancing: true,
      distributionBalancingHelp: true,
      lastRunSummary: true,
      mountPoints: true,
      passthroughDisks: true,
      notificationSettings: true
    };
    const saved = localStorage.getItem('collapsedSections');
    if (!saved) return defaults;
    // Drop legacy per-card keys ("details-3", "command-3") older builds stored here.
    const parsed = Object.fromEntries(
      Object.entries(JSON.parse(saved)).filter(([k]) => !/^(details|command)-\d+$/.test(k))
    );
    return { ...defaults, ...parsed };
  });

  const [clusterMapViewMode, setClusterMapViewMode] = useState(() => {
    const saved = localStorage.getItem('clusterMapViewMode');
    if (saved === 'usage') return 'cpu';
    return saved || 'cpu';
  });

  const [showPoweredOffGuests, setShowPoweredOffGuests] = useState(() => {
    const saved = localStorage.getItem('showPoweredOffGuests');
    return saved === null ? true : saved === 'true';
  });

  const [guestModalCollapsed, setGuestModalCollapsed] = useState({
    mountPoints: true,
    passthroughDisks: true
  });

  // localStorage persistence effects
  useEffect(() => {
    localStorage.setItem('collapsedSections', JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  useEffect(() => {
    localStorage.setItem('nodeGridColumns', nodeGridColumns.toString());
  }, [nodeGridColumns]);

  useEffect(() => {
    localStorage.setItem('clusterMapViewMode', clusterMapViewMode);
  }, [clusterMapViewMode]);

  useEffect(() => {
    localStorage.setItem('showPoweredOffGuests', showPoweredOffGuests.toString());
  }, [showPoweredOffGuests]);

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return {
    currentPage, setCurrentPage,
    viewMode, setViewMode,
    subPage, setSubPage,
    setNavGuard,
    showSettings, setShowSettings,
    showAdvancedSettings, setShowAdvancedSettings,
    scrollToApiConfig, setScrollToApiConfig,
    nodeGridColumns, setNodeGridColumns,
    collapsedSections, setCollapsedSections,
    clusterMapViewMode, setClusterMapViewMode,
    showPoweredOffGuests, setShowPoweredOffGuests,
    guestModalCollapsed, setGuestModalCollapsed,
    toggleSection,
  };
}
