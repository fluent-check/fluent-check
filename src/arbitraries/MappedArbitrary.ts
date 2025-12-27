import type {FluentPick, XOR} from './types.js'
import {Arbitrary} from './internal.js'
import {estimatedSize, stringify} from './util.js'

export class MappedArbitrary<A, B> extends Arbitrary<B> {
  private readonly distinctnessFactor: number

  constructor(
    public readonly baseArbitrary: Arbitrary<A>,
    public readonly f: (a: A) => B,
    public readonly shrinkHelper?: XOR<{inverseMap: (b: B) => A[]},{canGenerate: (pick: FluentPick<B>) => boolean}>
  ) {
    super()
    const canGenerate = this.shrinkHelper?.canGenerate
    this.canGenerate = canGenerate ?? this.canGenerate

    // Heuristic: Sample a few values to estimate injectivity
    // If f is 1-to-1, unique/total should be 1.0
    // If f is many-to-1, unique/total < 1.0
    const DISTINCTNESS_HEURISTIC_SEED = 0xCAFEBABE
    const DISTINCTNESS_HEURISTIC_SAMPLES = 10
    let seed = DISTINCTNESS_HEURISTIC_SEED
    const lcg = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0
      return (seed >>> 0) / 4294967296
    }

    const inputs: A[] = []
    const outputs: B[] = []
    const eq = this.baseArbitrary.equals()

    for (let i = 0; i < DISTINCTNESS_HEURISTIC_SAMPLES; i++) {
      const pick = this.baseArbitrary.pick(lcg)
      if (pick !== undefined) {
        if (!inputs.some(x => eq(x, pick.value))) {
          inputs.push(pick.value)
        }

        const out = this.f(pick.value)
        if (!outputs.some(y => stringify(y) === stringify(out))) {
          outputs.push(out)
        }
      }
    }

    // Compare unique outputs to unique inputs to detect collisions regardless of domain size
    this.distinctnessFactor = inputs.length > 0 ? outputs.length / inputs.length : 1.0
  }

  mapFluentPick(p: FluentPick<A>): FluentPick<B> {
    const original = 'original' in p && p.original !== undefined ? p.original : p.value
    const value = this.f(p.value)
    // Preserve the pre-mapped value so shrinking can reconstruct the base pick
    return {value, original, preMapValue: p.value}
  }

  override pick(generator: () => number): FluentPick<B> | undefined {
    const pick = this.baseArbitrary.pick(generator)
    return pick !== undefined ? this.mapFluentPick(pick) : undefined
  }

  override size() {
    const baseSize = this.baseArbitrary.size()

    // If mapping appears bijective, return base size directly
    if (this.distinctnessFactor === 1.0) return baseSize

    // Otherwise, scale the size estimate
    const value = Math.round(baseSize.value * this.distinctnessFactor)

    // If it's exact but we have collisions, it becomes estimated
    if (baseSize.type === 'exact') {
      return estimatedSize(value, [value, value])
    }

    // If already estimated, scale the interval too
    return estimatedSize(
      value,
      [
        Math.round(baseSize.credibleInterval[0] * this.distinctnessFactor),
        Math.round(baseSize.credibleInterval[1] * this.distinctnessFactor)
      ]
    )
  }

  override cornerCases(): FluentPick<B>[] {
    return this.baseArbitrary.cornerCases().map(p => this.mapFluentPick(p))
  }

  override shrink(initial: FluentPick<B>): Arbitrary<B> {
    const withBase = initial as {preMapValue?: A; original?: unknown}
    const baseValue = (withBase.preMapValue ?? withBase.original ?? initial.value) as A
    const basePick: FluentPick<A> = {
      value: baseValue,
      original: (withBase.original as A | undefined) ?? baseValue
    }

    return this.baseArbitrary.shrink(basePick).map(v => this.f(v))
  }

  override isShrunken(candidate: FluentPick<B>, current: FluentPick<B>): boolean {
    const toBasePick = (pick: FluentPick<B>): FluentPick<A> => {
      const withBase = pick as {preMapValue?: A; original?: unknown}
      const baseValue = (withBase.preMapValue ?? withBase.original ?? pick.value) as A
      return {
        value: baseValue,
        original: (withBase.original as A | undefined) ?? baseValue
      }
    }

    return this.baseArbitrary.isShrunken(toBasePick(candidate), toBasePick(current))
  }

  override canGenerate(pick: FluentPick<B>) {
    const inverseValues = this.shrinkHelper?.inverseMap !== undefined ?
      this.shrinkHelper.inverseMap(pick.value) : [pick.original]
    return inverseValues.some(value => this.baseArbitrary.canGenerate({value, original: pick.original}))
  }

  override toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      `Map Arbitrary: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
