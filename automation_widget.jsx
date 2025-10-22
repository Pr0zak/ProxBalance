                {/* Automated Migrations Status */}
                {automationStatus && (
                  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg shadow-md ${
                          automationStatus.enabled
                            ? 'bg-gradient-to-br from-green-600 to-emerald-600'
                            : 'bg-gradient-to-br from-gray-500 to-gray-600'
                        }`}>
                          <Clock size={24} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Automated Migrations</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Scheduled automatic balancing</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setCurrentPage('automation')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                          <Settings size={16} />
                          Configure
                        </button>
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                          automationStatus.enabled
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {automationStatus.enabled ? 'Active' : 'Disabled'}
                        </div>
                      </div>
                    </div>

                    {automationStatus.dry_run && automationStatus.enabled && (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400" />
                          <span className="font-semibold text-yellow-700 dark:text-yellow-300">DRY RUN MODE</span>
                          <span className="text-yellow-600 dark:text-yellow-400">- No actual migrations will be performed</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Timer Status</div>
                        <div className={`text-sm font-semibold ${
                          automationStatus.timer_active
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {automationStatus.timer_active ? 'Running' : 'Stopped'}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Check Interval</div>
                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {automationStatus.check_interval_minutes} min
                        </div>
                      </div>
                    </div>

                    {automationStatus.state && (
                      <div className="space-y-2 mb-4">
                        {automationStatus.state.current_window && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Current Window:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{automationStatus.state.current_window}</span>
                          </div>
                        )}
                        {automationStatus.state.last_run && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Last Run:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {new Date(automationStatus.state.last_run).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Auto-Migrations</h4>
                        <div className="space-y-2">
                          {automationStatus.recent_migrations.slice(0, 3).map(migration => (
                            <div key={migration.id} className="flex items-center justify-between text-sm bg-white dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-900 dark:text-white font-medium">{migration.name}</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300">{migration.target_node}</span>
                                {migration.dry_run && (
                                  <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                                    DRY RUN
                                  </span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                migration.status === 'completed'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {migration.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

