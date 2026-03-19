import { RefreshCw } from '../Icons.jsx';
import { API_BASE } from '../../utils/constants.js';

export default function AIProviderSection({
  aiEnabled, setAiEnabled, aiProvider, setAiProvider,
  openaiKey, setOpenaiKey, openaiModel, setOpenaiModel,
  anthropicKey, setAnthropicKey, anthropicModel, setAnthropicModel,
  localUrl, setLocalUrl, localModel, setLocalModel,
  localLoadingModels, setLocalLoadingModels, localAvailableModels, setLocalAvailableModels,
  collapsedSections, setCollapsedSections,
  setError
}) {
  return (<>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        AI-Powered Recommendations
                      </label>
                      <div className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          checked={aiEnabled}
                          onChange={(e) => setAiEnabled(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Enable AI-Enhanced Migration Recommendations
                        </label>
                      </div>
                    </div>

                    {aiEnabled && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            AI Provider
                          </label>
                          <select
                            value={aiProvider}
                            onChange={(e) => setAiProvider(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="none">None</option>
                            <option value="openai">OpenAI (GPT-4)</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="local">Local LLM (Ollama)</option>
                          </select>
                        </div>

                        {aiProvider === 'openai' && (
                          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">OpenAI Configuration</h4>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                API Key
                              </label>
                              <input
                                type="password"
                                value={openaiKey}
                                onChange={(e) => setOpenaiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                Model
                              </label>
                              <input
                                type="text"
                                value={openaiModel}
                                onChange={(e) => setOpenaiModel(e.target.value)}
                                placeholder="gpt-4o"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                See available models at <a href="https://platform.openai.com/docs/models" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">OpenAI Models</a>
                              </p>
                            </div>
                          </div>
                        )}

                        {aiProvider === 'anthropic' && (
                          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">Anthropic Configuration</h4>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                API Key
                              </label>
                              <input
                                type="password"
                                value={anthropicKey}
                                onChange={(e) => setAnthropicKey(e.target.value)}
                                placeholder="sk-ant-..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                Model
                              </label>
                              <input
                                type="text"
                                value={anthropicModel}
                                onChange={(e) => setAnthropicModel(e.target.value)}
                                placeholder="claude-3-5-sonnet-20241022"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                See available models at <a href="https://docs.anthropic.com/en/docs/about-claude/models" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Anthropic Models</a>
                              </p>
                            </div>
                          </div>
                        )}

                        {aiProvider === 'local' && (
                          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">Local LLM (Ollama) Configuration</h4>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ollama Base URL
                              </label>
                              <input
                                type="text"
                                value={localUrl}
                                onChange={(e) => setLocalUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="http://localhost:11434"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">The URL where Ollama is running</p>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Model
                                </label>
                                <button
                                  onClick={async () => {
                                    setLocalLoadingModels(true);
                                    try {
                                      const response = await fetch('/api/ai-models', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          provider: 'local',
                                          base_url: localUrl
                                        })
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        setLocalAvailableModels(data.models || []);
                                      } else {
                                        setError('Failed to fetch models: ' + (data.error || 'Unknown error'));
                                      }
                                    } catch (error) {
                                      setError('Error fetching models: ' + error.message);
                                    } finally {
                                      setLocalLoadingModels(false);
                                    }
                                  }}
                                  disabled={localLoadingModels}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400"
                                >
                                  <RefreshCw size={12} className={localLoadingModels ? 'animate-spin' : ''} />
                                  {localLoadingModels ? 'Loading...' : 'Refresh Models'}
                                </button>
                              </div>
                              {localAvailableModels.length > 0 ? (
                                <select
                                  value={localModel}
                                  onChange={(e) => setLocalModel(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  {localAvailableModels.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={localModel}
                                  onChange={(e) => setLocalModel(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder="llama3.1:8b"
                                />
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ollama model to use for recommendations</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                              <p className="text-sm text-blue-900 dark:text-blue-200">
                                <strong>Note:</strong> Ensure Ollama is installed and running. Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">ollama.ai</a> for installation instructions.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
  </>);
}
