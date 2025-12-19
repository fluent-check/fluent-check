import type {Arbitrary} from '../arbitraries/internal.js'

/**
 * Configuration for running stateful tests.
 */
export interface StatefulCheckConfig {
  /** Number of test runs (default: 100) */
  numRuns?: number
  /** Maximum number of commands per sequence (default: 50) */
  maxCommands?: number
  /** Random seed for reproducibility */
  seed?: number
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * Result of a stateful test run.
 */
export interface StatefulResult<M, S> {
  /** Whether all tests passed */
  success: boolean
  /** Number of tests run */
  numRuns: number
  /** If failed, the failing command sequence */
  failingSequence?: ExecutedCommand<M, S, unknown>[] | undefined
  /** If failed, the shrunk minimal sequence */
  shrunkSequence?: ExecutedCommand<M, S, unknown>[] | undefined
  /** Error message if failed */
  error?: string | undefined
  /** Random seed used */
  seed: number
}

/**
 * A command definition for stateful testing.
 *
 * @typeParam M - Model type
 * @typeParam S - System under test type
 * @typeParam Args - Command arguments type (record of arbitrary values)
 */
export interface Command<M, S, Args extends Record<string, unknown>> {
  /** Unique name identifying this command */
  name: string
  /** Arbitraries for generating command arguments */
  args: { [K in keyof Args]: Arbitrary<Args[K]> }
  /** Precondition: command is only selected when this returns true */
  pre?: ((model: M) => boolean) | undefined
  /** Execute the command, mutating model and SUT */
  run: (args: Args, model: M, sut: S) => unknown
  /** Postcondition: checked after run() completes */
  post?: ((args: Args, model: M, sut: S, result: unknown) => boolean) | undefined
}

/**
 * An executed command with its generated arguments.
 */
export interface ExecutedCommand<M, S, Args> {
  /** The command definition */
  command: Command<M, S, Args extends Record<string, unknown> ? Args : Record<string, unknown>>
  /** The generated argument values */
  args: Args
  /** Result returned by run() */
  result?: unknown
}

/**
 * A sequence of commands to execute.
 */
export type CommandSequence<M, S> = ExecutedCommand<M, S, unknown>[]

/**
 * Invariant function checked after each command.
 */
export type Invariant<M, S> = (model: M, sut: S) => boolean

/**
 * Internal configuration built by the fluent API.
 */
export interface StatefulConfig<M, S> {
  /** Factory function to create fresh model instances */
  modelFactory: () => M
  /** Factory function to create fresh SUT instances */
  sutFactory: () => S
  /** Registered commands */
  commands: Command<M, S, Record<string, unknown>>[]
  /** Registered invariants */
  invariants: Invariant<M, S>[]
}
