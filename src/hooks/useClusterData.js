const { useState, useCallback, useRef } = React;

export function useClusterData(API_BASE, deps = {}) {
  const { setTokenAuthError, checkPermissions, autoRefreshInterval } = deps;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [nextUpdate, setNextUpdate] = useState(null);
  const [backendCollected, setBackendCollected] = useState(null);
  const [clusterHealth, setClusterHealth] = useState(null);
  const [nodeScores, setNodeScores] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('1h');
  const [charts, setCharts] = useState({});
  const [chartJsLoaded, setChartJsLoaded] = useState(false);
  const [chartJsLoading, setChartJsLoading] = useState(false);
  const [guestProfiles, setGuestProfiles] = useState(null);
  const [scoreHistory, setScoreHistory] = useState(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/analyze`);

      if (!response.ok) {
        if (response.status === 503) {
          const result = await response.json();
          const errorMsg = result.error || 'Service temporarily unavailable';

          if (errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('auth') || errorMsg.toLowerCase().includes('401') || errorMsg.toLowerCase().includes('unauthorized')) {
            setError(`${errorMsg}. Please check your API token configuration in Settings.`);
            if (setTokenAuthError) setTokenAuthError(true);
          } else {
            setError(errorMsg);
            if (setTokenAuthError) setTokenAuthError(false);
          }
        } else {
          setError(`Server error: ${response.status}. Please check your API token configuration in Settings.`);
          if (setTokenAuthError) setTokenAuthError(false);
        }
        setLoading(false);
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
        const now = new Date();
        setLastUpdate(now);
        const interval = autoRefreshInterval || 60 * 60 * 1000;
        setNextUpdate(new Date(now.getTime() + interval));
        // Backend collection time drives the "collected Xm ago" labels; a
        // snapshot without one clears it rather than keeping an older time.
        setBackendCollected(result.data.collected_at ? new Date(result.data.collected_at) : null);
        if (result.data.cluster_health) {
          setClusterHealth(result.data.cluster_health);
        }
        fetchGuestLocations();
      } else {
        setError(result.error || 'No data received');
      }
    } catch (err) {
      setError(`Connection failed: ${err.message}`);
    }
    setLoading(false);
  };

  const fetchGuestLocations = async () => {
    try {
      const response = await fetch(`${API_BASE}/guests/locations`);
      const result = await response.json();

      if (result.success && result.guests && result.nodes) {
        setData(prevData => {
          if (!prevData) return prevData;

          const newData = { ...prevData };

          newData.guests = { ...prevData.guests };
          Object.keys(result.guests).forEach(vmid => {
            const locationGuest = result.guests[vmid];
            if (newData.guests[vmid]) {
              newData.guests[vmid] = {
                ...newData.guests[vmid],
                node: locationGuest.node,
                status: locationGuest.status
              };
            }
          });

          newData.nodes = { ...prevData.nodes };
          Object.keys(result.nodes).forEach(nodeName => {
            if (newData.nodes[nodeName]) {
              newData.nodes[nodeName] = {
                ...newData.nodes[nodeName],
                guests: result.nodes[nodeName].guests
              };
            }
          });

          return newData;
        });
      } else {
        if (result.error && (result.error.toLowerCase().includes('token') || result.error.toLowerCase().includes('401') || result.error.toLowerCase().includes('unauthorized'))) {
          if (setTokenAuthError) setTokenAuthError(true);
        }
      }
    } catch (err) {
      console.error('[fetchGuestLocations] Error fetching guest locations:', err);
    }
  };

  const handleRefresh = async (callbacks = {}) => {
    setLoading(true);
    setError(null);

    const startTime = Date.now();
    const elapsedInterval = setInterval(() => {
      if (callbacks.setRefreshElapsed) {
        callbacks.setRefreshElapsed(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);

    try {
      const oldTimestamp = data?.collected_at;

      const refreshResponse = await fetch(`${API_BASE}/refresh`, { method: 'POST' });
      if (!refreshResponse.ok) throw new Error('Failed to trigger data collection');

      let attempts = 0;
      const maxAttempts = 40;

      while (attempts < maxAttempts) {
        const delay = attempts < 10 ? 500 : 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        const response = await fetch(`${API_BASE}/analyze`);
        if (response.ok) {
          const result = await response.json();
          const newTimestamp = result?.data?.collected_at;

          if (newTimestamp && newTimestamp !== oldTimestamp) {
            clearInterval(elapsedInterval);
            await fetchAnalysis();
            return;
          }
        }

        attempts++;
      }

      clearInterval(elapsedInterval);
      await fetchAnalysis();
    } catch (err) {
      clearInterval(elapsedInterval);
      setError(`Refresh failed: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchNodeScores = async (thresholds = {}, maintenanceNodes = new Set()) => {
    if (!data) return;
    try {
      const response = await fetch(`${API_BASE}/node-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpu_threshold: thresholds.cpu || 50,
          mem_threshold: thresholds.mem || 60,
          iowait_threshold: thresholds.iowait || 30,
          maintenance_nodes: Array.from(maintenanceNodes)
        })
      });
      const result = await response.json();
      if (result.success) {
        setNodeScores(result.scores);
      }
    } catch (err) {
      console.error('Error fetching node scores:', err);
    }
  };

  const fetchGuestProfiles = async () => {
    try {
      const response = await fetch(`${API_BASE}/guest-profiles`);
      const result = await response.json();
      if (result.success) {
        setGuestProfiles(result.profiles);
      }
    } catch (err) {
      console.error('Error fetching guest profiles:', err);
    }
  };

  // Score history powers the cluster-health chart. The chart picks bucket
  // size based on the selected period — short ranges (1d/7d) ask for raw
  // ~15-min samples, longer ranges (30d → 1yr) ask for hourly/daily
  // averages so we don't blow up payload or render time. Default args
  // mirror "raw, last 10k rows" for callers that don't care.
  //
  // Wrapped in useCallback so the reference is stable across renders —
  // the chart depends on this function in a useEffect dep array, and an
  // unstable reference made the effect fire on every parent re-render,
  // visibly "vibrating" the chart for a few seconds after period changes.
  const fetchScoreHistory = useCallback(async (limit = 10000, bucketMinutes = 0) => {
    try {
      const q = new URLSearchParams({ limit: String(limit) });
      if (bucketMinutes > 0) q.set('bucket', String(bucketMinutes));
      const response = await fetch(`${API_BASE}/score-history?${q}`);
      const result = await response.json();
      if (result.success) {
        setScoreHistory(result.history);
      }
    } catch (err) {
      console.error('Error fetching score history:', err);
    }
  }, [API_BASE]);

  // Inject one <script> and resolve once it has run AND `isReady()` holds. The
  // readiness check matters: an SPA-style server can answer a missing file with
  // index.html (200), which "loads" but defines nothing.
  const injectScript = (src, isReady) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      if (isReady()) resolve();
      else { script.remove(); reject(new Error(`${src} loaded but did not register`)); }
    };
    script.onerror = () => { script.remove(); reject(new Error(`failed to load ${src}`)); };
    document.head.appendChild(script);
  });

  // Try each URL in order until one loads and registers. The bundled local copy
  // comes first (same origin, no third-party dependency, works offline); the CDN
  // is only a fallback for installs whose nginx root lacks assets/js/.
  const loadScript = async (urls, isReady) => {
    if (isReady()) return;
    let lastErr;
    for (const url of urls) {
      try { await injectScript(url, isReady); return; } catch (err) {
        lastErr = err;
        console.warn(`${err.message}; trying next source`);
      }
    }
    throw lastErr;
  };

  // Lazy load Chart.js and then its annotation plugin, strictly in that order.
  // chartJsLoaded flips only after BOTH are registered: a chart created in
  // between has no annotation state and throws "visibleElements" on draw.
  // The in-flight promise lives in a ref so concurrent callers (the Charts tab
  // and the Node Status section can both ask on the same render) share one load
  // instead of injecting Chart.js twice, which would drop the plugin registration.
  const chartJsPromiseRef = useRef(null);
  const loadChartJs = () => {
    if (chartJsLoaded) return Promise.resolve();
    if (chartJsPromiseRef.current) return chartJsPromiseRef.current;
    const hasChart = () => typeof window.Chart === 'function';
    const hasAnnotation = () => hasChart() && !!window.Chart.registry?.plugins?.get?.('annotation');
    setChartJsLoading(true);
    chartJsPromiseRef.current = (async () => {
      try {
        await loadScript(
          ['assets/js/chart.umd.min.js', 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'],
          hasChart
        );
        await loadScript(
          ['assets/js/chartjs-plugin-annotation.min.js', 'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js'],
          hasAnnotation
        );
        setChartJsLoaded(true);
      } catch (error) {
        console.error('Failed to load Chart.js:', error);
        chartJsPromiseRef.current = null; // allow a later retry
      } finally {
        setChartJsLoading(false);
      }
    })();
    return chartJsPromiseRef.current;
  };

  return {
    data, setData,
    loading, setLoading,
    error, setError,
    lastUpdate, setLastUpdate,
    nextUpdate, setNextUpdate,
    backendCollected,
    clusterHealth,
    nodeScores,
    chartPeriod, setChartPeriod,
    charts, setCharts,
    chartJsLoaded,
    chartJsLoading,
    guestProfiles,
    scoreHistory,
    fetchAnalysis,
    fetchGuestLocations,
    fetchGuestProfiles,
    fetchScoreHistory,
    handleRefresh,
    fetchNodeScores,
    loadChartJs
  };
}
