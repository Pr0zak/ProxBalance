/**
 * Load/error state of the root data hooks, shared through context so deep
 * consumers (auto-status pill, suggestions list, KPI row, Automation page) can
 * tell "not loaded yet" and "failed to load" apart from real values without
 * threading extra props through every page component.
 *
 * Shape (every field optional):
 *   automationStatusError, retryAutomationStatus,
 *   automationConfigError, retryAutomationConfig,
 *   recommendationsError, retryRecommendations
 */
const { createContext, useContext } = React;

export const AppStatusContext = createContext({});

export function useAppStatus() {
  return useContext(AppStatusContext) || {};
}
