const { useState, useMemo } = React;

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
        if (result.data.collected_at) {
          setBackendCollected(new Date(result.data.collected_at));
        }
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

  // Memoized sparkline generator
  const generateSparkline = useMemo(() => {
    return (value, maxValue, samples = 40, frequency = 0.3) => {
      const points = [];
      for (let i = 0; i < samples; i++) {
        const variation = (Math.sin(i * frequency) * value * 0.3) + (Math.random() * value * 0.2);
        const adjustedValue = Math.max(0, value + variation);
        const x = (i / (samples - 1)) * 100;
        const y = 100 - ((adjustedValue / maxValue) * 100);
        points.push(`${x},${y}`);
      }
      return points.join(' ');
    };
  }, []);

  // Lazy load Chart.js library
  const loadChartJs = async () => {
    if (chartJsLoaded || chartJsLoading) return;

    setChartJsLoading(true);
    try {
      await new Promise((resolve, reject) => {
        const script1 = document.createElement('script');
        script1.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script1.onload = resolve;
        script1.onerror = reject;
        document.head.appendChild(script1);
      });

      await new Promise((resolve, reject) => {
        const script2 = document.createElement('script');
        script2.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js';
        script2.onload = resolve;
        script2.onerror = reject;
        document.head.appendChild(script2);
      });

      setChartJsLoaded(true);
    } catch (error) {
      console.error('Failed to load Chart.js:', error);
    } finally {
      setChartJsLoading(false);
    }
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
    fetchAnalysis,
    fetchGuestLocations,
    handleRefresh,
    fetchNodeScores,
    generateSparkline,
    loadChartJs
  };
}
