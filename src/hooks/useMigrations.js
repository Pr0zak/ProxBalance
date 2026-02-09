const { useState } = React;

export function useMigrations(API_BASE, deps = {}) {
  const { setData, setError, fetchGuestLocations } = deps;

  const [migrationStatus, setMigrationStatus] = useState({});
  const [activeMigrations, setActiveMigrations] = useState({});
  const [guestsMigrating, setGuestsMigrating] = useState({});
  const [migrationProgress, setMigrationProgress] = useState({});
  const [completedMigrations, setCompletedMigrations] = useState({});
  const [showBatchConfirmation, setShowBatchConfirmation] = useState(false);
  const [pendingBatchMigrations, setPendingBatchMigrations] = useState([]);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [migrationTarget, setMigrationTarget] = useState('');
  const [confirmMigration, setConfirmMigration] = useState(null);
  const [cancelMigrationModal, setCancelMigrationModal] = useState(null);
  const [cancellingMigration, setCancellingMigration] = useState(false);
  const [guestMigrationOptions, setGuestMigrationOptions] = useState(null);
  const [loadingGuestOptions, setLoadingGuestOptions] = useState(false);

  // Tag management state
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagModalGuest, setTagModalGuest] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [tagOperation, setTagOperation] = useState('');
  const [confirmRemoveTag, setConfirmRemoveTag] = useState(null);
  const [confirmHostChange, setConfirmHostChange] = useState(null);

  // Guest list sorting and pagination
  const [guestSortField, setGuestSortField] = useState('tags');
  const [guestSortDirection, setGuestSortDirection] = useState('desc');
  const [guestPageSize, setGuestPageSize] = useState(10);
  const [guestCurrentPage, setGuestCurrentPage] = useState(1);
  const [guestSearchFilter, setGuestSearchFilter] = useState('');

  // Node/guest selection
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedGuestDetails, setSelectedGuestDetails] = useState(null);

  const trackMigration = async (vmid, sourceNode, targetNode, taskId, guestType) => {
    const key = `${vmid}-${targetNode}`;

    setActiveMigrations(prev => ({
      ...prev,
      [key]: { vmid, sourceNode, targetNode, taskId, type: guestType }
    }));

    setGuestsMigrating(prev => ({ ...prev, [vmid]: true }));

    const pollInterval = setInterval(async () => {
      try {
        const migrationStatusResponse = await fetch(`${API_BASE}/guests/${vmid}/migration-status`);
        const migStatus = await migrationStatusResponse.json();

        const taskStatusResponse = await fetch(`${API_BASE}/tasks/${sourceNode}/${taskId}`);
        const taskStatus = await taskStatusResponse.json();

        if (taskStatus.success && taskStatus.progress) {
          setMigrationProgress(prev => ({
            ...prev,
            [vmid]: taskStatus.progress
          }));
        }

        if (migStatus.success) {
          setGuestsMigrating(prev => ({ ...prev, [vmid]: migStatus.is_migrating }));

          if (!migStatus.is_migrating) {
            clearInterval(pollInterval);

            setMigrationProgress(prev => {
              const updated = { ...prev };
              delete updated[vmid];
              return updated;
            });

            const wasCanceled = taskStatus.status === 'stopped' &&
                              (taskStatus.exitstatus === 'unexpected status' ||
                               taskStatus.exitstatus === 'migration aborted');

            if (wasCanceled) {
              setMigrationStatus(prev => ({ ...prev, [key]: 'failed' }));
              setActiveMigrations(prev => {
                const newMigrations = { ...prev };
                delete newMigrations[key];
                return newMigrations;
              });
              setGuestsMigrating(prev => {
                const updated = { ...prev };
                delete updated[vmid];
                return updated;
              });
              return;
            }

            // Migration completed successfully
            const locationResponse = await fetch(`${API_BASE}/guests/${vmid}/location`);
            const locationResult = await locationResponse.json();

            if (locationResult.success) {
              if (setData) {
                setData(prevData => {
                  if (!prevData) return prevData;

                  const guest = prevData.guests[vmid];
                  const oldNode = guest.node;
                  const newNode = locationResult.node;

                  const newData = { ...prevData };
                  newData.guests = {
                    ...prevData.guests,
                    [vmid]: {
                      ...guest,
                      node: newNode,
                      status: locationResult.status
                    }
                  };

                  newData.nodes = { ...prevData.nodes };
                  if (newData.nodes[oldNode]) {
                    newData.nodes[oldNode] = {
                      ...newData.nodes[oldNode],
                      guests: (newData.nodes[oldNode].guests || []).filter(gid => gid !== vmid)
                    };
                  }
                  if (newData.nodes[newNode]) {
                    newData.nodes[newNode] = {
                      ...newData.nodes[newNode],
                      guests: [...(newData.nodes[newNode].guests || []), vmid]
                    };
                  }

                  return newData;
                });
              }

              setCompletedMigrations(prev => ({
                ...prev,
                [vmid]: {
                  targetNode: targetNode,
                  newNode: locationResult.node,
                  timestamp: Date.now()
                }
              }));

              setMigrationStatus(prev => ({ ...prev, [key]: 'success' }));

              setActiveMigrations(prev => {
                const newMigrations = { ...prev };
                delete newMigrations[key];
                return newMigrations;
              });

              setTimeout(() => {
                setMigrationStatus(prev => {
                  const newStatus = { ...prev };
                  delete newStatus[key];
                  return newStatus;
                });
              }, 5000);

              if (fetchGuestLocations) fetchGuestLocations();
            }
          }
        }
      } catch (err) {
        console.error('Error polling migration task:', err);
      }
    }, 3000);

    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  const executeMigration = async (rec) => {
    const key = `${rec.vmid}-${rec.target_node}`;
    setMigrationStatus(prev => ({ ...prev, [key]: 'running' }));

    try {
      const response = await fetch(`${API_BASE}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_node: rec.source_node,
          vmid: rec.vmid,
          target_node: rec.target_node,
          type: rec.type
        })
      });

      const result = await response.json();

      if (result.success) {
        trackMigration(rec.vmid, result.source_node, result.target_node, result.task_id, rec.type);
      } else {
        setMigrationStatus(prev => ({ ...prev, [key]: 'failed' }));
      }
    } catch (err) {
      setMigrationStatus(prev => ({ ...prev, [key]: 'failed' }));
    }
  };

  const cancelMigration = async (vmid, targetNode, data) => {
    const key = `${vmid}-${targetNode}`;
    const migration = activeMigrations[key];

    if (!migration) {
      if (setError) setError('Migration info not found');
      return;
    }

    setCancelMigrationModal({
      name: migration.name || `${migration.type} ${vmid}`,
      vmid: vmid,
      type: migration.type,
      source_node: migration.sourceNode,
      target_node: targetNode,
      task_id: migration.taskId,
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE}/tasks/${migration.sourceNode}/${migration.taskId}/stop`, {
            method: 'POST'
          });

          const result = await response.json();

          if (result.success) {
            setActiveMigrations(prev => {
              const newMigrations = { ...prev };
              delete newMigrations[key];
              return newMigrations;
            });

            setMigrationStatus(prev => ({ ...prev, [key]: 'cancelled' }));

            const locationResponse = await fetch(`${API_BASE}/guests/${vmid}/location`);
            const locationResult = await locationResponse.json();

            if (locationResult.success && data && setData) {
              setData({
                ...data,
                guests: {
                  ...data.guests,
                  [vmid]: {
                    ...data.guests[vmid],
                    node: locationResult.node,
                    status: locationResult.status
                  }
                }
              });
            }

            setTimeout(() => {
              setMigrationStatus(prev => {
                const newStatus = { ...prev };
                delete newStatus[key];
                return newStatus;
              });
            }, 5000);

            setCancelMigrationModal(null);
          } else {
            if (setError) setError(`Failed to cancel migration: ${result.error}`);
          }
        } catch (error) {
          if (setError) setError(`Error cancelling migration: ${error.message}`);
        }
      }
    });
  };

  const confirmAndMigrate = async () => {
    if (!confirmMigration) return;
    const rec = confirmMigration;
    setConfirmMigration(null);
    await executeMigration(rec);
  };

  const fetchGuestMigrationOptions = async (vmid, thresholds = {}, maintenanceNodes = new Set()) => {
    setLoadingGuestOptions(true);
    setGuestMigrationOptions(null);
    try {
      const response = await fetch(`${API_BASE}/guest/${vmid}/migration-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpu_threshold: thresholds.cpu || 50,
          mem_threshold: thresholds.mem || 60,
          maintenance_nodes: Array.from(maintenanceNodes || []),
        })
      });
      const result = await response.json();
      if (result.success) {
        setGuestMigrationOptions(result);
      }
    } catch (err) {
      console.error('Failed to fetch guest migration options:', err);
    } finally {
      setLoadingGuestOptions(false);
    }
  };

  const checkAffinityViolations = (data) => {
    if (!data) return [];
    const violations = [];

    Object.values(data.nodes).forEach(node => {
      const guestsOnNode = node.guests.map(gid => data.guests[gid]);

      guestsOnNode.forEach(guest => {
        if (guest.tags.exclude_groups.length > 0) {
          guest.tags.exclude_groups.forEach(excludeTag => {
            const conflicts = guestsOnNode.filter(other =>
              other.vmid !== guest.vmid &&
              other.tags.all_tags.includes(excludeTag)
            );

            if (conflicts.length > 0) {
              violations.push({
                guest: guest,
                node: node.name,
                excludeTag: excludeTag,
                conflicts: conflicts
              });
            }
          });
        }
      });
    });

    return violations;
  };

  const handleAddTag = async (data) => {
    if (!newTag.trim()) {
      if (setError) setError('Please enter a tag name');
      return;
    }

    if (newTag.includes(';') || newTag.includes(' ')) {
      if (setError) setError('Tag cannot contain spaces or semicolons');
      return;
    }

    try {
      const vmid = tagModalGuest.vmid;

      const response = await fetch(`${API_BASE}/guests/${vmid}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag.trim() })
      });

      const result = await response.json();

      if (result.success) {
        setShowTagModal(false);
        setNewTag('');
        setTagModalGuest(null);

        const refreshResponse = await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
          method: 'POST'
        });
        const refreshResult = await refreshResponse.json();

        if (refreshResult.success && data && setData) {
          setData({
            ...data,
            guests: {
              ...data.guests,
              [vmid]: {
                ...data.guests[vmid],
                tags: refreshResult.tags
              }
            }
          });
        }
      } else {
        if (setError) setError(`Error: ${result.error}`);
      }
    } catch (error) {
      if (setError) setError(`Error adding tag: ${error.message}`);
    }
  };

  const handleRemoveTag = async (guest, tag) => {
    setConfirmRemoveTag({ guest, tag });
  };

  const confirmAndRemoveTag = async (data) => {
    if (!confirmRemoveTag) return;

    const { guest, tag } = confirmRemoveTag;
    setConfirmRemoveTag(null);

    try {
      const vmid = guest.vmid;

      const response = await fetch(`${API_BASE}/guests/${vmid}/tags/${tag}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        const refreshResponse = await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
          method: 'POST'
        });
        const refreshResult = await refreshResponse.json();

        if (refreshResult.success && data && setData) {
          setData({
            ...data,
            guests: {
              ...data.guests,
              [vmid]: {
                ...data.guests[vmid],
                tags: refreshResult.tags
              }
            }
          });
        }
      } else {
        if (setError) setError(`Error: ${result.error}`);
      }
    } catch (error) {
      if (setError) setError(`Error removing tag: ${error.message}`);
    }
  };

  const confirmAndChangeHost = async (fetchConfig) => {
    if (!confirmHostChange) return;

    const newHost = confirmHostChange;
    setConfirmHostChange(null);

    try {
      const response = await fetch(`${API_BASE}/system/change-host`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: newHost })
      });

      const result = await response.json();

      if (result.success) {
        if (fetchConfig) fetchConfig();
        document.getElementById('proxmoxHostInput').value = newHost;
      } else {
        if (setError) setError('Failed to update host: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      if (setError) setError('Error: ' + error.message);
    }
  };

  return {
    migrationStatus, setMigrationStatus,
    activeMigrations,
    guestsMigrating, migrationProgress,
    completedMigrations,
    showBatchConfirmation, setShowBatchConfirmation,
    pendingBatchMigrations, setPendingBatchMigrations,
    showMigrationDialog, setShowMigrationDialog,
    selectedGuest, setSelectedGuest,
    migrationTarget, setMigrationTarget,
    confirmMigration, setConfirmMigration,
    cancelMigrationModal, setCancelMigrationModal,
    cancellingMigration, setCancellingMigration,
    guestMigrationOptions, setGuestMigrationOptions,
    loadingGuestOptions,
    showTagModal, setShowTagModal,
    tagModalGuest, setTagModalGuest,
    newTag, setNewTag,
    tagOperation, setTagOperation,
    confirmRemoveTag, setConfirmRemoveTag,
    confirmHostChange, setConfirmHostChange,
    guestSortField, setGuestSortField,
    guestSortDirection, setGuestSortDirection,
    guestPageSize, setGuestPageSize,
    guestCurrentPage, setGuestCurrentPage,
    guestSearchFilter, setGuestSearchFilter,
    selectedNode, setSelectedNode,
    selectedGuestDetails, setSelectedGuestDetails,
    trackMigration,
    executeMigration,
    cancelMigration,
    confirmAndMigrate,
    fetchGuestMigrationOptions,
    checkAffinityViolations,
    handleAddTag,
    handleRemoveTag,
    confirmAndRemoveTag,
    confirmAndChangeHost
  };
}
