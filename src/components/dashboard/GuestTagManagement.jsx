import {
  Tag, ChevronDown, HardDrive, Shield, CheckCircle, X, Plus,
  Play, Power, Loader
} from '../Icons.jsx';
import Pagination from '../Pagination.jsx';
import { GLASS_CARD, GLASS_CARD_SUBTLE, INNER_CARD, iconBadge, BTN_PRIMARY, BTN_SECONDARY, BTN_ICON, ICON, INPUT_FIELD, SELECT_FIELD, TABLE_HEADER, TABLE_ROW, TABLE_ROW_STRIPED } from '../../utils/designTokens.js';

export default function GuestTagManagement({
  data,
  collapsedSections,
  toggleSection,
  guestSearchFilter,
  setGuestSearchFilter,
  guestCurrentPage,
  setGuestCurrentPage,
  guestPageSize,
  setGuestPageSize,
  guestSortField,
  setGuestSortField,
  guestSortDirection,
  setGuestSortDirection,
  canMigrate,
  setTagModalGuest,
  setShowTagModal,
  handleRemoveTag,
  ignoredGuests,
  excludeGuests,
  affinityGuests,
  autoMigrateOkGuests,
  guestProfiles
}) {
  if (!data) return null;

  const filteredGuestsCount = guestSearchFilter
    ? Object.values(data.guests).filter(guest => {
        const searchLower = guestSearchFilter.toLowerCase();
        return guest.vmid.toString().includes(searchLower) ||
          (guest.name || '').toLowerCase().includes(searchLower) ||
          guest.node.toLowerCase().includes(searchLower) ||
          guest.type.toLowerCase().includes(searchLower) ||
          guest.status.toLowerCase().includes(searchLower);
      }).length
    : Object.keys(data.guests).length;

  return (
          <div className={`${GLASS_CARD_SUBTLE} overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className={iconBadge('purple')}>
                  <Tag size={ICON.action} className="text-white sm:hidden" />
                  <Tag size={ICON.section} className="text-white hidden sm:block" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white">Guest Tag Management</h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 hidden sm:block">Manage ignore tags and affinity rules for all guests</p>
                </div>
              </div>
              <button
                onClick={() => toggleSection('taggedGuests')}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 shrink-0"
                title={collapsedSections.taggedGuests ? "Expand section" : "Collapse section"}
              >
                <ChevronDown size={ICON.section} className={`text-gray-600 dark:text-gray-400 transition-transform duration-200 ${!collapsedSections.taggedGuests ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {collapsedSections.taggedGuests ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded">
                  <HardDrive size={16} className="text-gray-600 dark:text-gray-400 shrink-0 sm:hidden" />
                  <HardDrive size={18} className="text-gray-600 dark:text-gray-400 shrink-0 hidden sm:block" />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">Total</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{Object.keys(data.guests).length}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${ignoredGuests.length > 0 ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60'}`}>
                  <Shield size={16} className={`shrink-0 sm:hidden ${ignoredGuests.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <Shield size={18} className={`shrink-0 hidden sm:block ${ignoredGuests.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">Ignored</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{ignoredGuests.length}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${autoMigrateOkGuests.length > 0 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60'}`}>
                  <CheckCircle size={16} className={`shrink-0 sm:hidden ${autoMigrateOkGuests.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <CheckCircle size={18} className={`shrink-0 hidden sm:block ${autoMigrateOkGuests.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">Auto-Migrate</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{autoMigrateOkGuests.length}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${excludeGuests.length > 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60'}`}>
                  <Shield size={16} className={`shrink-0 sm:hidden ${excludeGuests.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <Shield size={18} className={`shrink-0 hidden sm:block ${excludeGuests.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">Anti-Affinity</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{excludeGuests.length}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${affinityGuests.length > 0 ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60'}`}>
                  <Shield size={16} className={`shrink-0 sm:hidden ${affinityGuests.length > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <Shield size={18} className={`shrink-0 hidden sm:block ${affinityGuests.length > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">Affinity</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{affinityGuests.length}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Search and controls */}
                <div className="mb-4 flex flex-wrap gap-2 sm:gap-3 items-center justify-between">
                  <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Search guests by ID, name, node..."
                      value={guestSearchFilter}
                      onChange={(e) => {
                        setGuestSearchFilter(e.target.value);
                        setGuestCurrentPage(1);
                      }}
                      className={INPUT_FIELD}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Per page:</span>
                    <select
                      value={guestPageSize}
                      onChange={(e) => {
                        setGuestPageSize(Number(e.target.value));
                        setGuestCurrentPage(1);
                      }}
                      className={SELECT_FIELD}
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th
                          onClick={() => {
                            if (guestSortField === 'type') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('type');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className={`${TABLE_HEADER} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50`}
                        >
                          <div className="flex items-center gap-1">
                            Type
                            {guestSortField === 'type' && (
                              <span className="text-blue-500 dark:text-blue-400 font-bold">{guestSortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => {
                            if (guestSortField === 'vmid') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('vmid');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className={`hidden sm:table-cell ${TABLE_HEADER} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50`}
                        >
                          <div className="flex items-center gap-1">
                            ID
                            {guestSortField === 'vmid' && (
                              <span className="text-blue-500 dark:text-blue-400 font-bold">{guestSortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => {
                            if (guestSortField === 'name') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('name');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className={`${TABLE_HEADER} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50`}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            {guestSortField === 'name' && (
                              <span className="text-blue-500 dark:text-blue-400 font-bold">{guestSortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => {
                            if (guestSortField === 'node') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('node');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className={`${TABLE_HEADER} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50`}
                        >
                          <div className="flex items-center gap-1">
                            Node
                            {guestSortField === 'node' && (
                              <span className="text-blue-500 dark:text-blue-400 font-bold">{guestSortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => {
                            if (guestSortField === 'status') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('status');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className={`${TABLE_HEADER} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50`}
                        >
                          <div className="flex items-center gap-1">
                            Status
                            {guestSortField === 'status' && (
                              <span className="text-blue-500 dark:text-blue-400 font-bold">{guestSortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => {
                            if (guestSortField === 'tags') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('tags');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className={`hidden sm:table-cell ${TABLE_HEADER} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50`}
                        >
                          <div className="flex items-center gap-1">
                            Tags
                            {guestSortField === 'tags' && (
                              <span className="text-blue-500 dark:text-blue-400 font-bold">{guestSortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                            )}
                          </div>
                        </th>
                        {canMigrate && <th className={`hidden sm:table-cell ${TABLE_HEADER}`}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Filter guests
                        let filteredGuests = Object.values(data.guests);
                        if (guestSearchFilter) {
                          const searchLower = guestSearchFilter.toLowerCase();
                          filteredGuests = filteredGuests.filter(guest =>
                            guest.vmid.toString().includes(searchLower) ||
                            (guest.name || '').toLowerCase().includes(searchLower) ||
                            guest.node.toLowerCase().includes(searchLower) ||
                            guest.type.toLowerCase().includes(searchLower) ||
                            guest.status.toLowerCase().includes(searchLower)
                          );
                        }

                        // Sort guests
                        filteredGuests.sort((a, b) => {
                          let aVal, bVal;
                          switch (guestSortField) {
                            case 'vmid':
                              aVal = a.vmid;
                              bVal = b.vmid;
                              break;
                            case 'name':
                              aVal = (a.name || '').toLowerCase();
                              bVal = (b.name || '').toLowerCase();
                              break;
                            case 'node':
                              aVal = a.node.toLowerCase();
                              bVal = b.node.toLowerCase();
                              break;
                            case 'type':
                              aVal = a.type.toLowerCase();
                              bVal = b.type.toLowerCase();
                              break;
                            case 'status':
                              aVal = a.status.toLowerCase();
                              bVal = b.status.toLowerCase();
                              break;
                            case 'tags':
                              // Sort by tag count (has_ignore + exclude_groups count)
                              // Then by first tag alphabetically
                              const aTagCount = (a.tags.has_ignore ? 1 : 0) + a.tags.exclude_groups.length;
                              const bTagCount = (b.tags.has_ignore ? 1 : 0) + b.tags.exclude_groups.length;
                              if (aTagCount !== bTagCount) {
                                aVal = aTagCount;
                                bVal = bTagCount;
                              } else {
                                // Same tag count, sort by tag name
                                const aFirstTag = a.tags.has_ignore ? 'ignore' : (a.tags.exclude_groups[0] || '');
                                const bFirstTag = b.tags.has_ignore ? 'ignore' : (b.tags.exclude_groups[0] || '');
                                aVal = aFirstTag.toLowerCase();
                                bVal = bFirstTag.toLowerCase();
                              }
                              break;
                            default:
                              aVal = a.vmid;
                              bVal = b.vmid;
                          }

                          if (guestSortDirection === 'asc') {
                            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                          } else {
                            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                          }
                        });

                        // Pagination
                        const totalGuests = filteredGuests.length;
                        const totalPages = Math.ceil(totalGuests / guestPageSize);
                        const startIndex = (guestCurrentPage - 1) * guestPageSize;
                        const endIndex = startIndex + guestPageSize;
                        const paginatedGuests = filteredGuests.slice(startIndex, endIndex);

                        return (
                          <>
                            {paginatedGuests.map(guest => {
                      const guestHasTags = guest.tags.has_ignore || guest.tags.all_tags?.includes('auto_migrate_ok') || guest.tags.exclude_groups?.length > 0 || guest.tags.affinity_groups?.length > 0;
                      return (
                      <tr
                        key={guest.vmid}
                        className={`${TABLE_ROW} ${TABLE_ROW_STRIPED} ${canMigrate ? 'sm:cursor-default cursor-pointer' : ''}`}
                        onClick={() => {
                          if (canMigrate && window.innerWidth < 640) {
                            setTagModalGuest(guest);
                            setShowTagModal(true);
                          }
                        }}
                      >
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded font-medium ${
                            guest.type === 'VM' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                            'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          }`}>
                            {guest.type}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell p-3 text-sm font-mono text-gray-900 dark:text-white">{guest.vmid}</td>
                        <td className="p-3">
                          <div className="text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                            {guest.name}
                            {(() => {
                              const profile = guestProfiles?.[String(guest.vmid)];
                              if (!profile || profile.confidence === 'low') return null;
                              const colors = {
                                steady: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                                bursty: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                                growing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                                cyclical: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
                              };
                              const cls = colors[profile.behavior];
                              if (!cls) return null;
                              return (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${cls}`} title={`${profile.behavior} workload (${profile.confidence} confidence, ${profile.data_points} data points)`}>
                                  {profile.behavior.charAt(0).toUpperCase() + profile.behavior.slice(1)}
                                </span>
                              );
                            })()}
                          </div>
                          {/* Mobile: show tag badges below name */}
                          {guestHasTags && (
                            <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                              {guest.tags.has_ignore && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded font-medium">
                                  ignore
                                </span>
                              )}
                              {guest.tags.all_tags?.includes('auto_migrate_ok') && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded font-medium">
                                  auto_migrate
                                </span>
                              )}
                              {guest.tags.exclude_groups?.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded font-medium">
                                  {tag}
                                </span>
                              ))}
                              {guest.tags.affinity_groups?.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{guest.node}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-medium ${
                              guest.status === 'migrating' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                              guest.status === 'running' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            }`} title={guest.status.charAt(0).toUpperCase() + guest.status.slice(1)}>
                              {guest.status === 'migrating' ? (
                                <Loader size={12} className="animate-spin" />
                              ) : guest.status === 'running' ? (
                                <Play size={12} />
                              ) : (
                                <Power size={12} />
                              )}
                              <span className="hidden sm:inline">{guest.status}</span>
                            </span>
                            {/* Mobile: tag manage button */}
                            {canMigrate && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTagModalGuest(guest);
                                  setShowTagModal(true);
                                }}
                                className="sm:hidden p-2 text-purple-500 hover:text-purple-400 hover:bg-purple-900/30 rounded transition-colors"
                                title="Manage tags"
                                aria-label="Manage tags"
                              >
                                <Tag size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell p-3">
                          <div className="flex flex-wrap gap-1">
                            {guest.tags.has_ignore && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded font-medium">
                                ignore
                                {canMigrate && (
                                  <button
                                    onClick={() => handleRemoveTag(guest, 'ignore')}
                                    className="hover:bg-yellow-300 dark:hover:bg-yellow-700 rounded-full p-0.5"
                                    title="Remove ignore tag"
                                    aria-label="Remove tag"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </span>
                            )}
                            {guest.tags.all_tags?.includes('auto_migrate_ok') && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded font-medium">
                                auto_migrate_ok
                                {canMigrate && (
                                  <button
                                    onClick={() => handleRemoveTag(guest, 'auto_migrate_ok')}
                                    className="hover:bg-green-300 dark:hover:bg-green-700 rounded-full p-0.5"
                                    title="Remove auto_migrate_ok tag"
                                    aria-label="Remove tag"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </span>
                            )}
                            {guest.tags.exclude_groups.map(tag => (
                              <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded font-medium">
                                {tag}
                                {canMigrate && (
                                  <button
                                    onClick={() => handleRemoveTag(guest, tag)}
                                    className="hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                                    title={`Remove tag "${tag}"`}
                                    aria-label="Remove tag"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        {canMigrate && (
                          <td className="hidden sm:table-cell p-3">
                            <button
                              onClick={() => {
                                setTagModalGuest(guest);
                                setShowTagModal(true);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                              title="Add tag"
                            >
                              <Plus size={12} />
                              Add
                            </button>
                          </td>
                        )}
                      </tr>
                      );
                    })}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={guestCurrentPage}
                  totalPages={Math.ceil(filteredGuestsCount / guestPageSize)}
                  totalItems={filteredGuestsCount}
                  pageSize={guestPageSize}
                  onPageChange={setGuestCurrentPage}
                />
              </div>
            )}
          </div>
  );
}
