/**
 * Explorer module - search space exploration for property-based testing.
 *
 * This module is organized into:
 * - types: Type definitions for exploration
 * - builders: Builder classes for results and outcomes
 * - AbstractExplorer: Base explorer implementation
 * - NestedLoopExplorer: Traditional nested loop exploration
 */

// Re-export types
export type {
  ExplorationBudget,
  ExplorationResult,
  ExplorationPassed,
  ExplorationFailed,
  ExplorationExhausted,
  DetailedExplorationStats,
  ExplorationState,
  TraversalContext,
  TraversalOutcome,
  TraverseNext,
  QuantifierFrame,
  QuantifierSemantics,
  ProgressCallback,
  PropertyEvaluation,
  TestCaseEvaluator
} from './types/index.js'
export {createExplorationState} from './types/index.js'

// Re-export builders
export {TraversalOutcomeBuilder} from './builders/TraversalOutcomeBuilder.js'
export {ExplorationResultBuilder} from './builders/ExplorationResultBuilder.js'

// Re-export explorers
export {AbstractExplorer, type Explorer} from './AbstractExplorer.js'
export {NestedLoopExplorer, createNestedLoopExplorer} from './NestedLoopExplorer.js'

// Re-export BoundTestCase from parent types for convenience
export type {BoundTestCase} from '../types.js'
