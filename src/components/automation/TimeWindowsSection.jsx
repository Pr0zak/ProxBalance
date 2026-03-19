import {
  Calendar, Check, ChevronDown, Edit, Info, Moon, Plus, Save, Trash, X
} from '../Icons.jsx';

const { useState } = React;

function WindowTypeButtons({ currentType, onSelect }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onSelect('migration')}
        className={`px-3 py-2 rounded text-sm font-semibold flex items-center gap-1 ${
          currentType === 'migration'
            ? 'bg-green-600 text-white'
            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
        }`}
      >
        <Calendar size={14} />
        <span className="hidden sm:inline">Migration</span> Window
      </button>
      <button
        onClick={() => onSelect('blackout')}
        className={`px-3 py-2 rounded text-sm font-semibold flex items-center gap-1 ${
          currentType === 'blackout'
            ? 'bg-red-600 text-white'
            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
        }`}
      >
        <Moon size={14} />
        <span className="hidden sm:inline">Blackout</span> Window
      </button>
    </div>
  );
}

export default function TimeWindowsSection({ automationConfig, saveAutomationConfig, collapsedSections, setCollapsedSections, setError }) {
  const [editingWindowIndex, setEditingWindowIndex] = useState(null);
  const [showTimeWindowForm, setShowTimeWindowForm] = useState(false);
  const [newWindowData, setNewWindowData] = useState({ name: '', type: 'migration', days: [], start_time: '00:00', end_time: '00:00' });
  const [confirmRemoveWindow, setConfirmRemoveWindow] = useState(null);

  return (<>
        {/* Time Windows (Unified) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Time Windows</h2>

          {/* Timezone Selector */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Timezone for Time Windows
                </label>
                <select
                  value={automationConfig.schedule?.timezone || 'UTC'}
                  onChange={(e) => saveAutomationConfig({
                    schedule: {
                      ...automationConfig.schedule,
                      timezone: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="UTC">UTC (Server Time)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Anchorage">Alaska Time (AK)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                  <option value="Europe/London">London (GMT/BST)</option>
                  <option value="Europe/Paris">Paris (CET/CEST)</option>
                  <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                  <option value="Europe/Moscow">Moscow (MSK)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Asia/Shanghai">China (CST)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Singapore">Singapore (SGT)</option>
                  <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                  <option value="Pacific/Auckland">Auckland (NZDT/NZST)</option>
                </select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  All time windows below use this timezone. Current server time (UTC): {new Date().toUTCString()}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure when migrations are allowed (Migration Windows) or blocked (Blackout Windows).
            If no windows are configured, migrations are allowed at any time.
          </p>

          {/* Weekly Visual Timeline */}
          {(() => {
            const migrationWindows = automationConfig.schedule?.migration_windows || [];
            const blackoutWindows = automationConfig.schedule?.blackout_windows || [];
            const hasWindows = migrationWindows.length > 0 || blackoutWindows.length > 0;

            if (!hasWindows) return null;

            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

            return (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Weekly Schedule Overview
                </div>

                {/* Week Grid */}
                <div className="space-y-3 mt-4">
                  {daysOfWeek.map((day) => {
                    const dayMigrations = migrationWindows.filter(w => w.days?.includes(day));
                    const dayBlackouts = blackoutWindows.filter(w => w.days?.includes(day));
                    const isToday = day === today;

                    return (
                      <div key={day} className="flex gap-2">
                        {/* Day Label */}
                        <div className={`w-20 flex-shrink-0 text-xs font-medium flex items-center ${
                          isToday
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {day.slice(0, 3)}
                          {isToday && <span className="ml-1 text-blue-600 dark:text-blue-400">●</span>}
                        </div>

                        {/* Timeline Bar */}
                        <div className="flex-1 relative h-6 bg-gray-200 dark:bg-gray-600 rounded overflow-visible">
                          {/* Hour tick marks - every hour */}
                          {Array.from({ length: 25 }, (_, hour) => {
                            const isMajorTick = hour % 6 === 0;
                            const isMinorTick = hour % 3 === 0 && !isMajorTick;

                            return (
                              <div
                                key={`tick-${hour}`}
                                className={`absolute bottom-0 z-0 ${
                                  isMajorTick
                                    ? 'h-full border-l-2 border-gray-400 dark:border-gray-500'
                                    : isMinorTick
                                    ? 'h-2/3 border-l border-gray-350 dark:border-gray-500'
                                    : 'h-1/3 border-l border-gray-300 dark:border-gray-550'
                                }`}
                                style={{ left: `${(hour / 24) * 100}%` }}
                              >
                                {isMajorTick && hour < 24 && (
                                  <div className="absolute -top-3 -translate-x-1/2 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                    {hour.toString().padStart(2, '0')}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Render blackout windows */}
                          {dayBlackouts.map((window, idx) => {
                            const [startHour, startMin] = window.start_time.split(':').map(Number);
                            const [endHour, endMin] = window.end_time.split(':').map(Number);
                            const startPercent = ((startHour * 60 + startMin) / 1440) * 100;
                            const endPercent = ((endHour * 60 + endMin) / 1440) * 100;
                            const width = endPercent - startPercent;

                            // Find the global index for this blackout window
                            const blackoutIndex = blackoutWindows.findIndex(w =>
                              w.name === window.name &&
                              w.start_time === window.start_time &&
                              w.end_time === window.end_time
                            );
                            const globalIndex = migrationWindows.length + blackoutIndex;

                            return (
                              <div
                                key={`blackout-${idx}`}
                                className="absolute top-0 bottom-0 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 transition-colors z-10 cursor-pointer"
                                style={{ left: `${startPercent}%`, width: `${width}%` }}
                                title={`${window.name}: ${window.start_time}-${window.end_time} (BLOCKED) - Click to edit`}
                                onClick={() => {
                                  setEditingWindowIndex(globalIndex);
                                  // Scroll to the window list
                                  setTimeout(() => {
                                    const element = document.querySelector(`[data-window-index="${globalIndex}"]`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                  }, 100);
                                }}
                              />
                            );
                          })}

                          {/* Render migration windows */}
                          {dayMigrations.map((window, idx) => {
                            const [startHour, startMin] = window.start_time.split(':').map(Number);
                            const [endHour, endMin] = window.end_time.split(':').map(Number);
                            const startPercent = ((startHour * 60 + startMin) / 1440) * 100;
                            const endPercent = ((endHour * 60 + endMin) / 1440) * 100;
                            const width = endPercent - startPercent;

                            // Find the global index for this migration window
                            const migrationIndex = migrationWindows.findIndex(w =>
                              w.name === window.name &&
                              w.start_time === window.start_time &&
                              w.end_time === window.end_time
                            );

                            return (
                              <div
                                key={`migration-${idx}`}
                                className="absolute top-0 bottom-0 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 transition-colors z-10 cursor-pointer"
                                style={{ left: `${startPercent}%`, width: `${width}%` }}
                                title={`${window.name}: ${window.start_time}-${window.end_time} (ALLOWED) - Click to edit`}
                                onClick={() => {
                                  setEditingWindowIndex(migrationIndex);
                                  // Scroll to the window list
                                  setTimeout(() => {
                                    const element = document.querySelector(`[data-window-index="${migrationIndex}"]`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                  }, 100);
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 dark:bg-green-600 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Migrations Allowed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 dark:bg-red-600 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Migrations Blocked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">No Restriction</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Combined Windows List */}
          {(() => {
            const migrationWindows = automationConfig.schedule?.migration_windows || [];
            const blackoutWindows = automationConfig.schedule?.blackout_windows || [];

            // Combine both arrays with type information
            const allWindows = [
              ...migrationWindows.map((w, idx) => ({ ...w, type: 'migration', originalIndex: idx })),
              ...blackoutWindows.map((w, idx) => ({ ...w, type: 'blackout', originalIndex: idx }))
            ];

            if (allWindows.length === 0) {
              return (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 mb-3">
                  No time windows configured - migrations allowed at any time
                </div>
              );
            }

            return (
              <div className="space-y-2 mb-3">
                {allWindows.map((window, idx) => {
                  const isMigration = window.type === 'migration';
                  const isEditing = editingWindowIndex === idx;

                  return (
                    <div
                      key={`${window.type}-${window.originalIndex}`}
                      data-window-index={idx}
                      className={`p-3 rounded-lg border ${
                        isMigration
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-700'
                          : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          {/* Type Toggle */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Window Type</label>
                            <WindowTypeButtons
                              currentType={isMigration ? 'migration' : 'blackout'}
                              onSelect={(type) => {
                                if ((type === 'migration') === isMigration) return;
                                const newMigrationWindows = [...migrationWindows];
                                const newBlackoutWindows = [...blackoutWindows];
                                if (isMigration) {
                                  const [removed] = newMigrationWindows.splice(window.originalIndex, 1);
                                  newBlackoutWindows.push(removed);
                                } else {
                                  const [removed] = newBlackoutWindows.splice(window.originalIndex, 1);
                                  newMigrationWindows.push(removed);
                                }
                                saveAutomationConfig({
                                  schedule: {
                                    ...automationConfig.schedule,
                                    migration_windows: newMigrationWindows,
                                    blackout_windows: newBlackoutWindows
                                  }
                                });
                                setEditingWindowIndex(null);
                              }}
                            />
                          </div>

                          {/* Window Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Window Name</label>
                            <input
                              type="text"
                              value={window.name}
                              onChange={(e) => {
                                const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                const newWindows = [...targetArray];
                                newWindows[window.originalIndex] = { ...window, name: e.target.value };

                                saveAutomationConfig({
                                  schedule: {
                                    ...automationConfig.schedule,
                                    [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                  }
                                });
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                            />
                          </div>

                          {/* Days of Week */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Days of Week</label>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={window.days?.length === 7}
                                  onChange={(e) => {
                                    const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                    const newWindows = [...targetArray];
                                    newWindows[window.originalIndex] = {
                                      ...window,
                                      days: e.target.checked
                                        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                                        : []
                                    };

                                    saveAutomationConfig({
                                      schedule: {
                                        ...automationConfig.schedule,
                                        [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                      }
                                    });
                                  }}
                                  className={`w-4 h-4 border-gray-300 rounded ${
                                    isMigration ? 'text-green-600 focus:ring-green-500' : 'text-red-600 focus:ring-red-500'
                                  }`}
                                />
                                <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400">All Days</span>
                              </label>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                <label key={day} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={window.days?.includes(day)}
                                    onChange={(e) => {
                                      const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                      const newWindows = [...targetArray];
                                      const currentDays = window.days || [];
                                      newWindows[window.originalIndex] = {
                                        ...window,
                                        days: e.target.checked
                                          ? [...currentDays, day]
                                          : currentDays.filter(d => d !== day)
                                      };

                                      saveAutomationConfig({
                                        schedule: {
                                          ...automationConfig.schedule,
                                          [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                        }
                                      });
                                    }}
                                    className={`w-4 h-4 border-gray-300 rounded ${
                                      isMigration ? 'text-green-600 focus:ring-green-500' : 'text-red-600 focus:ring-red-500'
                                    }`}
                                  />
                                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{day.slice(0, 3)}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Start/End Time */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                              <div className="flex gap-2">
                                <select
                                  value={window.start_time?.split(':')[0] || '00'}
                                  onChange={(e) => {
                                    const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                    const newWindows = [...targetArray];
                                    const currentMinute = window.start_time?.split(':')[1] || '00';
                                    newWindows[window.originalIndex] = { ...window, start_time: `${e.target.value}:${currentMinute}` };
                                    saveAutomationConfig({
                                      schedule: {
                                        ...automationConfig.schedule,
                                        [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                      }
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i.toString().padStart(2, '0')}>
                                      {i.toString().padStart(2, '0')}
                                    </option>
                                  ))}
                                </select>
                                <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                                <select
                                  value={window.start_time?.split(':')[1] || '00'}
                                  onChange={(e) => {
                                    const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                    const newWindows = [...targetArray];
                                    const currentHour = window.start_time?.split(':')[0] || '00';
                                    newWindows[window.originalIndex] = { ...window, start_time: `${currentHour}:${e.target.value}` };
                                    saveAutomationConfig({
                                      schedule: {
                                        ...automationConfig.schedule,
                                        [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                      }
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                >
                                  {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                                    <option key={minute} value={minute.toString().padStart(2, '0')}>
                                      {minute.toString().padStart(2, '0')}
                                    </option>
                                  ))}
                                  <option value="59">59 (End of Hour)</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                              <div className="flex gap-2">
                                <select
                                  value={window.end_time?.split(':')[0] || '00'}
                                  onChange={(e) => {
                                    const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                    const newWindows = [...targetArray];
                                    const currentMinute = window.end_time?.split(':')[1] || '00';
                                    newWindows[window.originalIndex] = { ...window, end_time: `${e.target.value}:${currentMinute}` };
                                    saveAutomationConfig({
                                      schedule: {
                                        ...automationConfig.schedule,
                                        [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                      }
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i.toString().padStart(2, '0')}>
                                      {i.toString().padStart(2, '0')}
                                    </option>
                                  ))}
                                </select>
                                <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                                <select
                                  value={window.end_time?.split(':')[1] || '00'}
                                  onChange={(e) => {
                                    const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                    const newWindows = [...targetArray];
                                    const currentHour = window.end_time?.split(':')[0] || '00';
                                    newWindows[window.originalIndex] = { ...window, end_time: `${currentHour}:${e.target.value}` };
                                    saveAutomationConfig({
                                      schedule: {
                                        ...automationConfig.schedule,
                                        [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                      }
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                >
                                  {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                                    <option key={minute} value={minute.toString().padStart(2, '0')}>
                                      {minute.toString().padStart(2, '0')}
                                    </option>
                                  ))}
                                  <option value="59">59 (End of Hour)</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Done Button */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingWindowIndex(null)}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold flex items-center justify-center gap-1.5"
                              title="Done"
                            >
                              <Check size={14} />
                              <span className="hidden sm:inline">Done</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* Type Badge */}
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            isMigration
                              ? 'bg-green-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}>
                            {isMigration ? 'MIGRATION' : 'BLACKOUT'}
                          </span>

                          {/* Window Info */}
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {window.name || `${isMigration ? 'Migration' : 'Blackout'} ${window.originalIndex + 1}`}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                              {window.days?.join(', ')} {window.start_time}-{window.end_time}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <button
                            onClick={() => setEditingWindowIndex(idx)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center justify-center gap-1"
                            title="Edit"
                          >
                            <Edit size={14} />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              const windowId = `${isMigration ? 'migration' : 'blackout'}-${window.originalIndex}`;

                              // Two-click pattern: first click sets confirm state, second click executes
                              if (confirmRemoveWindow?.id === windowId) {
                                // Second click - execute the removal
                                const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                const newWindows = [...targetArray];
                                newWindows.splice(window.originalIndex, 1);

                                saveAutomationConfig({
                                  schedule: {
                                    ...automationConfig.schedule,
                                    [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                  }
                                });
                                setConfirmRemoveWindow(null);
                              } else {
                                // First click - set confirm state
                                setConfirmRemoveWindow({ id: windowId, type: isMigration ? 'migration' : 'blackout' });
                              }
                            }}
                            className={`px-2 py-1 text-white rounded text-sm flex items-center justify-center gap-1 ${
                              confirmRemoveWindow?.id === `${isMigration ? 'migration' : 'blackout'}-${window.originalIndex}`
                                ? 'bg-orange-600 hover:bg-orange-700'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                            title="Remove"
                          >
                            <Trash size={14} />
                            {confirmRemoveWindow?.id === `${isMigration ? 'migration' : 'blackout'}-${window.originalIndex}` ? 'Confirm?' : <span className="hidden sm:inline">Remove</span>}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Add Window Form */}
          {showTimeWindowForm ? (
            <div className={`rounded-lg p-4 mb-3 border ${
              newWindowData.type === 'migration'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
            }`}>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Add Time Window</h4>
              <div className="space-y-3">
                {/* Type Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Window Type</label>
                  <WindowTypeButtons
                    currentType={newWindowData.type}
                    onSelect={(type) => setNewWindowData({ ...newWindowData, type })}
                  />
                </div>

                {/* Window Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Window Name
                  </label>
                  <input
                    type="text"
                    value={newWindowData.name}
                    onChange={(e) => setNewWindowData({ ...newWindowData, name: e.target.value })}
                    placeholder={newWindowData.type === 'migration' ? 'e.g., Weekend Maintenance' : 'e.g., Business Hours'}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>

                {/* Days of Week */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Days of Week
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newWindowData.days.length === 7}
                        onChange={(e) => {
                          setNewWindowData({
                            ...newWindowData,
                            days: e.target.checked
                              ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                              : []
                          });
                        }}
                        className={`w-4 h-4 border-gray-300 rounded ${
                          newWindowData.type === 'migration'
                            ? 'text-green-600 focus:ring-green-500'
                            : 'text-red-600 focus:ring-red-500'
                        }`}
                      />
                      <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400">All Days</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <label key={day} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newWindowData.days.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWindowData({ ...newWindowData, days: [...newWindowData.days, day] });
                            } else {
                              setNewWindowData({ ...newWindowData, days: newWindowData.days.filter(d => d !== day) });
                            }
                          }}
                          className={`w-4 h-4 border-gray-300 rounded ${
                            newWindowData.type === 'migration'
                              ? 'text-green-600 focus:ring-green-500'
                              : 'text-red-600 focus:ring-red-500'
                          }`}
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{day.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Start/End Time */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Time Range
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNewWindowData({ ...newWindowData, start_time: '00:00', end_time: '23:59' })}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
                      >
                        All Day
                      </button>
                      <button
                        onClick={() => setNewWindowData({ ...newWindowData, start_time: '09:00', end_time: '17:00' })}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
                      >
                        Business Hours
                      </button>
                      <button
                        onClick={() => setNewWindowData({ ...newWindowData, start_time: '22:00', end_time: '06:00' })}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
                      >
                        Night
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Time
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={newWindowData.start_time?.split(':')[0] || '00'}
                          onChange={(e) => {
                            const currentMinute = newWindowData.start_time?.split(':')[1] || '00';
                            setNewWindowData({ ...newWindowData, start_time: `${e.target.value}:${currentMinute}` });
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                        <select
                          value={newWindowData.start_time?.split(':')[1] || '00'}
                          onChange={(e) => {
                            const currentHour = newWindowData.start_time?.split(':')[0] || '00';
                            setNewWindowData({ ...newWindowData, start_time: `${currentHour}:${e.target.value}` });
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        >
                          {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                            <option key={minute} value={minute.toString().padStart(2, '0')}>
                              {minute.toString().padStart(2, '0')}
                            </option>
                          ))}
                          <option value="59">59 (End of Hour)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        End Time
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={newWindowData.end_time?.split(':')[0] || '00'}
                          onChange={(e) => {
                            const currentMinute = newWindowData.end_time?.split(':')[1] || '00';
                            setNewWindowData({ ...newWindowData, end_time: `${e.target.value}:${currentMinute}` });
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                        <select
                          value={newWindowData.end_time?.split(':')[1] || '00'}
                          onChange={(e) => {
                            const currentHour = newWindowData.end_time?.split(':')[0] || '00';
                            setNewWindowData({ ...newWindowData, end_time: `${currentHour}:${e.target.value}` });
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        >
                          {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                            <option key={minute} value={minute.toString().padStart(2, '0')}>
                              {minute.toString().padStart(2, '0')}
                            </option>
                          ))}
                          <option value="59">59 (End of Hour)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save/Cancel Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (newWindowData.name && newWindowData.days.length > 0 && newWindowData.start_time && newWindowData.end_time) {
                        const isMigration = newWindowData.type === 'migration';
                        const targetArray = isMigration
                          ? (automationConfig.schedule?.migration_windows || [])
                          : (automationConfig.schedule?.blackout_windows || []);

                        const { type, ...windowData } = newWindowData;

                        saveAutomationConfig({
                          schedule: {
                            ...automationConfig.schedule,
                            [isMigration ? 'migration_windows' : 'blackout_windows']: [...targetArray, windowData]
                          }
                        });

                        setNewWindowData({ name: '', type: 'migration', days: [], start_time: '00:00', end_time: '00:00' });
                        setShowTimeWindowForm(false);
                      } else {
                        setError('Please fill in all fields');
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5 ${
                      newWindowData.type === 'migration'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    <Save size={14} />
                    Save Window
                  </button>
                  <button
                    onClick={() => {
                      setNewWindowData({ name: '', type: 'migration', days: [], start_time: '00:00', end_time: '00:00' });
                      setShowTimeWindowForm(false);
                    }}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowTimeWindowForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              Add Time Window
            </button>
          )}
        </div>

  </>);
}
