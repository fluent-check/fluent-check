import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'
import {FluentReporter} from '../src/FluentReporter'

describe('Reporter tests', () => {
  it('Passes a satisfiable property', () => {
    fc.expect(
      fc.scenario()
        .then(() => true)
        .check()
    )
  })
  it('Returns error on an unsatisfiable property', () => {
    expect(
      () => {
        fc.expect(
          fc.scenario()
            .then(() => false)
            .check()
        )
      }
    ).to.throw(FluentReporter)
  })
})
