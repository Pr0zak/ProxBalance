const { useState, useEffect } = React;

export function useUIState() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showIconLegend, setShowIconLegend] = useState(false);
  const [scrollToApiConfig, setScrollToApiConfig] = useState(false);
  const [logoBalancing, setLogoBalancing] = useState(false);
  const [countdownTick, setCountdownTick] = useState(0);
  const [refreshElapsed, setRefreshElapsed] = useState(0);

  const [dashboardHeaderCollapsed, setDashboardHeaderCollapsed] = useState(() => {
    const saved = localStorage.getItem('dashboardHeaderCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [nodeGridColumns, setNodeGridColumns] = useState(() => {
    const saved = localStorage.getItem('nodeGridColumns');
    return saved ? parseInt(saved) : 3;
  });

  const [collapsedSections, setCollapsedSections] = useState(() => {
    const defaults = {
      clusterMap: false,
      maintenance: true,
      nodeStatus: true,
      recommendations: false,
      aiRecommendations: false,
      taggedGuests: true,
      analysisDetails: true,
      mainSettings: false,
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
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
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

  useEffect(() => {
    localStorage.setItem('dashboardHeaderCollapsed', JSON.stringify(dashboardHeaderCollapsed));
  }, [dashboardHeaderCollapsed]);

  // Update countdown timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Clear confirmation modals when settings are closed
  useEffect(() => {
    if (!showSettings) {
      // Cleared externally by root component if needed
    }
  }, [showSettings]);

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLogoHover = () => {
    if (!logoBalancing) {
      setLogoBalancing(true);
      setTimeout(() => setLogoBalancing(false), 2000);
    }
  };

  return {
    currentPage, setCurrentPage,
    showSettings, setShowSettings,
    showAdvancedSettings, setShowAdvancedSettings,
    showIconLegend, setShowIconLegend,
    scrollToApiConfig, setScrollToApiConfig,
    logoBalancing,
    countdownTick,
    refreshElapsed, setRefreshElapsed,
    dashboardHeaderCollapsed, setDashboardHeaderCollapsed,
    nodeGridColumns, setNodeGridColumns,
    collapsedSections, setCollapsedSections,
    clusterMapViewMode, setClusterMapViewMode,
    showPoweredOffGuests, setShowPoweredOffGuests,
    guestModalCollapsed, setGuestModalCollapsed,
    toggleSection,
    handleLogoHover
  };
}
