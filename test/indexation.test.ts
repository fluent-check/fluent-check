import * as fc from '../src/index'
import {it, beforeEach} from 'mocha'
import {expect} from 'chai'

describe('Indexation tests tests', () => {
  let prng: (seed: number) => () => number

  beforeEach(() =>
    prng = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  it('Array', () => { //generates [-4, -2] which index should be -4 + 21 * (-2) = -46
    const arb = fc.array(fc.integer(-10, 10), 2, 3).pick(prng(1234)) ?? {index: 0}
    expect(arb.index).to.equal(-46)
  })

  it('Boolean', () => {
    
  })

  it('Composite', () => {
    
  })

  it('Constant', () => {
    
  })

  it('Integer', () => {
    
  })

  it('Real', () => {
     
  })

  it('Set', () => {
    
  })

  it('Tuple', () => {
    
  })

  it('Chain', () => {
    
  })

  it('Filter', () => {
     
  })
})
