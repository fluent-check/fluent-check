/**
 * Internal state tracking during exploration.
 */
export interface ExplorationState {
  testsRun: number
  skipped: number
  testsPassed: number
  testsFailed: number
  budgetExceeded: boolean
  startTime: number
  labels: Map<string, number>
  /** Last test run number when confidence was checked (for periodic checking) */
  lastConfidenceCheck: number
}

/**
 * Creates an initial exploration state.
 */
export function createExplorationState(): ExplorationState {
  return {
    testsRun: 0,
    skipped: 0,
    testsPassed: 0,
    testsFailed: 0,
    budgetExceeded: false,
    startTime: Date.now(),
    labels: new Map<string, number>(),
    lastConfidenceCheck: 0
  }
}
