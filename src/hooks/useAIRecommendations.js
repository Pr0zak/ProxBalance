const { useState } = React;

export function useAIRecommendations(API_BASE, deps = {}) {
  const { data, setError } = deps;

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState('none');
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [openaiModelCustom, setOpenaiModelCustom] = useState('');
  const [openaiAvailableModels, setOpenaiAvailableModels] = useState([]);
  const [openaiLoadingModels, setOpenaiLoadingModels] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [anthropicModel, setAnthropicModel] = useState('claude-3-5-sonnet-20241022');
  const [anthropicModelCustom, setAnthropicModelCustom] = useState('');
  const [anthropicAvailableModels, setAnthropicAvailableModels] = useState([]);
  const [anthropicLoadingModels, setAnthropicLoadingModels] = useState(false);
  const [localUrl, setLocalUrl] = useState('http://localhost:11434');
  const [localModel, setLocalModel] = useState('llama2');
  const [localModelCustom, setLocalModelCustom] = useState('');
  const [localAvailableModels, setLocalAvailableModels] = useState([]);
  const [localLoadingModels, setLocalLoadingModels] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiAnalysisPeriod, setAiAnalysisPeriod] = useState('24h');

  // Initialize AI state from config
  const initFromConfig = (config) => {
    if (!config) return;
    setAiProvider(config.ai_provider || 'none');
    setAiEnabled(config.ai_recommendations_enabled || false);
    if (config.ai_config) {
      if (config.ai_config.openai) {
        setOpenaiKey(config.ai_config.openai.api_key || '');
        setOpenaiModel(config.ai_config.openai.model || 'gpt-4o');
      }
      if (config.ai_config.anthropic) {
        setAnthropicKey(config.ai_config.anthropic.api_key || '');
        setAnthropicModel(config.ai_config.anthropic.model || 'claude-3-5-sonnet-20241022');
      }
      if (config.ai_config.local) {
        setLocalUrl(config.ai_config.local.base_url || 'http://localhost:11434');
        setLocalModel(config.ai_config.local.model || 'llama2');
      }
    }
  };

  const fetchAiRecommendations = async (thresholds = {}, maintenanceNodes = new Set()) => {
    if (!data) return;
    setLoadingAi(true);
    try {
      const response = await fetch(`${API_BASE}/ai-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpu_threshold: thresholds.cpu || 50,
          mem_threshold: thresholds.mem || 60,
          analysis_period: aiAnalysisPeriod,
          maintenance_nodes: Array.from(maintenanceNodes)
        })
      });
      const result = await response.json();
      if (result.success) {
        setAiRecommendations(result);
      } else {
        setAiRecommendations({ success: false, error: result.error });
      }
    } catch (err) {
      setAiRecommendations({ success: false, error: err.message });
    }
    setLoadingAi(false);
  };

  const fetchAiModels = async (provider, apiKey = null, baseUrl = null) => {
    const setLoadingFn = provider === 'openai' ? setOpenaiLoadingModels
      : provider === 'anthropic' ? setAnthropicLoadingModels
      : setLocalLoadingModels;
    const setModelsFn = provider === 'openai' ? setOpenaiAvailableModels
      : provider === 'anthropic' ? setAnthropicAvailableModels
      : setLocalAvailableModels;

    setLoadingFn(true);
    try {
      const payload = { provider };
      if (apiKey) payload.api_key = apiKey;
      if (baseUrl) payload.base_url = baseUrl;

      const response = await fetch(`${API_BASE}/ai-models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        setModelsFn(result.models);
      } else {
        if (setError) setError(`Failed to fetch models: ${result.error}`);
      }
    } catch (err) {
      if (setError) setError(`Failed to fetch models: ${err.message}`);
    }
    setLoadingFn(false);
  };

  // Build settings payload for saving
  const getSettingsPayload = () => ({
    ai_provider: aiProvider,
    ai_recommendations_enabled: aiEnabled,
    ai_config: {
      openai: {
        api_key: openaiKey,
        model: openaiModelCustom || openaiModel
      },
      anthropic: {
        api_key: anthropicKey,
        model: anthropicModel
      },
      local: {
        base_url: localUrl,
        model: localModelCustom || localModel
      }
    }
  });

  return {
    aiEnabled, setAiEnabled,
    aiProvider, setAiProvider,
    openaiKey, setOpenaiKey,
    openaiModel, setOpenaiModel,
    openaiModelCustom, setOpenaiModelCustom,
    openaiAvailableModels, setOpenaiAvailableModels,
    openaiLoadingModels, setOpenaiLoadingModels,
    anthropicKey, setAnthropicKey,
    anthropicModel, setAnthropicModel,
    anthropicModelCustom, setAnthropicModelCustom,
    anthropicAvailableModels, setAnthropicAvailableModels,
    anthropicLoadingModels, setAnthropicLoadingModels,
    localUrl, setLocalUrl,
    localModel, setLocalModel,
    localModelCustom, setLocalModelCustom,
    localAvailableModels, setLocalAvailableModels,
    localLoadingModels, setLocalLoadingModels,
    aiRecommendations, setAiRecommendations,
    loadingAi,
    aiAnalysisPeriod, setAiAnalysisPeriod,
    initFromConfig,
    fetchAiRecommendations,
    fetchAiModels,
    getSettingsPayload
  };
}
