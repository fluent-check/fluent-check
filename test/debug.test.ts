import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Debug tests', () => {
  it('Testing arbitrary mapping canGenerate function', () => {
    expect(fc.integer(0, 1).map(a => a === 1 ? 'true' : 'false', b => b === 'true' ? 1 : 0)
      .canGenerate({original: 'true', value: 'true'})).to.be.true
    expect(fc.integer(-10, 0).map(a => Math.abs(a), b => -b)
      .canGenerate({original: -5, value: -5})).to.be.false
    expect(fc.integer(-10, 10).map(a => Math.abs(a), b => [-b, b])
      .canGenerate({original: -5, value: -5})).to.be.true
    expect(fc.integer(0, 1).map(a => a === 1, b => b ? 1 : 0).filter(a => a === false)
      .map(a => a ? 0 : 1, b => b === 0 ? true : false)
      .canGenerate({original: 0, value: 0})).to.be.false
    // TODO: This should be false. However, we are not checking if the filter is able to actually generate the value
    // due to missing intermediate information (i.e. multiple maps generate intermediate different values - and
    // types - and we only preserve the root). Maybe we should consider preserving the full path.
    // expect(fc.integer(0, 1).map(a => a === 1).filter(a => a === false).map(a => a ? 0 : 1)
    //   .canGenerate({original: 1, value: 1})).to.be.true
  })
})
