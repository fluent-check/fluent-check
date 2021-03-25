import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

class Stack<T> {
  elements: Array<T> = []

  push = (...e: T[]) => { this.elements.push(...e) }
  pop = () => { return this.elements.pop() }
  size = () => { return this.elements.length }
}

describe('Debug tests', () => {
  it('....', () => {
    expect(fc.scenario()
      .config(fc.strategy().defaultStrategy().withCoverageGuidance())
      .given('stack', () => new Stack<number>())
      .forall('es', fc.array(fc.integer()))
      .when(({es, stack}) => stack.push(...es))
      .then(({es, stack}) => stack.size() === es.length)
      .and(({stack}) => stack.size() > 0)
      .check()).to.deep.include({satisfiable: false, example: {es: []}})
  })
})
