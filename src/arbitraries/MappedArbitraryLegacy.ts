import type {FluentPick, XOR} from './types.js'
import {Arbitrary} from './internal.js'

/**
 * Legacy implementation of MappedArbitrary.
 * Preserved for research/comparative purposes.
 *
 * Flaws:
 * - Assumes bijectivity: size() always delegates to baseArbitrary.
 * - Bias in unions: Causes size overestimation for surjective maps.
 */
export class MappedArbitraryLegacy<A, B> extends Arbitrary<B> {
  constructor(
    public readonly baseArbitrary: Arbitrary<A>,
    public readonly f: (a: A) => B,
    public readonly shrinkHelper?: XOR<{inverseMap: (b: B) => A[]},{canGenerate: (pick: FluentPick<B>) => boolean}>
  ) {
    super()
    const canGenerate = this.shrinkHelper?.canGenerate
    this.canGenerate = canGenerate ?? this.canGenerate
  }

  mapFluentPick(p: FluentPick<A>): FluentPick<B> {
    const original = 'original' in p && p.original !== undefined ? p.original : p.value
    const value = this.f(p.value)
    return {value, original, preMapValue: p.value}
  }

  override pick(generator: () => number): FluentPick<B> | undefined {
    const pick = this.baseArbitrary.pick(generator)
    return pick !== undefined ? this.mapFluentPick(pick) : undefined
  }

  override size() { return this.baseArbitrary.size() }

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
      `Map Arbitrary Legacy: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
