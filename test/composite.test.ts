import * as fc from '../src/index'
import {it} from 'mocha'

describe('Composite tests', () => {
  it('finds a string with length 5 in a composite', () => {
    fc.scenario()
      .exists('a', fc.union(fc.string(0, 2), fc.string(4, 6)))
      .then(({a}) => a.length === 5)
      .check()
      .assertSatisfiable()
  })

  it('finds no string with length 3 in a composite', () => {
    fc.scenario()
      .exists('a', fc.union(fc.string(0, 2), fc.string(4, 6)))
      .then(({a}) => a.length === 3)
      .check()
      .assertNotSatisfiable()
  })
})
