import type {FluentPick, ShrinkIterator, ShrinkIteratorOptions} from './arbitraries/index.js'
import type {Sampler} from './strategies/Sampler.js'
import type {QuantifierNode, Scenario, ScenarioNode} from './Scenario.js'

/**
 * Runtime operations associated with a quantifier, decoupled from the original Arbitrary instance.
 */
export interface ExecutableQuantifier<A = unknown> {
  readonly name: string
  readonly type: QuantifierNode['type']
  sample(sampler: Sampler, count: number): FluentPick<A>[]
  sampleWithBias(sampler: Sampler, count: number): FluentPick<A>[]
  shrink(pick: FluentPick<A>, sampler: Sampler, count: number): FluentPick<A>[]
  /**
   * Returns a lazy iterator for shrink candidates with binary search support.
   * Uses feedback from acceptSmaller()/rejectSmaller() to guide the search.
   */
  shrinkIterator(pick: FluentPick<A>, options: ShrinkIteratorOptions): ShrinkIterator<A>
  isShrunken(candidate: FluentPick<A>, current: FluentPick<A>): boolean
}

/**
 * Compiled, runtime-ready representation of a Scenario.
 * Contains only executable quantifier operations; callers no longer need direct access to Arbitraries.
 */
export interface ExecutableScenario<Rec extends {} = {}> {
  readonly nodes: readonly ScenarioNode<Rec>[]
  readonly quantifiers: readonly ExecutableQuantifier[]
  readonly hasExistential: boolean
  readonly searchSpaceSize: number
}

/**
 * Compile a declarative Scenario into an ExecutableScenario.
 */
export function createExecutableScenario<Rec extends {} = {}>(
  scenario: Scenario<Rec>
): ExecutableScenario<Rec> {
  const quantifiers = scenario.quantifiers.map(q => compileQuantifier(q))

  return {
    nodes: scenario.nodes,
    quantifiers,
    hasExistential: scenario.hasExistential,
    searchSpaceSize: scenario.searchSpaceSize
  }
}

function compileQuantifier<A>(q: QuantifierNode<A>): ExecutableQuantifier<A> {
  const sample = (sampler: Sampler, count: number) => sampler.sample(q.arbitrary, count)
  const sampleWithBias = (sampler: Sampler, count: number) => sampler.sampleWithBias(q.arbitrary, count)
  const shrink = (pick: FluentPick<A>, sampler: Sampler, count: number) =>
    sampler.sample(q.arbitrary.shrink(pick), count)
  const shrinkIterator = (pick: FluentPick<A>, options: ShrinkIteratorOptions): ShrinkIterator<A> =>
    q.arbitrary.shrinkIterator(pick, options)
  const isShrunken = (candidate: FluentPick<A>, current: FluentPick<A>) =>
    q.arbitrary.isShrunken(candidate, current)

  return {
    name: q.name,
    type: q.type,
    sample,
    sampleWithBias,
    shrink,
    shrinkIterator,
    isShrunken
  }
}
