/**
 * Regression test for NoArbitrary.filter() type contract.
 *
 * Issue: NoArbitrary typed as ExactSizeArbitrary<never> means filter()
 * should return EstimatedSizeArbitrary<never>. But if NoArbitrary.filter()
 * returns NoArbitrary itself, this is a type lie.
 *
 * This test verifies that NoArbitrary.filter() correctly returns
 * EstimatedSizeArbitrary.
 */

import {
  NoArbitrary,
  type EstimatedSizeArbitrary,
  type EstimatedSize,
} from '../../src/arbitraries/index.js'
import {type Expect, type Equal} from './test-utils.types.js'

// The key test: NoArbitrary.filter() should return EstimatedSizeArbitrary
const filtered = NoArbitrary.filter(() => true)
type FilteredType = typeof filtered

// This MUST be EstimatedSizeArbitrary<never>, not ExactSizeArbitrary<never>
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AssertFilteredType = Expect<Equal<FilteredType, EstimatedSizeArbitrary<never>>>

// And .size() on the filtered result should return EstimatedSize
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AssertSizeType = Expect<Equal<ReturnType<typeof filtered.size>, EstimatedSize>>

// Same for suchThat
const suchThat = NoArbitrary.suchThat(() => true)
type SuchThatType = typeof suchThat
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AssertSuchThatType = Expect<Equal<SuchThatType, EstimatedSizeArbitrary<never>>>

void filtered
void suchThat
