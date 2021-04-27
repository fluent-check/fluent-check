import * as fc from '../src/index'
import {it, beforeEach} from 'mocha'
import {expect} from 'chai'

describe('Indexation tests tests', () => {
  let prng: (seed: number) => () => number

  beforeEach(() =>
    prng = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  it('Array', () => { // generates [-4, -2] which index should be -4 + 21 * (-2) = -46
    const arb = fc.array(fc.integer(-10, 10), 2, 3).pick(prng(1234)) ?? {index: 0}
    expect(arb.index).to.equal(-46)
  })

  it('Integer', () => { // generates -9
    const arb = fc.integer(-10, 10).pick(prng(9999)) ?? {index: 0}
    expect(arb.index).to.equal(-9)
  })

  it('Real', () => { // requires change in code so pick receives the used precision and can accurately index
    const arb = fc.real(0, 1).pick(prng(1234)) ?? {index: 0}
    expect(arb.index).to.equal(0.009657739666131204)
  })

  it('Set', () => { // generates [1,2,3], which is combination number 14 of the set 2**1 + 2**2 + 2**3
    const arb = fc.set([0, 1, 2, 3]).pick(prng(289999999)) ?? {index: 0}
    expect(arb.index).to.equal(14)
  })

  it('Tuple', () => {
    
  })

  it('Chain', () => {
    
  })

  it('Filter', () => {
     
  })
})
