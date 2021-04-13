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
  it('#1 Simple property test.', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(1, 3))
      .exists('b', fc.integer(1, 4))
      .then(({a, b}) => b <= a)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('#2 Simple property test.', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(1, 3))
      .forall('b', fc.integer(1, 3))
      .exists('c', fc.integer(1, 4))
      .then(({a, b, c}) => c <= a && c <= b)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds the neutral element of addition', () => {
    expect(fc.scenario()
      .exists('a', fc.integer())
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a + b === b)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 0}})
  })

  it('finds if addition has an inverse', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .exists('b', fc.integer(-10, 10))
      .then(({a, b}) => a + b === 0)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds that subtraction is not cummutative', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(0, 10))
      .forall('b', fc.integer(0, 10))
      .then(({a, b}) => a - b === b - a)
      .check()
    ).to.deep.include({satisfiable: false, example: {a: 0, b: 1}})
  })

  it('#4 Simple property test', () => {
    expect(fc.scenario()
      .forall('a', fc.integer())
      .then(({a}) => a + 0 === a)
      .check()
    ).to.deep.include({satisfiable: true})
  })

  it('#5 Simple property test', () => {
    expect(fc.scenario()
      .exists('a', fc.integer(-10, 10))
      .then(({a}) => a + 0 === a)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 0}})
  })

  it('#6 Simple property test', () => {
    expect(fc.scenario()
      .exists('a', fc.integer(-10, 10))
      .exists('b', fc.integer(-10, 10))
      .then(({a, b}) => a + b === 2)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 0, b: 2}})
  })

  it('#3 Simple property test.', () => {
    expect(fc.scenario()
      .exists('a', fc.integer(1, 4))
      .forall('b', fc.integer(1, 3))
      .exists('c', fc.integer(0, 1))
      .then(({a, b, c}) => a > b && c < b)
      .check()
    ).to.have.property('satisfiable', false)
  })

  it('finds the neutral element of multiplication', () => {
    expect(fc.scenario()
      .exists('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a * b === b)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 1}})
  })

  it('should find an example where pushing a collection of elements keeps the stack empty', () => {
    expect(fc.scenario()
      .given('stack', () => new Stack<number>())
      .forall('es', fc.array(fc.integer()))
      .when(({es, stack}) => stack.push(...es))
      .then(({es, stack}) => stack.size() === es.length)
      .and(({stack}) => stack.size() > 0)
      .check()).to.deep.include({satisfiable: false, example: {es: []}})
  })

  it('should allow shrinking of mapped tupples', () => {
    expect(fc.scenario()
      .exists('point', fc.tuple(
        fc.integer(50, 1000).filter(x => x > 100),
        fc.string(1, 10, fc.char('a')).filter(x => x.length > 2)).map(([a, b]) => [a * 2, '_'.concat(b)]))
      .check()).to.deep.include({satisfiable: true, example: {point: [202, '_aaa']}})
  })

  it('should check if after being pushed some elements, and then popped just one,' +
    'it has size equal to the number of elements minus one', () => {

    expect(fc.scenario()
      .given('stack', () => new Stack<number>())
      .forall('es', fc.array(fc.integer(), 1))
      .when(({es, stack}) => stack.push(...es))
      .then(({es, stack}) => stack.size() === es.length)
      .when(({stack}) => stack.pop())
      .then(({es, stack}) => stack.size() === es.length - 1)
      .check()).to.have.property('satisfiable', true)
  })
})
