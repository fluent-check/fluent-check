import { FluentPick } from './types'
import { ArbitraryInteger, MappedArbitrary, NoArbitrary } from './internal'

export class ArbitraryBoolean extends MappedArbitrary<number, boolean> {
  constructor() { super(new ArbitraryInteger(0, 1), x => x === 0) }
  shrink(_: FluentPick<boolean>) { return NoArbitrary }
  canGenerate(pick: FluentPick<boolean>) { return pick.value !== undefined}
}