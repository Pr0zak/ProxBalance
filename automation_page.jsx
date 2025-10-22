          // Automation Settings Page
          if (currentPage === 'automation') {
            if (!automationConfig) {
              return (
                <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                  <div className="text-gray-600 dark:text-gray-400">Loading automation settings...</div>
                </div>
              );
            }

            return (
              <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="max-w-5xl mx-auto p-4">
                  {/* Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setCurrentPage('dashboard')}
                          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                          title="Back to Dashboard"
                        >
                          <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
                        </button>
                        <div className="flex items-center gap-3">
                          <Clock size={28} className="text-blue-600 dark:text-blue-400" />
                          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Automated Migrations</h1>
                        </div>
                      </div>
                      <button
                        onClick={testAutomation}
                        disabled={testingAutomation}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                      >
                        <Play size={18} />
                        {testingAutomation ? 'Running Test...' : 'Test Now'}
                      </button>
                    </div>
                  </div>

                  {/* Test Results */}
                  {testResult && (
                    <div className={`rounded-lg shadow p-6 mb-6 ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'}`}>
                      <div className="flex items-start gap-3">
                        <div className="shrink-0">
                          {testResult.success ? (
                            <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle size={24} className="text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold mb-2 ${testResult.success ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>
                            {testResult.success ? 'Test Completed Successfully' : 'Test Failed'}
                          </div>
                          <pre className={`text-sm whitespace-pre-wrap font-mono p-3 rounded ${testResult.success ? 'bg-green-100 dark:bg-green-800/30 text-green-900 dark:text-green-100' : 'bg-red-100 dark:bg-red-800/30 text-red-900 dark:text-red-100'}`}>
                            {testResult.output || testResult.error || 'No output available'}
                          </pre>
                        </div>
                        <button
                          onClick={() => setTestResult(null)}
                          className={`shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                          title="Dismiss"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Main Settings */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Main Settings</h2>

                    <div className="space-y-4">
                      {/* Enable/Disable */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">Enable Automated Migrations</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Turn automation on or off</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={automationConfig.enabled || false}
                            onChange={(e) => {
                              if (e.target.checked && !confirm('Enable automated migrations? The system will automatically migrate VMs based on your configured rules.')) {
                                return;
                              }
                              saveAutomationConfig({ enabled: e.target.checked });
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      {/* Dry Run */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">Dry Run Mode</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Test without actual migrations (recommended)</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={automationConfig.dry_run !== false}
                            onChange={(e) => {
                              if (!e.target.checked && !confirm('⚠️ DISABLE DRY RUN MODE?\n\nThis will enable REAL automated migrations!\nVMs will actually be migrated automatically.\n\nAre you absolutely sure?')) {
                                return;
                              }
                              saveAutomationConfig({ dry_run: e.target.checked });
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-600"></div>
                        </label>
                      </div>

                      {/* Check Interval */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                          Check Interval (minutes)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={automationConfig.check_interval_minutes || 5}
                          onChange={(e) => saveAutomationConfig({ check_interval_minutes: parseInt(e.target.value) })}
                          className="w-32 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                        />
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          How often to check for migrations
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Safety Rules */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Safety Rules</h2>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Min Confidence Score
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={automationConfig.rules?.min_confidence_score || 75}
                          onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, min_confidence_score: parseInt(e.target.value) } })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Migrations Per Run
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={automationConfig.rules?.max_migrations_per_run || 3}
                          onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_migrations_per_run: parseInt(e.target.value) } })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Node CPU %
                        </label>
                        <input
                          type="number"
                          min="50"
                          max="100"
                          value={automationConfig.safety_checks?.max_node_cpu_percent || 85}
                          onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_cpu_percent: parseInt(e.target.value) } })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Node Memory %
                        </label>
                        <input
                          type="number"
                          min="50"
                          max="100"
                          value={automationConfig.safety_checks?.max_node_memory_percent || 90}
                          onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_memory_percent: parseInt(e.target.value) } })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={automationConfig.rules?.respect_ignore_tags !== false}
                          onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, respect_ignore_tags: e.target.checked } })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Respect 'ignore' tags
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={automationConfig.rules?.respect_exclude_affinity !== false}
                          onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, respect_exclude_affinity: e.target.checked } })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Respect anti-affinity (exclude_* tags)
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={automationConfig.safety_checks?.require_quorum !== false}
                          onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, require_quorum: e.target.checked } })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Require cluster quorum
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={automationConfig.rules?.allow_container_restarts === true}
                          onChange={(e) => {
                            if (e.target.checked && !confirm('⚠️ ALLOW CONTAINER RESTARTS?\n\nThis will allow automated migrations to restart containers that cannot be live-migrated.\nContainers will experience brief downtime during migration.\n\nAre you sure?')) {
                              return;
                            }
                            saveAutomationConfig({ rules: { ...automationConfig.rules, allow_container_restarts: e.target.checked } });
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Allow container restarts for migration (may cause brief downtime)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Note about advanced settings */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900 dark:text-blue-200">
                        <div className="font-semibold mb-1">Advanced Settings</div>
                        <div>
                          Migration windows, blackout periods, and other advanced settings can be configured by editing
                          <code className="mx-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">/opt/proxmox-balance-manager/config.json</code>
                          on CT 100.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
