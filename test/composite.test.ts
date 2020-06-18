import { FluentCheck } from '../src/index'
import * as fc from '../src/arbitraries'
import { it } from 'mocha'
import { expect } from 'chai'

describe('Composite tests', () => {
  it('finds a string with length 5 in a composite', () => {
    expect(new FluentCheck()
      .exists('a', fc.union(fc.string(0, 2), fc.string(4, 6)))
      .then(({ a }) => a.length === 5)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds no string with length 3 in a composite', () => {
    expect(new FluentCheck()
      .exists('a', fc.union(fc.string(0, 2), fc.string(4, 6)))
      .then(({ a }) => a.length === 3)
      .check()
    ).to.have.property('satisfiable', false)
  })
})