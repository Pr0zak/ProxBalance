import { MIGRATION_POLL_INTERVAL } from '../utils/constants.js';
import { notify } from '../components/Toast.jsx';

// Give up following a migration task after this many consecutive failed
// status checks, or after this long in total; the outcome is then unknown.
const MAX_POLL_ERRORS = 5;
const MAX_TRACK_MS = 30 * 60 * 1000;

const { useState, useRef } = React;

export function useMigrations(API_BASE, deps = {}) {
  const { setData, setError, fetchGuestLocations } = deps;

  // Run Plan execution state — lives here (root hook) so it survives the modal
  // closing and page navigation; the modal is just a view onto planRun.
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planCtx, setPlanCtx] = useState(null);   // {plan, recommendations, maxConcurrent, outsideWindow} for the confirm phase
  const [planRun, setPlanRun] = useState(null);    // active run: {phase, groups, recByVmid, stepStatus, haltMessage, halted, maxConcurrent}
  const planHaltedRef = useRef(false);

  const [migrationStatus, setMigrationStatus] = useState({});
  const [activeMigrations, setActiveMigrations] = useState({});
  const [guestsMigrating, setGuestsMigrating] = useState({});
  const [migrationProgress, setMigrationProgress] = useState({});
  const [completedMigrations, setCompletedMigrations] = useState({});
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

  // Node/guest selection
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedGuestDetails, setSelectedGuestDetails] = useState(null);

  // Keys (`${vmid}-${target}`) whose task the user stopped from the UI, so the
  // tracker reports them as cancelled rather than failed.
  const cancelledKeysRef = useRef(new Set());

  const dropKey = (setter, k) => setter(prev => {
    if (!(k in prev)) return prev;
    const next = { ...prev };
    delete next[k];
    return next;
  });

  // Follow one Proxmox migration task until it ends. Success is counted only
  // when the task stops with exitstatus 'OK'; any other exit text is a failure
  // carrying that text. Polling gives up after MAX_POLL_ERRORS consecutive
  // errors or MAX_TRACK_MS in total and reports the outcome as unknown.
  //
  // Returns a Promise resolving to {vmid, status, error?, newNode?} with
  // status 'success' | 'failed' | 'cancelled'. Fire-and-forget callers ignore
  // it; the plan orchestrator awaits it to decide whether to continue.
  const trackMigration = (vmid, sourceNode, targetNode, taskId, guestType) => {
    const key = `${vmid}-${targetNode}`;
    const label = `${guestType === 'lxc' ? 'CT' : guestType === 'qemu' ? 'VM' : 'Guest'} ${vmid}`;

    setActiveMigrations(prev => ({
      ...prev,
      [key]: { vmid, sourceNode, targetNode, taskId, type: guestType }
    }));
    setGuestsMigrating(prev => ({ ...prev, [vmid]: true }));

    return new Promise((resolvePoll) => {
      const startedAt = Date.now();
      let pollErrors = 0;
      let inFlight = false;
      let done = false;
      let pollInterval = null;

      const finish = (status, extra = {}) => {
        if (done) return;
        done = true;
        clearInterval(pollInterval);
        cancelledKeysRef.current.delete(key);
        dropKey(setMigrationProgress, vmid);
        dropKey(setActiveMigrations, key);
        dropKey(setGuestsMigrating, vmid);
        setMigrationStatus(prev => ({
          ...prev,
          [key]: status === 'success' || status === 'cancelled' ? status : 'failed'
        }));
        // Success/cancel badges fade; a failure stays until the next attempt.
        if (status !== 'failed') setTimeout(() => dropKey(setMigrationStatus, key), 5000);
        if (fetchGuestLocations) fetchGuestLocations();
        resolvePoll({ vmid, status, ...extra });
      };

      const finishUnknown = (reason) => {
        const error = `unknown — check Proxmox (${reason})`;
        notify({ tone: 'warn', message: `${label} → ${targetNode}: outcome ${error}`, duration: 0 });
        finish('failed', { error, unknown: true });
      };

      const onSuccess = async () => {
        let newNode = targetNode;
        try {
          const locationResponse = await fetch(`${API_BASE}/guests/${vmid}/location`);
          const locationResult = await locationResponse.json();
          if (locationResult.success) {
            newNode = locationResult.node;
            if (setData) {
              setData(prevData => {
                if (!prevData || !prevData.guests?.[vmid]) return prevData;
                const guest = prevData.guests[vmid];
                const oldNode = guest.node;
                const newData = { ...prevData };
                newData.guests = {
                  ...prevData.guests,
                  [vmid]: { ...guest, node: newNode, status: locationResult.status }
                };
                newData.nodes = { ...prevData.nodes };
                if (newData.nodes[oldNode]) {
                  newData.nodes[oldNode] = {
                    ...newData.nodes[oldNode],
                    guests: (newData.nodes[oldNode].guests || []).filter(gid => gid !== vmid)
                  };
                }
                if (newData.nodes[newNode] && oldNode !== newNode) {
                  newData.nodes[newNode] = {
                    ...newData.nodes[newNode],
                    guests: [...(newData.nodes[newNode].guests || []), vmid]
                  };
                }
                return newData;
              });
            }
          }
        } catch (err) {
          // The task itself reported OK; a failed location lookup doesn't undo that.
          console.error('Could not fetch new guest location:', err);
        }
        setCompletedMigrations(prev => ({
          ...prev,
          [vmid]: { targetNode, newNode, timestamp: Date.now() }
        }));
        finish('success', { newNode });
      };

      pollInterval = setInterval(async () => {
        if (inFlight || done) return;
        inFlight = true;
        try {
          if (Date.now() - startedAt > MAX_TRACK_MS) {
            finishUnknown(`not finished after ${Math.round(MAX_TRACK_MS / 60000)} min`);
            return;
          }
          const taskStatusResponse = await fetch(`${API_BASE}/tasks/${sourceNode}/${taskId}`);
          const taskStatus = await taskStatusResponse.json().catch(() => ({}));
          if (!taskStatusResponse.ok || !taskStatus.success) {
            throw new Error(taskStatus.error || taskStatus.message || `HTTP ${taskStatusResponse.status}`);
          }
          pollErrors = 0;

          if (taskStatus.progress) {
            setMigrationProgress(prev => ({ ...prev, [vmid]: taskStatus.progress }));
          }
          if (taskStatus.status !== 'stopped') return; // still running

          if (taskStatus.exitstatus === 'OK') {
            await onSuccess();
          } else if (cancelledKeysRef.current.has(key)) {
            finish('cancelled');
          } else {
            const exitText = taskStatus.exitstatus || 'unknown exit status';
            notify({ tone: 'error', message: `${label} → ${targetNode} failed: ${exitText}` });
            finish('failed', { error: exitText });
          }
        } catch (err) {
          pollErrors += 1;
          console.error('Error polling migration task:', err);
          if (pollErrors >= MAX_POLL_ERRORS) {
            finishUnknown(`lost contact after ${pollErrors} failed status checks: ${err.message || err}`);
          }
        } finally {
          inFlight = false;
        }
      }, MIGRATION_POLL_INTERVAL);
    });
  };

  // Used by the Run Plan orchestrator. POSTs /api/migrate for one step and
  // returns a Promise that resolves with the final status once the migration
  // ends (or immediately on POST failure). Mirrors executeMigration but
  // returns a Promise the caller can await.
  const runPlanStep = async (step, recByVmid) => {
    const rec = recByVmid[step.vmid] || {};
    const type = step.type || rec.type;
    if (!type) {
      return { vmid: step.vmid, status: 'failed', error: 'Missing guest type' };
    }
    const key = `${step.vmid}-${step.target_node}`;
    setMigrationStatus(prev => ({ ...prev, [key]: 'running' }));
    try {
      const response = await fetch(`${API_BASE}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_node: step.source_node,
          vmid: step.vmid,
          target_node: step.target_node,
          type,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setMigrationStatus(prev => ({ ...prev, [key]: 'failed' }));
        return { vmid: step.vmid, status: 'failed', error: result.error || result.message || 'POST failed' };
      }
      // trackMigration was refactored to return a Promise resolving to
      // {vmid, status, ...} when the migration ends.
      return await trackMigration(step.vmid, result.source_node, result.target_node, result.task_id, type);
    } catch (err) {
      setMigrationStatus(prev => ({ ...prev, [key]: 'failed' }));
      return { vmid: step.vmid, status: 'failed', error: err.message || String(err) };
    }
  };

  // --- Run Plan orchestration (state lives here so it survives modal close / nav) ---
  const buildGroups = (steps) => {
    const map = new Map();
    for (const s of steps) {
      const g = s.parallel_group || 1;
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(s);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  };

  // Open the Run Plan modal in its confirm phase for the given plan context.
  const openRunPlan = (ctx) => {
    setPlanCtx(ctx || null);
    setPlanModalOpen(true);
  };

  // Clear a finished/closed run entirely (hides the pill + resets).
  const dismissPlanRun = () => {
    setPlanRun(null);
    setPlanCtx(null);
    setPlanModalOpen(false);
  };

  // Execute the plan in planCtx. Runs group-by-group, capping concurrency to
  // max_concurrent_migrations; halts the run if any migration in a group fails.
  const startPlanRun = async () => {
    const ctx = planCtx;
    const steps = ctx?.plan?.ordered_recommendations || [];
    if (!steps.length) return;

    const recByVmid = {};
    (ctx.recommendations || []).forEach(r => { recByVmid[r.vmid] = r; });
    const groups = buildGroups(steps);
    const concurrency = Math.max(1, ctx.maxConcurrent || 1);
    const initStatus = {};
    for (const s of steps) initStatus[s.vmid] = { status: 'pending' };

    planHaltedRef.current = false;
    setPlanRun({ phase: 'running', groups, recByVmid, stepStatus: initStatus, haltMessage: null, halted: false, maxConcurrent: concurrency });

    const patch = (vmid, p) => setPlanRun(prev => prev
      ? { ...prev, stepStatus: { ...prev.stepStatus, [vmid]: { ...prev.stepStatus[vmid], ...p } } }
      : prev);

    for (const [groupKey, groupSteps] of groups) {
      if (planHaltedRef.current) break;
      const groupResults = [];
      for (let i = 0; i < groupSteps.length; i += concurrency) {
        if (planHaltedRef.current) break;
        const chunk = groupSteps.slice(i, i + concurrency);
        for (const s of chunk) patch(s.vmid, { status: 'running' });
        const chunkResults = await Promise.all(chunk.map(s => runPlanStep(s, recByVmid)));
        chunkResults.forEach(r => patch(r.vmid, { status: r.status, error: r.error }));
        groupResults.push(...chunkResults);
        if (chunkResults.some(r => r.status !== 'success')) planHaltedRef.current = true;
      }
      if (groupResults.some(r => r.status !== 'success')) {
        planHaltedRef.current = true;
        const msg = `Halted after group ${groupKey}: at least one migration did not succeed. Remaining steps were not started.`;
        const groupIdx = groups.findIndex(([k]) => k === groupKey);
        setPlanRun(prev => {
          if (!prev) return prev;
          const ss = { ...prev.stepStatus };
          for (let gi = groupIdx; gi < groups.length; gi++) {
            for (const s of groups[gi][1]) {
              if ((ss[s.vmid]?.status || 'pending') === 'pending') ss[s.vmid] = { status: 'skipped' };
            }
          }
          return { ...prev, stepStatus: ss, haltMessage: msg, halted: true };
        });
        break;
      }
    }
    setPlanRun(prev => (prev ? { ...prev, phase: 'done' } : prev));
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
        notify({ tone: 'error', message: `Migration of ${rec.name || rec.vmid} to ${rec.target_node} failed: ${result.error || result.message || `HTTP ${response.status}`}` });
      }
    } catch (err) {
      setMigrationStatus(prev => ({ ...prev, [key]: 'failed' }));
      notify({ tone: 'error', message: `Migration of ${rec.name || rec.vmid} to ${rec.target_node} failed: ${err.message}` });
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
            cancelledKeysRef.current.add(key);
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
    if (!data || !data.nodes || !data.guests) return [];
    const violations = [];

    Object.values(data.nodes).forEach(node => {
      if (!node.guests) return;
      const guestsOnNode = node.guests.map(gid => data.guests[gid]).filter(Boolean);

      guestsOnNode.forEach(guest => {
        if (guest.tags && guest.tags.exclude_groups && guest.tags.exclude_groups.length > 0) {
          guest.tags.exclude_groups.forEach(excludeTag => {
            const conflicts = guestsOnNode.filter(other =>
              other.vmid !== guest.vmid &&
              other.tags && other.tags.all_tags && other.tags.all_tags.includes(excludeTag)
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
    selectedNode, setSelectedNode,
    selectedGuestDetails, setSelectedGuestDetails,
    trackMigration,
    executeMigration,
    runPlanStep,
    // Run Plan orchestration
    planModalOpen, setPlanModalOpen,
    planCtx, planRun,
    openRunPlan, startPlanRun, dismissPlanRun,
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
