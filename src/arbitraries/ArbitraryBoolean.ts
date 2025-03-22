import {FluentPick} from './types.js'
import {MappedArbitrary, NoArbitrary} from './internal.js'
import * as fc from './index.js'

export class ArbitraryBoolean extends MappedArbitrary<number, boolean> {
  constructor() { super(fc.integer(0, 1), x => x === 0) }
  shrink(_: FluentPick<boolean>) { return NoArbitrary }
  canGenerate(pick: FluentPick<boolean>) { return pick.value !== undefined }
  toString(depth = 0) { return ' '.repeat(2 * depth) + 'Boolean Arbitrary' }
}
