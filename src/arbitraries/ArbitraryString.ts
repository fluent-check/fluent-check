import { ArbitraryArray, ArbitraryInteger, MappedArbitrary } from './internal'
import { FluentPick } from './types'
import * as fc from './index'

export class ArbitraryString extends MappedArbitrary<string[], string> {
  constructor(public readonly min = 2, public readonly max = 10, public readonly chars = 'abcdefghijklmnopqrstuvwxyz') {
    super(fc.array(fc.integer(0, chars.length - 1).map(n => this.chars[n]), min, max), a => a.join(''))
  }

  canGenerate(pick: FluentPick<string>) {
    // const value = pick.value.split('').map(c => this.chars[c])
    return this.baseArbitrary.canGenerate({ value: pick.original, original: pick.original })
  }
}