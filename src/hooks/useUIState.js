const { useState, useEffect } = React;

export function useUIState() {
  const [currentPage, setCurrentPage] = useState('dashboard');
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
