const { useState, useEffect } = React;

export function useRecommendations(API_BASE, deps = {}) {
  const { data, maintenanceNodes } = deps;

  const [recommendations, setRecommendations] = useState([]);
  const [recommendationData, setRecommendationData] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [thresholdSuggestions, setThresholdSuggestions] = useState(null);

  const [cpuThreshold, setCpuThreshold] = useState(() => {
    const saved = localStorage.getItem('proxbalance_cpu_threshold');
    return saved ? Number(saved) : 50;
  });
  const [memThreshold, setMemThreshold] = useState(() => {
    const saved = localStorage.getItem('proxbalance_mem_threshold');
    return saved ? Number(saved) : 60;
  });
  const [iowaitThreshold, setIowaitThreshold] = useState(() => {
    const saved = localStorage.getItem('proxbalance_iowait_threshold');
    return saved ? Number(saved) : 30;
  });
  const [thresholdMode, setThresholdMode] = useState(() => {
    const saved = localStorage.getItem('proxbalance_threshold_mode');
    return saved || 'manual';
  });

  // Save thresholds to localStorage
  useEffect(() => {
    localStorage.setItem('proxbalance_cpu_threshold', cpuThreshold.toString());
  }, [cpuThreshold]);

  useEffect(() => {
    localStorage.setItem('proxbalance_mem_threshold', memThreshold.toString());
  }, [memThreshold]);

  useEffect(() => {
    localStorage.setItem('proxbalance_iowait_threshold', iowaitThreshold.toString());
  }, [iowaitThreshold]);

  useEffect(() => {
    localStorage.setItem('proxbalance_threshold_mode', thresholdMode);
  }, [thresholdMode]);

  // Auto-apply suggested thresholds when in auto mode
  useEffect(() => {
    if (thresholdMode === 'auto' && thresholdSuggestions) {
      setCpuThreshold(thresholdSuggestions.suggested_cpu_threshold);
      setMemThreshold(thresholdSuggestions.suggested_mem_threshold);
      setIowaitThreshold(thresholdSuggestions.suggested_iowait_threshold);
    }
  }, [thresholdMode, thresholdSuggestions]);

  // Fetch cached recommendations (GET - fast, no regeneration)
  const fetchCachedRecommendations = async () => {
    if (!data) return;
    try {
      const response = await fetch(`${API_BASE}/recommendations`);
      const result = await response.json();
      if (result.success) {
        setRecommendations(result.recommendations);
        setRecommendationData(result);
        if (result.threshold_suggestions) {
          setThresholdSuggestions(result.threshold_suggestions);
        }
      } else if (result.cache_missing) {
        generateRecommendations();
      }
    } catch (err) {
      console.error('Error fetching cached recommendations:', err);
    }
  };

  // Generate new recommendations (POST - slower, full computation)
  const generateRecommendations = async () => {
    if (!data) return;
    setLoadingRecommendations(true);
    try {
      const response = await fetch(`${API_BASE}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpu_threshold: cpuThreshold,
          mem_threshold: memThreshold,
          iowait_threshold: iowaitThreshold,
          maintenance_nodes: maintenanceNodes ? Array.from(maintenanceNodes) : []
        })
      });
      const result = await response.json();
      if (result.success) {
        setRecommendations(result.recommendations);
        setRecommendationData(result);
        if (result.threshold_suggestions) {
          setThresholdSuggestions(result.threshold_suggestions);
        }
      }
    } catch (err) {
      console.error('Error generating recommendations:', err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Legacy alias
  const fetchRecommendations = fetchCachedRecommendations;

  // Recommendation feedback handler
  const onFeedback = async (rec, rating) => {
    const key = `${rec.vmid}-${rec.target_node}`;
    try {
      const response = await fetch(`${API_BASE}/recommendations/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vmid: rec.vmid,
          rating: rating,
          source_node: rec.source_node,
          target_node: rec.target_node,
          score_improvement: rec.score_improvement,
        })
      });
      if (response.ok) {
        setFeedbackGiven(prev => ({ ...prev, [key]: rating }));
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  return {
    recommendations, setRecommendations,
    recommendationData,
    loadingRecommendations,
    feedbackGiven,
    thresholdSuggestions,
    cpuThreshold, setCpuThreshold,
    memThreshold, setMemThreshold,
    iowaitThreshold, setIowaitThreshold,
    thresholdMode, setThresholdMode,
    fetchCachedRecommendations,
    fetchRecommendations,
    generateRecommendations,
    onFeedback
  };
}
