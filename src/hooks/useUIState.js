const { useState, useEffect, useCallback } = React;

const PAGES = ['dashboard', 'automation', 'settings'];

// Hash routes: #/<page>[/<sub>], e.g. #/automation/filters, #/dashboard/map.
// Reload keeps your place, Back/Forward work, and any view can be linked.
function parseHash() {
  const [page, sub] = window.location.hash.replace(/^#\/?/, '').split('/');
  return {
    page: PAGES.includes(page) ? page : 'dashboard',
    sub: PAGES.includes(page) && sub ? decodeURIComponent(sub) : null,
  };
}

function writeHash(page, sub) {
  const next = `#/${page}${sub ? `/${encodeURIComponent(sub)}` : ''}`;
  if (window.location.hash !== next) window.location.hash = next;
}

export function useUIState() {
  const [route, setRoute] = useState(parseHash);
  const currentPage = route.page;
  const subPage = route.sub;

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setCurrentPage = useCallback((page) => {
    if (page === route.page && !route.sub) return;
    setRoute({ page, sub: null });
    writeHash(page, null);
    window.scrollTo(0, 0);
  }, [route.page, route.sub]);

  // Navigate to a sub-view; optional page switch in the same step.
  const setSubPage = useCallback((sub, page = route.page) => {
    setRoute({ page, sub });
    writeHash(page, sub);
    if (page !== route.page) window.scrollTo(0, 0);
  }, [route.page]);
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
    subPage, setSubPage,
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
