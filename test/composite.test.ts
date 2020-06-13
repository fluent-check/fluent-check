import { FluentCheck } from '../src/index'
import { ArbitraryString, ArbitraryComposite } from '../src/arbitraries'
import { it } from 'mocha' 
import { expect } from 'chai'

describe('Composite tests', () => {
  it("finds a string with length 5 in a composite", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryComposite([new ArbitraryString(0, 2), new ArbitraryString(4, 6)]))
      .then(({ a }) => a.length  === 5)
      .check()
    ).to.have.property('satisfiable', true)
  })
    
  it("finds no string with length 3 in a composite", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryComposite([new ArbitraryString(0, 2), new ArbitraryString(4, 6)]))
      .then(({ a }) => a.length  === 3)
      .check()
    ).to.have.property('satisfiable', false)
  })
})