import { FluentCheck } from '../src/index'
import * as fc from '../src/arbitraries'
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
      .forall('e', fc.integer())
      .given('stack', () => new Stack<number>())
      .when(({ e, stack }) => stack.push(e))
      .then(({ stack }) => stack.size() === 1)
      .check()).to.have.property('satisfiable', true)
  })

  it('should push several elements to the stack and have size equal to the number of pushed elements', () => {
    expect(new FluentCheck()
      .forall('es', fc.array(fc.integer()))
      .given('stack', () => new Stack<number>())
      .when(({ es, stack }) => stack.push(...es))
      .then(({ es, stack }) => stack.size() === es.length)
      .check()).to.have.property('satisfiable', true)
  })

  it('should find an example where pushing a collection of elements keeps the stack empty', () => {
    expect(new FluentCheck()
      .given('stack', () => new Stack<number>())
      .forall('es', fc.array(fc.integer()))
      .when(({ es, stack }) => stack.push(...es))
      .then(({ es, stack }) => stack.size() === es.length)
      .and(({ stack }) => stack.size() > 0)
      .check()).to.deep.include({ satisfiable: false, example: { es: [] } })
  })

  it('should find if two different stacks behave the same', () => {
    expect(new FluentCheck()
      .forall('es', fc.array(fc.integer()))
      .given('s1', () => new Stack<number>())
      .and('s2', () => new Stack<number>())
      .when(({ es, s1 }) => s1.push(...es))
      .and(({ es, s2 }) => s2.push(...es))
      .then(({ s1, s2 }) => s1.size() === s2.size())
      .and(({ es, s1 }) => s1.size() === es.length)
      .and(({ es, s2 }) => s2.size() === es.length)
      .check()).to.have.property('satisfiable', true)
  })

  it('should check if after being pushed some elements, and then popped just one, it has size equal to the number of elements minus one', () => {
    expect(new FluentCheck()
      .given('stack', () => new Stack<number>())
      .forall('es', fc.array(fc.integer(), 1))
      .when(({ es, stack }) => stack.push(...es))
      .then(({ es, stack }) => stack.size() === es.length)
      .when(({ stack }) => stack.pop())
      .then(({ es, stack }) => stack.size() === es.length - 1)
      .check()).to.have.property('satisfiable', true)
  })
})
