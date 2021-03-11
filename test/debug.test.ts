import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Debug tests', () => {
  it('finds a number that is divisible by -13 and shrinks it', () => {
    expect(fc.scenario()
      .exists('a', fc.integer(-100, -1))
      .then(({a}) => a % 13 === 0)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: -13}})
  })
})
