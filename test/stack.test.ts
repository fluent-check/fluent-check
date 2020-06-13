import { FluentCheck } from '../src/index'
import { ArbitraryInteger, ArbitraryCollection } from '../src/arbitraries'
import { it } from 'mocha' 
import { expect } from 'chai'

class Stack<T> {
  elements: Array<T> = []

  push = (...e: T[]) => { this.elements.push(...e) }
  pop = () => { return this.elements.pop() }
  size = () => { return this.elements.length }
}

describe('Stack tests', () => {
  it('should push one element to the stack and have size one', () => {
    expect(new FluentCheck()
      .forall('e', new ArbitraryInteger())
      .given('stack', () => new Stack<number>())
      .when(({ e, stack }) => stack.push(e))
      .then(({ stack }) => stack.size() == 1)
      .check()).to.have.property('satisfiable', true)
  })

  it('should push several elements to the stack and have size equal to the number of pushed elements', () => {
    expect(new FluentCheck()
      .forall('es', new ArbitraryCollection(new ArbitraryInteger()))
      .given('stack', () => new Stack<number>())
      .when(({ es, stack }) => stack.push(...es))
      .then(({ es, stack }) => stack.size() == es.length)
      .check()).to.have.property('satisfiable', true)
  })
})
