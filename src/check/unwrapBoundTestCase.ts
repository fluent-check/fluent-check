import type {BoundTestCase} from '../strategies/types.js'
import type {FluentPick} from '../arbitraries/index.js'

/**
 * Unwrap FluentPick values to plain values.
 */
export function unwrapBoundTestCase<Rec extends {}>(boundTestCase: BoundTestCase<Rec>): Rec {
  const result: Record<string, unknown> = {}
  for (const [key, pick] of Object.entries(boundTestCase)) {
    result[key] = (pick as FluentPick<unknown>).value
  }
  return result as Rec
}
