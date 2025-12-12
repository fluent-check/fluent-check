import type {Scenario} from '../Scenario.js'
import type {BoundTestCase} from '../strategies/types.js'

/**
 * Extract only the existential quantifier values from a bound test case.
 *
 * For exists scenarios, we want to show only the exists bindings, not forall bindings.
 */
export function extractExistentialWitness<Rec extends {}>(
  scenario: Scenario<Rec>,
  boundTestCase: BoundTestCase<Rec>
): Rec {
  const existentialNames = new Set(
    scenario.quantifiers
      .filter(q => q.type === 'exists')
      .map(q => q.name)
  )

  const example: Record<string, unknown> = {}
  for (const key in boundTestCase) {
    if (Object.prototype.hasOwnProperty.call(boundTestCase, key) && existentialNames.has(key)) {
      example[key] = boundTestCase[key].value
    }
  }

  return example as Rec
}
