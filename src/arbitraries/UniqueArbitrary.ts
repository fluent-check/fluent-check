import {ArbitrarySize, FluentPick} from './types.js'
import {Arbitrary, WrappedArbitrary, NoArbitrary} from './internal.js'
import {stringify} from './util.js'

/**
 * An arbitrary that ensures uniqueness of generated values.
 * This is essentially "sampling without replacement" from the base arbitrary.
 */
export class UniqueArbitrary<A> extends WrappedArbitrary<A> {
  // Set to track already generated values
  private generated = new Set<string>()
  
  constructor(readonly baseArbitrary: Arbitrary<A>) {
    super(baseArbitrary)
  }

  size(): ArbitrarySize {
    // The size is the same as the base arbitrary, as uniqueness
    // just changes the sampling approach but not the domain size
    return this.baseArbitrary.size()
  }

  pick(generator: () => number): FluentPick<A> | undefined {
    // If we've generated all possible values, return undefined
    const baseSize = this.baseArbitrary.size().value
    if (this.generated.size >= baseSize) {
      return undefined
    }

    // Try to pick a value that hasn't been generated before
    let maxAttempts = 100 // Avoid infinite loops
    let pick: FluentPick<A> | undefined

    do {
      pick = this.baseArbitrary.pick(generator)
      maxAttempts--
    } while (
      pick !== undefined && 
      this.generated.has(stringify(pick.value)) && 
      maxAttempts > 0
    )

    // If we couldn't find a unique value, or the pick is undefined, return undefined
    if (pick === undefined || this.generated.has(stringify(pick.value))) {
      return undefined
    }

    // Mark this value as generated
    this.generated.add(stringify(pick.value))
    return pick
  }
  
  /**
   * Override the standard sample method to ensure uniqueness
   */
  sample(sampleSize = 10, generator: () => number = Math.random): FluentPick<A>[] {
    // Since we're sampling without replacement, we need to take into account 
    // previously generated values
    const result: FluentPick<A>[] = []
    let attempts = 0
    const maxAttempts = Math.max(100, sampleSize * 2) // Reasonable limit on attempts
    
    while (result.length < sampleSize && attempts < maxAttempts) {
      attempts++
      const pick = this.pick(generator)
      if (pick === undefined) break // Can't generate any more unique values
      result.push(pick)
    }
    
    return result
  }

  // Reset the generated set
  reset(): void {
    this.generated.clear()
  }

  cornerCases(): FluentPick<A>[] {
    // For corner cases, we'll still enforce uniqueness
    const cornerCases = this.baseArbitrary.cornerCases()
    const uniqueCornerCases = new Map<string, FluentPick<A>>()

    for (const cornerCase of cornerCases) {
      const key = stringify(cornerCase.value)
      if (!this.generated.has(key)) {
        uniqueCornerCases.set(key, cornerCase)
        // Also mark these as generated for future calls
        this.generated.add(key)
      }
    }

    return Array.from(uniqueCornerCases.values())
  }

  canGenerate<B extends A>(pick: FluentPick<B>): boolean {
    // Can generate if the base arbitrary can generate it and it hasn't been generated yet
    return this.baseArbitrary.canGenerate(pick) && !this.generated.has(stringify(pick.value))
  }

  toString(depth = 0): string {
    return ' '.repeat(depth * 2) + 
      'Unique Arbitrary:\n' + this.baseArbitrary.toString(depth + 1)
  }
} 