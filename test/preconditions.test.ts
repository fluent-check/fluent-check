import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Precondition tests', () => {
  it('Basic precondition - test passes when precondition is true', () => {
    const result = fc.scenario()
      .forall('n', fc.integer(1, 100))
      .then(({n}) => {
        fc.pre(n > 0)
        return n > 0
      })
      .check()

    expect(result.satisfiable).to.equal(true)
  })

  it('Basic precondition - test skips when precondition is false', () => {
    const result = fc.scenario()
      .forall('n', fc.integer(-10, 10))
      .then(({n}) => {
        fc.pre(n > 100) // Always false in range -10 to 10
        return true
      })
      .check()

    // All test cases should be skipped
    expect(result.skipped).to.be.greaterThan(0)
  })

  it('Precondition with message - message is available in PreconditionFailure', () => {
    const message = 'value must be positive'
    let caughtMessage: string | undefined

    try {
      fc.pre(false, message)
    } catch (e) {
      if (e instanceof fc.PreconditionFailure) {
        caughtMessage = e.message
      }
    }

    expect(caughtMessage).to.equal(message)
  })

  it('Precondition passes - execution continues normally', () => {
    let afterPreExecuted = false

    const result = fc.scenario()
      .forall('n', fc.integer(1, 10))
      .then(({n}) => {
        fc.pre(n >= 1)
        afterPreExecuted = true
        return n >= 1
      })
      .check()

    expect(result.satisfiable).to.equal(true)
    expect(afterPreExecuted).to.equal(true)
  })

  it('Multiple preconditions - all must pass', () => {
    const result = fc.scenario()
      .forall('a', fc.integer(1, 100))
      .forall('b', fc.integer(1, 100))
      .then(({a, b}) => {
        fc.pre(a > 0)
        fc.pre(b > 0)
        fc.pre(a + b > 0)
        return a + b > 0
      })
      .check()

    expect(result.satisfiable).to.equal(true)
  })

  it('Multiple preconditions - first failing skips the test', () => {
    const result = fc.scenario()
      .forall('n', fc.integer(-100, 100))
      .then(({n}) => {
        fc.pre(n > 1000) // Always false
        fc.pre(n > 2000) // Never reached
        return true
      })
      .check()

    expect(result.skipped).to.be.greaterThan(0)
  })

  it('Division by zero scenario - skip when divisor is zero', () => {
    const result = fc.scenario()
      .forall('a', fc.integer(0, 100))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => {
        fc.pre(b !== 0) // Skip division by zero cases
        // For non-negative a and non-zero b, this property holds
        const quotient = Math.trunc(a / b)
        const remainder = a % b
        return quotient * b + remainder === a
      })
      .check()

    expect(result.satisfiable).to.equal(true)
    // Some cases with b=0 should have been skipped
    expect(result.skipped).to.be.greaterThan(0)
  })

  it('Skipped cases do not count as failures', () => {
    // This test would fail without preconditions because some cases
    // would violate the assertion. With preconditions, those cases
    // are skipped instead.
    const result = fc.scenario()
      .forall('n', fc.integer(-10, 10))
      .then(({n}) => {
        fc.pre(n > 0) // Only test positive numbers
        return n > 0
      })
      .check()

    expect(result.satisfiable).to.equal(true)
    expect(result.skipped).to.be.greaterThan(0)
  })

  it('PreconditionFailure can be caught and inspected', () => {
    expect(() => fc.pre(false)).to.throw(fc.PreconditionFailure)
  })

  it('Type narrowing works with preconditions', () => {
    // This is a compile-time check - if fc.pre has correct type assertion,
    // the type of value after fc.pre should be narrowed
    const result = fc.scenario()
      .forall('value', fc.union(fc.integer(1, 10), fc.constant(null as null)))
      .then(({value}) => {
        fc.pre(value !== null)
        // After fc.pre, TypeScript should know value is not null
        // This is primarily a compile-time check
        return typeof value === 'number'
      })
      .check()

    expect(result.satisfiable).to.equal(true)
  })
})
