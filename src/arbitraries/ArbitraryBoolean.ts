import type {FluentPick} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {MappedArbitrary, NoArbitrary} from './internal.js'
import * as fc from './index.js'

export class ArbitraryBoolean extends MappedArbitrary<number, boolean> {
  constructor() { super(fc.integer(0, 1), x => x === 0) }
  override shrink(_: FluentPick<boolean>) { return NoArbitrary }
  override canGenerate(pick: FluentPick<boolean>) { return pick.value !== undefined }

  /** Trivial boolean hash - 0 for false, 1 for true */
  override hashCode(): HashFunction {
    return (v: unknown): number => (v as boolean) ? 1 : 0
  }

  /** Trivial boolean equality - uses strict equality */
  override equals(): EqualsFunction {
    return (a: unknown, b: unknown): boolean => a === b
  }

  override toString(depth = 0) { return ' '.repeat(2 * depth) + 'Boolean Arbitrary' }
}
