import * as fc from '../src/index'
import { it } from 'mocha'
import { expect } from 'chai'

describe('Real-valued tests', () => {
  it('finds that there is a real larger than any number in a range and shrinks it', () => {
    expect(fc.scenario()
      .exists('a', fc.real())
      .forall('b', fc.real(-100, 100))
      .then(({ a, b }) => a > b)
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: 101 } })
  })

  it('finds that multiplication has a zero element even in reals', () => {
    expect(fc.scenario()
      .exists('a', fc.real())
      .forall('b', fc.real())
      .then(({ a, b }) => a * b === 0)
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: 0 } })
  })
})
