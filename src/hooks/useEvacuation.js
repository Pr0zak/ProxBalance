const { useState, useEffect } = React;

export function useEvacuation(deps = {}) {
  const { saveAutomationConfig, automationConfig } = deps;

  const [maintenanceNodes, setMaintenanceNodes] = useState(() => {
    const saved = localStorage.getItem('maintenanceNodes');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [evacuatingNodes, setEvacuatingNodes] = useState(new Set());
  const [evacuationStatus, setEvacuationStatus] = useState({});
  const [evacuationPlan, setEvacuationPlan] = useState(null);
  const [planNode, setPlanNode] = useState(null);
  const [planningNodes, setPlanningNodes] = useState(new Set());
  const [guestActions, setGuestActions] = useState({});
  const [guestTargets, setGuestTargets] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Save maintenance nodes to localStorage and sync to automation config
  useEffect(() => {
    localStorage.setItem('maintenanceNodes', JSON.stringify(Array.from(maintenanceNodes)));

    if (automationConfig !== null && saveAutomationConfig) {
      const maintenanceArray = Array.from(maintenanceNodes);
      const currentMaintenance = automationConfig.maintenance_nodes || [];

      if (JSON.stringify(maintenanceArray.sort()) !== JSON.stringify(currentMaintenance.sort())) {
        saveAutomationConfig({ maintenance_nodes: maintenanceArray });
      }
    }
  }, [maintenanceNodes]);

  return {
    maintenanceNodes, setMaintenanceNodes,
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
