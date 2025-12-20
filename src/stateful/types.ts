import type {Arbitrary} from '../arbitraries/internal.js'

type Prettify<T> = { [K in keyof T]: T[K] } & {}

export interface StatefulCheckConfig {
  numRuns?: number
  maxCommands?: number
  seed?: number
  verbose?: boolean
}

export interface StatefulResult<M, S> {
  success: boolean
  numRuns: number
  failingSequence?: CommandExecution<M, S>[] | undefined
  shrunkSequence?: CommandExecution<M, S>[] | undefined
  error?: string | undefined
  seed: number
}

export type CommandArbitraries<Args extends Record<string, unknown>> = {
  readonly [K in keyof Args]: Arbitrary<Args[K]>
}

export interface StoredCommand<M, S> {
  readonly name: string
  readonly arbitraries: Record<string, Arbitrary<unknown>>
  readonly precondition: ((model: M) => boolean) | undefined
  readonly execute: (args: Record<string, unknown>, model: M, sut: S) => unknown
  readonly postcondition: ((args: Record<string, unknown>, model: M, sut: S, result: unknown) => boolean) | undefined
}

export interface CommandExecution<M, S> {
  readonly command: StoredCommand<M, S>
  readonly args: Record<string, unknown>
  result?: unknown
}

export type CommandSequence<M, S> = CommandExecution<M, S>[]

export type Invariant<M, S> = (model: M, sut: S) => boolean

export interface StatefulConfig<M, S> {
  readonly modelFactory: () => M
  readonly sutFactory: () => S
  readonly commands: readonly StoredCommand<M, S>[]
  readonly invariants: readonly Invariant<M, S>[]
}

export interface BuilderState<M, S> {
  readonly modelFactory: (() => M) | undefined
  readonly sutFactory: (() => S) | undefined
  readonly commands: readonly StoredCommand<M, S>[]
  readonly invariants: readonly Invariant<M, S>[]
}

export function emptyBuilderState<M, S>(): BuilderState<M, S> {
  return {
    modelFactory: undefined,
    sutFactory: undefined,
    commands: [],
    invariants: []
  }
}

export function withModelFactory<M, S>(
  state: BuilderState<M, S>,
  factory: () => M
): BuilderState<M, S> {
  return {...state, modelFactory: factory}
}

export function withSutFactory<M, S>(
  state: BuilderState<M, S>,
  factory: () => S
): BuilderState<M, S> {
  return {...state, sutFactory: factory}
}

export function withCommand<M, S>(
  state: BuilderState<M, S>,
  command: StoredCommand<M, S>
): BuilderState<M, S> {
  return {...state, commands: [...state.commands, command]}
}

export function withInvariant<M, S>(
  state: BuilderState<M, S>,
  invariant: Invariant<M, S>
): BuilderState<M, S> {
  return {...state, invariants: [...state.invariants, invariant]}
}

export type {Prettify}
