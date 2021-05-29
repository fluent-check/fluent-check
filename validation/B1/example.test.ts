import * as fc from '../../src/index'
import {it} from 'mocha'

// Code under test
const inc = (x: number): number => x + 1
const dec = (x: number): number => x - 1
const sum = (a: number, b: number): number => {
  if (b > 0)
    for (let i = 0; i < b; i++)
      a = inc(a)
  else
    for (let i = 0; i < -b; i++)
      a = dec(a)
  return a
}

// Sum Properties
describe('sum', () => {
  // Comutative property
  it('Comutative property of addition', () => {
    fc.expect(fc.scenario()
      .forall('a', fc.integer(-100, 100))
      .forall('b', fc.integer(-100, 100))
      .then(({a, b}) => sum(a,b) === sum(b,a))
      .check()
    )
  })

  // Associative property
  it('Associative property of addition', () => {
    fc.expect(fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(10000))
      .forall('abc', fc.tuple(fc.integer(-100, 100), fc.integer(-100, 100), fc.integer(-100, 100)))
      .then(({abc}) => sum(sum(abc[0],abc[1]), abc[2]) === sum(abc[0], sum(abc[1],abc[2])))
      .check()
    )
  })

  // Identity property
  it('Identity property of addition', () => {
    fc.expect(fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(10000))
      .forall('a', fc.integer(-5000, 5000))
      .then(({a}) => sum(a,0) === a)
      .check()
    )
  })

  // Closure property
  it('Closure property of addition', () => {
    fc.expect(fc.scenario()
      .forall('a', fc.integer(-100, 100))
      .forall('b', fc.integer(-100, 100))
      .then(({a, b}) => Number.isInteger(sum(a,b)))
      .check()
    )
  })

  // Extra property
  it('Extra property of addition', () => {
    fc.expect(fc.scenario()
      .forall('a', fc.integer(-100, 100))
      .forall('b', fc.integer(-100, 100))
      .then(({a, b}) => sum(a,b) === sum(a-1,b+1))
      .check()
    )
  })
})
