import { ArbitraryArray, ArbitraryInteger, MappedArbitrary } from './internal'
import { FluentPick } from './types'

export class ArbitraryString extends MappedArbitrary<number[], string> {
  constructor(public readonly min = 2, public readonly max = 10, public readonly chars = 'abcdefghijklmnopqrstuvwxyz') {
    super(new ArbitraryArray(new ArbitraryInteger(0, chars.length - 1), min, max), a => a.map(n => this.chars[n]).join(''))
  }

  canGenerate(pick: FluentPick<string>) {
    const value = pick.value.split('').map(c => this.chars.indexOf(c))
    return this.baseArbitrary.canGenerate({ value, original: value })
  }
}
