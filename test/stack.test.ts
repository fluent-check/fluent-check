import { FluentCheck } from '../src/index'
import { ArbitraryInteger, ArbitraryBoolean, ArbitraryReal, ArbitraryString, ArbitraryComposite } from '../src/arbitraries'
import { it } from 'mocha' 
import { expect } from 'chai'

class Stack<T> {
  elements: Array<T> = []

  push = (e: T) => { this.elements.push(e) }
  pop = () => { return this.elements.pop() }
  size = () => { return this.elements.length }
}

describe('stack tests', () => {
  it('should push one element to the stack and have size one', () => {
    expect(new FluentCheck()
      .exists('e', new ArbitraryInteger())
      .given('stack', () => new Stack<number>())
      .when(({ e, stack }) => stack.push(e))
      .then(({ stack }) => stack.size() == 1)
      .check()).to.have.property('satisfiable', true)
  })
})