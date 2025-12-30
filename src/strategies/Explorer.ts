/**
 * @deprecated This file is maintained for backwards compatibility.
 * Import from 'src/strategies/explorer/index.js' instead for the modular version.
 *
 * This re-exports all public APIs from the new modular explorer module.
 */

// Re-export everything from the modular explorer module
export type {
  ExplorationBudget,
  ExplorationResult,
  ExplorationPassed,
  ExplorationFailed,
  ExplorationExhausted,
  DetailedExplorationStats,
  ProgressCallback,
  Explorer,
  BoundTestCase
} from './explorer/index.js'

export {
  AbstractExplorer,
  NestedLoopExplorer,
  createNestedLoopExplorer
} from './explorer/index.js'
