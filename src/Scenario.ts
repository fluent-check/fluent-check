import type {Arbitrary} from './arbitraries/index.js'

/**
 * A forall quantifier node - universally quantified variable.
 * The property must hold for ALL values from this arbitrary.
 */
export interface ForallNode<A = unknown> {
  readonly type: 'forall'
  readonly name: string
  readonly arbitrary: Arbitrary<A>
}

/**
 * An exists quantifier node - existentially quantified variable.
 * The property must hold for SOME value from this arbitrary.
 */
export interface ExistsNode<A = unknown> {
  readonly type: 'exists'
  readonly name: string
  readonly arbitrary: Arbitrary<A>
}

/**
 * A quantifier node - either forall or exists.
 */
export type QuantifierNode<A = unknown> = ForallNode<A> | ExistsNode<A>

/**
 * A given node - sets up a derived value before assertions.
 * Can be either a constant value or a factory function.
 */
export interface GivenNode<Rec extends {} = {}> {
  readonly type: 'given'
  readonly name: string
  readonly predicate: ((args: Rec) => unknown) | unknown
  readonly isFactory: boolean
}

/**
 * A when node - executes a side effect before assertions.
 */
export interface WhenNode<Rec extends {} = {}> {
  readonly type: 'when'
  readonly predicate: (args: Rec) => void
}

/**
 * A then node - the assertion predicate.
 */
export interface ThenNode<Rec extends {} = {}> {
  readonly type: 'then'
  readonly predicate: (args: Rec) => boolean
}

/**
 * A classify node - predicate-based classification with a label.
 * The label is counted when the predicate returns true.
 */
export interface ClassifyNode<Rec extends {} = {}> {
  readonly type: 'classify'
  readonly predicate: (args: Rec) => boolean
  readonly label: string
}

/**
 * A label node - dynamic labeling function.
 * The function returns a label string that is counted for each test case.
 */
export interface LabelNode<Rec extends {} = {}> {
  readonly type: 'label'
  readonly fn: (args: Rec) => string
}

/**
 * A collect node - value collection function.
 * The function returns a value (string or number) that is used as a label and counted.
 */
export interface CollectNode<Rec extends {} = {}> {
  readonly type: 'collect'
  readonly fn: (args: Rec) => string | number
}

/**
 * A cover node - coverage requirement with a predicate and required percentage.
 * The label is counted when the predicate returns true, and the required percentage
 * is verified after test execution.
 */
export interface CoverNode<Rec extends {} = {}> {
  readonly type: 'cover'
  readonly predicate: (args: Rec) => boolean
  readonly label: string
  readonly requiredPercentage: number
}

/**
 * A cover table node - tabular coverage with multiple categories.
 * Each category has its own required percentage, and the getCategory function
 * determines which category each test case belongs to.
 */
export interface CoverTableNode<Rec extends {} = {}> {
  readonly type: 'coverTable'
  readonly name: string
  readonly categories: Record<string, number>
  readonly getCategory: (args: Rec) => string
}

/**
 * Union of all scenario node types.
 */
export type ScenarioNode<Rec extends {} = {}> =
  | QuantifierNode
  | GivenNode<Rec>
  | WhenNode<Rec>
  | ThenNode<Rec>
  | ClassifyNode<Rec>
  | LabelNode<Rec>
  | CollectNode<Rec>
  | CoverNode<Rec>
  | CoverTableNode<Rec>

/**
 * An immutable AST representation of a property test scenario.
 *
 * The scenario captures the structure of a FluentCheck chain in a pure
 * data structure, enabling:
 * - Clean separation of scenario definition from execution
 * - Multiple execution strategies interpreting the same scenario
 * - Scenario analysis and inspection before execution
 * - Foundation for holistic strategies that analyze full scenarios
 *
 * @typeParam Rec - The accumulated record type of all bound variables
 */
export interface Scenario<Rec extends {} = {}> {
  /**
   * The ordered array of nodes in this scenario.
   * Order matches the FluentCheck chain from root to leaf.
   */
  readonly nodes: readonly ScenarioNode<Rec>[]

  /**
   * Returns only the quantifier nodes (forall/exists) from this scenario.
   */
  readonly quantifiers: readonly QuantifierNode[]

  /**
   * Returns true if this scenario contains any existential quantifiers.
   */
  readonly hasExistential: boolean

  /**
   * Returns the total search space size (product of all quantifier arbitrary sizes).
   * Returns Infinity if any arbitrary has infinite size.
   */
  readonly searchSpaceSize: number
}

/**
 * Creates an immutable Scenario from an array of nodes.
 *
 * @param nodes - The ordered array of scenario nodes
 * @returns A Scenario object with computed derived properties
 */
export function createScenario<Rec extends {} = {}>(
  nodes: readonly ScenarioNode<Rec>[]
): Scenario<Rec> {
  // Pre-compute derived properties once at construction time
  const quantifiers = nodes.filter(
    (node): node is QuantifierNode => node.type === 'forall' || node.type === 'exists'
  )

  const hasExistential = quantifiers.some(q => q.type === 'exists')

  const searchSpaceSize = quantifiers.reduce((product, q) => {
    const size = q.arbitrary.size()
    return product * size.value
  }, 1)

  return {
    nodes,
    quantifiers,
    hasExistential,
    searchSpaceSize
  }
}
