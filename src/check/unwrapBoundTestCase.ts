import type {BoundTestCase} from '../strategies/types.js'

/**
 * Unwrap FluentPick values to plain values.
 */
export function unwrapBoundTestCase<Rec extends {}>(boundTestCase: BoundTestCase<Rec>): Rec {
  const result: Record<string, unknown> = {}
  for (const key in boundTestCase) {
    if (Object.prototype.hasOwnProperty.call(boundTestCase, key)) {
      result[key] = boundTestCase[key].value
    }
  }
  return result as Rec
}
