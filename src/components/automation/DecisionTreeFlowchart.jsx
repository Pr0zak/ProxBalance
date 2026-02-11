import {
  ChevronDown, ChevronUp, Info
} from '../Icons.jsx';

export default function DecisionTreeFlowchart({
  collapsedSections, setCollapsedSections
}) {
  return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg mb-6">
          <button
            onClick={() => setCollapsedSections(prev => ({...prev, decisionTree: !prev.decisionTree}))}
            className="w-full flex items-center justify-between p-5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex-wrap gap-y-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Info size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="font-bold text-blue-900 dark:text-blue-200 text-left">Migration Decision Flowchart</div>
            </div>
            {collapsedSections.decisionTree ? (
              <ChevronDown size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
            ) : (
              <ChevronUp size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
            )}
          </button>

          {!collapsedSections.decisionTree && (
            <div className="px-5 pb-5">
              <div className="text-sm text-blue-800 dark:text-blue-300 space-y-4">
                <p className="font-semibold text-blue-900 dark:text-blue-200">
                  This decision tree shows all possible paths through the automated migration process:
                </p>

                {/* Decision Tree Diagram */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 rounded-lg p-6 border-2 border-blue-300 dark:border-blue-600 shadow-sm">
                  <div className="space-y-4">

                    {/* Start Box */}
                    <div className="flex justify-center">
                      <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-shadow">
                        🚀 Automation Run Triggered
                      </div>
                    </div>

                    {/* Flow connector with arrow */}
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600"></div>
                      <div className="text-blue-500 dark:text-blue-400">▼</div>
                    </div>

                    {/* Decision boxes */}
                    <div className="space-y-3">

                      {/* Step 1 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">1</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>⚙️</span> Is automation enabled?
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                <span className="text-red-600 dark:text-red-400 font-bold">✗ NO</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">STOP</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">2</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>⏱️</span> Is cooldown period elapsed?
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                                <span className="text-orange-600 dark:text-orange-400 font-bold">✗ NO</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">SKIP</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">3</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>🕐</span> In allowed time window?
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                <span className="text-red-600 dark:text-red-400 font-bold">✗ BLACKOUT</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">BLOCKED</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                                <span className="text-orange-600 dark:text-orange-400 font-bold">✗ OUTSIDE</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">SKIP</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">4</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>🏥</span> Is cluster healthy? <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(if enabled)</span>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                <span className="text-red-600 dark:text-red-400 font-bold">✗ NO</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">ABORT</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 5 - Process Box */}
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border-2 border-indigo-300 dark:border-indigo-600 p-5 shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">5</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <span>🎯</span> Generate Recommendations
                            </div>
                            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                              <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Calculate penalty scores for all nodes</div>
                              <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Find VMs on high-penalty nodes</div>
                              <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Match with low-penalty target nodes</div>
                              <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Apply filters (tags, storage, rollback detection)</div>
                              <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Calculate confidence scores</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 6 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">6</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>👁</span> Persistent recommendation? <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(if intelligent migrations enabled)</span>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-cyan-50 dark:bg-cyan-900/10 rounded-lg">
                                <span className="text-cyan-600 dark:text-cyan-400 font-bold">OBSERVING</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-cyan-500 dark:bg-cyan-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">DEFER</span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1">Not enough consecutive observations</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">READY</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1">Met threshold, continue</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/10 rounded-lg">
                                <span className="text-gray-600 dark:text-gray-400 font-bold">BYPASSED</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1">Feature disabled or maintenance evacuation</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 7 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">7</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>📊</span> Any recommendations above min confidence?
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                                <span className="text-orange-600 dark:text-orange-400 font-bold">✗ NO</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">SKIP</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 8 - Intelligent Filters */}
                      <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-xl border-2 border-cyan-300 dark:border-cyan-600 p-5 shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-cyan-600 to-teal-600 dark:from-cyan-500 dark:to-teal-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">8</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <span>🧠</span> Intelligent Filters <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(per recommendation, if enabled)</span>
                            </div>
                            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                              <div className="flex items-start gap-2"><span className="text-cyan-600 dark:text-cyan-400">▸</span> Conflict detection — skip if target overloaded by multiple migrations</div>
                              <div className="flex items-start gap-2"><span className="text-cyan-600 dark:text-cyan-400">▸</span> Risk-adjusted confidence — require higher confidence for risky moves</div>
                              <div className="flex items-start gap-2"><span className="text-cyan-600 dark:text-cyan-400">▸</span> Trend awareness — defer if source load is falling</div>
                              <div className="flex items-start gap-2"><span className="text-cyan-600 dark:text-cyan-400">▸</span> Outcome learning — raise bar for historically poor node pairs</div>
                              <div className="flex items-start gap-2"><span className="text-cyan-600 dark:text-cyan-400">▸</span> Pattern suppression — defer during known peak periods</div>
                              <div className="flex items-start gap-2"><span className="text-cyan-600 dark:text-cyan-400">▸</span> Cost-benefit ratio — skip low-ROI migrations</div>
                              <div className="flex items-start gap-2"><span className="text-cyan-600 dark:text-cyan-400">▸</span> Cycle prevention — block A→B→C→A ping-pong</div>
                              <div className="flex items-start gap-2"><span className="text-cyan-600 dark:text-cyan-400">▸</span> Guest success tracking — deprioritize poor-performing guests</div>
                            </div>
                            <div className="mt-2 space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                                <span className="text-amber-600 dark:text-amber-400 font-bold">FILTERED</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-amber-500 dark:bg-amber-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">SKIP</span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1">Failed a filter check</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓ PASSED</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 9 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">9</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>🧪</span> Is dry run mode enabled?
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                                <span className="text-blue-600 dark:text-blue-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-blue-500 dark:bg-blue-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">LOG ONLY</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✗ NO</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Execute ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 10 - Action Box */}
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border-2 border-emerald-300 dark:border-emerald-600 p-5 shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-emerald-600 to-green-600 dark:from-emerald-500 dark:to-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">10</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <span>⚡</span> Execute Migrations
                            </div>
                            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                              <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> Limit to max migrations per run (default: 3)</div>
                              <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> Execute migrations sequentially</div>
                              <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> If migration fails + abort_on_failure: STOP batch</div>
                              <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> If migration fails + pause_on_failure: DISABLE automation</div>
                              <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> Track migration status and update history</div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Flow connector with arrow */}
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-400 to-green-500 dark:from-emerald-500 dark:to-green-600"></div>
                      <div className="text-emerald-500 dark:text-emerald-400">▼</div>
                    </div>

                    {/* End Box */}
                    <div className="flex justify-center">
                      <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 dark:from-emerald-500 dark:via-green-500 dark:to-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-shadow flex items-center gap-3">
                        <span className="text-2xl">✓</span> <span>Run Complete</span>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600">
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <span>💡</span> Configuration Profiles
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                      <div className="font-bold text-gray-900 dark:text-white mb-1">🛡️ Conservative</div>
                      <div className="text-gray-600 dark:text-gray-400 space-y-0.5">
                        <div>• Min confidence: 80+</div>
                        <div>• Max migrations: 1-2</div>
                        <div>• Cooldown: 60+ min</div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                      <div className="font-bold text-gray-900 dark:text-white mb-1">⚖️ Balanced</div>
                      <div className="text-gray-600 dark:text-gray-400 space-y-0.5">
                        <div>• Min confidence: 70+</div>
                        <div>• Max migrations: 3-5</div>
                        <div>• Cooldown: 30-60 min</div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                      <div className="font-bold text-gray-900 dark:text-white mb-1">⚡ Aggressive</div>
                      <div className="text-gray-600 dark:text-gray-400 space-y-0.5">
                        <div>• Min confidence: 60+</div>
                        <div>• Max migrations: 5-10</div>
                        <div>• Cooldown: 15-30 min</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
  );
}
