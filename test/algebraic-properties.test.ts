import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {testCommutative, testIdempotent, smallInt} from './test-utils.js'

describe('Algebraic properties', () => {
  describe('Idempotence', () => {
    const functions: Array<{
      name: string
      arbitrary: fc.Arbitrary<any>
      fn: (x: any) => any
      isIdempotent: boolean
    }> = [
      {name: 'Math.abs', arbitrary: smallInt(), fn: Math.abs, isIdempotent: true},
      {name: 'Math.floor', arbitrary: smallInt(), fn: Math.floor, isIdempotent: true},
      {name: 'Math.ceil', arbitrary: smallInt(), fn: Math.ceil, isIdempotent: true},
      {name: 'Math.trunc', arbitrary: smallInt(), fn: Math.trunc, isIdempotent: true},
      {name: 'number: x => x + 1', arbitrary: smallInt(), fn: x => x + 1, isIdempotent: false}
    ]

    functions.forEach(({name, arbitrary, fn, isIdempotent}) => {
      if (isIdempotent) {
        it(`${name} is idempotent`, () => {
          testIdempotent(arbitrary, fn).check().assertSatisfiable()
        })
      } else {
        it(`${name} is not idempotent`, () => {
          testIdempotent(arbitrary, fn).check().assertNotSatisfiable()
        })
      }
    })
  })

  describe('Non-commutativity counterexamples', () => {
    const nonCommutativeOps: Array<{
      name: string
      arbitrary: fc.Arbitrary<any>
      op: (a: any, b: any) => any
    }> = [
      {name: 'number subtraction', arbitrary: smallInt(), op: (a, b) => a - b},
      {name: 'number division', arbitrary: fc.integer(1, 10), op: (a, b) => a / b}
    ]

    nonCommutativeOps.forEach(({name, arbitrary, op}) => {
      it(`${name} is not commutative`, () => {
        testCommutative(arbitrary, op).check().assertNotSatisfiable()
      })
    })
  })
})
