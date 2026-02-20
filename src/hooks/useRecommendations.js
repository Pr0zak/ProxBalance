import { DEFAULT_CPU_THRESHOLD, DEFAULT_MEM_THRESHOLD, DEFAULT_IOWAIT_THRESHOLD } from '../utils/constants.js';

const { useState, useEffect } = React;

export function useRecommendations(API_BASE, deps = {}) {
  const { data, maintenanceNodes } = deps;

  const [recommendations, setRecommendations] = useState([]);
  const [recommendationData, setRecommendationData] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  const [cpuThreshold, setCpuThreshold] = useState(() => {
    const saved = localStorage.getItem('proxbalance_cpu_threshold');
    return saved ? Number(saved) : DEFAULT_CPU_THRESHOLD;
  });
  const [memThreshold, setMemThreshold] = useState(() => {
    const saved = localStorage.getItem('proxbalance_mem_threshold');
    return saved ? Number(saved) : DEFAULT_MEM_THRESHOLD;
  });
  const [iowaitThreshold, setIowaitThreshold] = useState(() => {
    const saved = localStorage.getItem('proxbalance_iowait_threshold');
    return saved ? Number(saved) : DEFAULT_IOWAIT_THRESHOLD;
  });

  // Load thresholds from config.json on mount (authoritative source)
  useEffect(() => {
    fetch(`${API_BASE}/settings/recommendation-thresholds`)
      .then(r => r.json())
      .then(result => {
        if (result.success && result.thresholds) {
          setCpuThreshold(result.thresholds.cpu_threshold);
          setMemThreshold(result.thresholds.mem_threshold);
          setIowaitThreshold(result.thresholds.iowait_threshold);
          // Sync localStorage
          localStorage.setItem('proxbalance_cpu_threshold', result.thresholds.cpu_threshold.toString());
          localStorage.setItem('proxbalance_mem_threshold', result.thresholds.mem_threshold.toString());
          localStorage.setItem('proxbalance_iowait_threshold', result.thresholds.iowait_threshold.toString());
        }
      })
      .catch(() => {}); // Fall back to localStorage/defaults on error
  }, []);

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

  // Fetch cached recommendations (GET - fast, no regeneration)
  const fetchCachedRecommendations = async () => {
    if (!data) return;
    try {
      const response = await fetch(`${API_BASE}/recommendations`);
      const result = await response.json();
      if (result.success) {
        setRecommendations(result.recommendations);
        setRecommendationData(result);
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
    cpuThreshold, setCpuThreshold,
    memThreshold, setMemThreshold,
    iowaitThreshold, setIowaitThreshold,
    fetchCachedRecommendations,
    fetchRecommendations,
    generateRecommendations,
    onFeedback
  };
}
