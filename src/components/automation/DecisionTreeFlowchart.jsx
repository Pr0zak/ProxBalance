import {
  ChevronDown
} from '../Icons.jsx';

export default function DecisionTreeFlowchart({
  collapsedSections, setCollapsedSections
}) {
  return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <button
            onClick={() => setCollapsedSections(prev => ({...prev, decisionTree: !prev.decisionTree}))}
            className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity flex-wrap gap-y-3"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Migration Decision Flowchart</h2>
            <ChevronDown
              size={24}
              className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.decisionTree ? '' : '-rotate-180'}`}
            />
          </button>

          {!collapsedSections.decisionTree && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This decision tree shows all possible paths through the automated migration process:
              </p>

              {/* Decision Tree Diagram */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="space-y-4">

                  {/* Start Box */}
                  <div className="flex justify-center">
                    <div className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold text-sm shadow-md">
                      Automation Run Triggered
                    </div>
                  </div>

                  {/* Flow connector */}
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="text-gray-400 dark:text-gray-500 text-xs">&#9660;</div>
                  </div>

                  {/* Decision boxes */}
                  <div className="space-y-3">

                    {/* Step 1 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Is automation enabled?</div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 p-1.5 bg-red-50 dark:bg-red-900/10 rounded">
                              <span className="text-red-600 dark:text-red-400 font-bold">NO</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="bg-red-500 dark:bg-red-600 text-white px-2 py-0.5 rounded text-xs font-semibold">STOP</span>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 bg-green-50 dark:bg-green-900/10 rounded">
                              <span className="text-green-600 dark:text-green-400 font-bold">YES</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="text-gray-600 dark:text-gray-400">Continue</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Is cooldown period elapsed?</div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 p-1.5 bg-orange-50 dark:bg-orange-900/10 rounded">
                              <span className="text-orange-600 dark:text-orange-400 font-bold">NO</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="bg-orange-500 dark:bg-orange-600 text-white px-2 py-0.5 rounded text-xs font-semibold">SKIP</span>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 bg-green-50 dark:bg-green-900/10 rounded">
                              <span className="text-green-600 dark:text-green-400 font-bold">YES</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="text-gray-600 dark:text-gray-400">Continue</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">In allowed time window?</div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 p-1.5 bg-red-50 dark:bg-red-900/10 rounded">
                              <span className="text-red-600 dark:text-red-400 font-bold">BLACKOUT</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="bg-red-500 dark:bg-red-600 text-white px-2 py-0.5 rounded text-xs font-semibold">BLOCKED</span>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 bg-orange-50 dark:bg-orange-900/10 rounded">
                              <span className="text-orange-600 dark:text-orange-400 font-bold">OUTSIDE</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="bg-orange-500 dark:bg-orange-600 text-white px-2 py-0.5 rounded text-xs font-semibold">SKIP</span>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 bg-green-50 dark:bg-green-900/10 rounded">
                              <span className="text-green-600 dark:text-green-400 font-bold">YES</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="text-gray-600 dark:text-gray-400">Continue</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0">4</div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                            Is cluster healthy? <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(if enabled)</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 p-1.5 bg-red-50 dark:bg-red-900/10 rounded">
                              <span className="text-red-600 dark:text-red-400 font-bold">NO</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="bg-red-500 dark:bg-red-600 text-white px-2 py-0.5 rounded text-xs font-semibold">ABORT</span>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 bg-green-50 dark:bg-green-900/10 rounded">
                              <span className="text-green-600 dark:text-green-400 font-bold">YES</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="text-gray-600 dark:text-gray-400">Continue</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 5 - Process Box */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-indigo-600 dark:bg-indigo-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0">5</div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Generate Recommendations</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 bg-white dark:bg-gray-800 p-2.5 rounded border border-gray-200 dark:border-gray-700">
                            <div>&#8227; Calculate penalty scores for all nodes</div>
                            <div>&#8227; Find VMs on high-penalty nodes</div>
                            <div>&#8227; Match with low-penalty target nodes</div>
                            <div>&#8227; Apply filters (tags, storage, compatibility)</div>
                            <div>&#8227; Calculate confidence scores</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 6 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0">6</div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Persistent recommendation?</div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 p-1.5 bg-cyan-50 dark:bg-cyan-900/10 rounded">
                              <span className="text-cyan-600 dark:text-cyan-400 font-bold">OBSERVING</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="bg-cyan-500 dark:bg-cyan-600 text-white px-2 py-0.5 rounded text-xs font-semibold">DEFER</span>
                              <span className="text-gray-500 dark:text-gray-400 ml-1">Not enough observations</span>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 bg-green-50 dark:bg-green-900/10 rounded">
                              <span className="text-green-600 dark:text-green-400 font-bold">READY</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="text-gray-600 dark:text-gray-400">Continue</span>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-gray-700/50 rounded">
                              <span className="text-gray-600 dark:text-gray-400 font-bold">BYPASSED</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="text-gray-600 dark:text-gray-400">Continue</span>
                              <span className="text-gray-500 dark:text-gray-400 ml-1">Feature disabled</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 7 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0">7</div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Any recommendations above min confidence?</div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 p-1.5 bg-orange-50 dark:bg-orange-900/10 rounded">
                              <span className="text-orange-600 dark:text-orange-400 font-bold">NO</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="bg-orange-500 dark:bg-orange-600 text-white px-2 py-0.5 rounded text-xs font-semibold">SKIP</span>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 bg-green-50 dark:bg-green-900/10 rounded">
                              <span className="text-green-600 dark:text-green-400 font-bold">YES</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="text-gray-600 dark:text-gray-400">Continue</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 8 - Intelligent Filters */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-indigo-600 dark:bg-indigo-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0">8</div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                            Intelligent Filters <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(per recommendation)</span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 bg-white dark:bg-gray-800 p-2.5 rounded border border-gray-200 dark:border-gray-700 mb-2">
                            <div><span className="font-semibold text-gray-700 dark:text-gray-300">Basic:</span> Cycle prevention, Conflict detection</div>
                            <div><span className="font-semibold text-gray-700 dark:text-gray-300">Standard:</span> + Cost-benefit, Outcome learning, Guest tracking</div>
                            <div><span className="font-semibold text-gray-700 dark:text-gray-300">Full:</span> + Trend awareness, Pattern suppression, Risk gating</div>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 p-1.5 bg-amber-50 dark:bg-amber-900/10 rounded">
                              <span className="text-amber-600 dark:text-amber-400 font-bold">FILTERED</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="bg-amber-500 dark:bg-amber-600 text-white px-2 py-0.5 rounded text-xs font-semibold">SKIP</span>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 bg-green-50 dark:bg-green-900/10 rounded">
                              <span className="text-green-600 dark:text-green-400 font-bold">PASSED</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="text-gray-600 dark:text-gray-400">Continue</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 9 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0">9</div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Is dry run mode enabled?</div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 p-1.5 bg-blue-50 dark:bg-blue-900/10 rounded">
                              <span className="text-blue-600 dark:text-blue-400 font-bold">YES</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="bg-blue-500 dark:bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-semibold">LOG ONLY</span>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 bg-green-50 dark:bg-green-900/10 rounded">
                              <span className="text-green-600 dark:text-green-400 font-bold">NO</span>
                              <span className="text-gray-400">&#8594;</span>
                              <span className="text-gray-600 dark:text-gray-400">Execute</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 10 - Action Box */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-green-600 dark:bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0">10</div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Execute Migrations</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 bg-white dark:bg-gray-800 p-2.5 rounded border border-gray-200 dark:border-gray-700">
                            <div>&#8227; Limit to max migrations per run (default: 3)</div>
                            <div>&#8227; Execute migrations sequentially</div>
                            <div>&#8227; If failure + abort_on_failure: STOP batch</div>
                            <div>&#8227; If failure + pause_on_failure: DISABLE automation</div>
                            <div>&#8227; Track status and update history</div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Flow connector */}
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="text-gray-400 dark:text-gray-500 text-xs">&#9660;</div>
                  </div>

                  {/* End Box */}
                  <div className="flex justify-center">
                    <div className="bg-green-600 dark:bg-green-500 text-white px-6 py-3 rounded-lg font-bold text-sm shadow-md">
                      Run Complete
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
  );
}
