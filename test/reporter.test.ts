import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'
import {FluentReporter} from '../src/FluentReporter'

describe('Reporter tests', () => {
  it('Passes a satisfiable property', () => {
    fc.expect(fc.scenario()
      .forall('a', fc.integer(-10,10))
      .forall('b', fc.integer(-10,10))
      .then(({a, b}) => a + b === (a - 1) + (b + 1))
      .check()
    )
  })
  it('Returns error on a unsatisfiable property', () => {
    expect(
      function(){
        fc.expect(fc.scenario()
          .forall('a', fc.integer(-10,10))
          .forall('b', fc.integer(-10,10))
          .then(({a, b}) => a + b === a + (b + 1))
          .check()
        )
      }
    ).to.throw(FluentReporter)
  })
})
