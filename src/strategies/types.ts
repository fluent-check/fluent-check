import type {FluentPick} from '../arbitraries/index.js'

/**
 * Common representation of a test case with bound FluentPick values.
 * Shared between explorer and shrinker to avoid duplication and casts.
 */
export type BoundTestCase<Rec extends {}> = {
  [K in keyof Rec]: FluentPick<Rec[K]>
}
