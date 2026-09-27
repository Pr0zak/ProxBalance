import { API_BASE } from '../utils/constants.js';

const { useState, useEffect, useRef } = React;

// Maintenance mode lives on the server (automigrate config `maintenance_nodes`),
// because that is what the automation run reads. This hook mirrors it:
//  - it starts empty and adopts the server list once the real config has loaded
//    (the automation hook starts with a placeholder object, which is ignored);
//  - it never writes on mount or on config reloads;
//  - it writes only when the user toggles one node, as a read-modify-write of the
//    current server list so a stale browser can't clobber other nodes.
// Older builds kept a copy in localStorage and pushed it back to the server on
// every load, re-adding nodes someone had taken out of maintenance elsewhere.
export function useEvacuation(deps = {}) {
  const { saveAutomationConfig, automationConfig } = deps;

  const [maintenanceNodes, setMaintenanceNodes] = useState(() => new Set());
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(null);
  const [evacuatingNodes, setEvacuatingNodes] = useState(new Set());
  const [evacuationStatus, setEvacuationStatus] = useState({});
  const [evacuationPlan, setEvacuationPlan] = useState(null);
  const [planNode, setPlanNode] = useState(null);
  const [planningNodes, setPlanningNodes] = useState(new Set());
  const [guestActions, setGuestActions] = useState({});
  const [guestTargets, setGuestTargets] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // The first automationConfig this hook sees is useAutomation's placeholder.
  const placeholderConfig = useRef(automationConfig);

  // Drop the legacy localStorage copy so it can never be written back.
  useEffect(() => {
    try { localStorage.removeItem('maintenanceNodes'); } catch (e) { /* storage unavailable */ }
  }, []);

  // Follow the server list whenever a real config arrives (initial fetch, or the
  // response to any save). Read-only: nothing is POSTed from here.
  const serverList = automationConfig && automationConfig !== placeholderConfig.current
    ? automationConfig.maintenance_nodes
    : undefined;
  const serverKey = Array.isArray(serverList) ? [...serverList].sort().join('\u0000') : null;
  useEffect(() => {
    if (serverKey === null) return;
    setMaintenanceNodes(new Set(serverList));
    setMaintenanceLoaded(true);
  }, [serverKey]);

  // Put one node into (enter=true) or out of maintenance. Returns
  // `{ success: true }` or `{ error: true, message }`.
  const setNodeMaintenance = async (node, enter) => {
    if (!node || !saveAutomationConfig) return { error: true, message: 'Maintenance mode is unavailable' };
    setMaintenanceSaving(node);
    try {
      let current;
      try {
        const res = await fetch(`${API_BASE}/automigrate/config`);
        const json = await res.json();
        if (!json.success || !json.config) throw new Error(json.error || 'could not read automation config');
        current = Array.isArray(json.config.maintenance_nodes) ? json.config.maintenance_nodes : [];
      } catch (err) {
        return { error: true, message: `Could not read the current maintenance list: ${err.message}` };
      }
      const next = enter
        ? (current.includes(node) ? current : [...current, node])
        : current.filter(n => n !== node);
      if (next.length === current.length && next.every(n => current.includes(n))) {
        // Already in the requested state on the server; just mirror it.
        setMaintenanceNodes(new Set(next));
        return { success: true };
      }
      // saveAutomationConfig reports its own errors and, on success, stores the
      // server's config, which the effect above mirrors into maintenanceNodes.
      const ok = await saveAutomationConfig({ maintenance_nodes: next });
      return ok ? { success: true } : { error: true, message: 'Saving the maintenance list failed' };
    } finally {
      setMaintenanceSaving(null);
    }
  };

  return {
    maintenanceNodes, setMaintenanceNodes,
    maintenanceLoaded, maintenanceSaving, setNodeMaintenance,
    evacuatingNodes, setEvacuatingNodes,
    evacuationStatus, setEvacuationStatus,
    evacuationPlan, setEvacuationPlan,
    planNode, setPlanNode,
    planningNodes, setPlanningNodes,
    guestActions, setGuestActions,
    guestTargets, setGuestTargets,
    showConfirmModal, setShowConfirmModal
  };
}
