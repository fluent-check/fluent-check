import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Nat tests', () => {
  it('should return a NoArbitrary if the bounds are invalid', () => {
    expect(fc.nat(-10, 10)).to.equal(fc.empty())
  })
})
