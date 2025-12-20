import {expect} from 'chai'
import * as fc from '../../src/index.js'

/**
 * Simple Counter class for testing stateful testing.
 */
class Counter {
  private count = 0

  increment(): void {
    this.count++
  }

  decrement(): void {
    this.count--
  }

  value(): number {
    return this.count
  }

  reset(): void {
    this.count = 0
  }
}

/**
 * Buggy Counter that has an off-by-one error after 10 decrements.
 */
class BuggyCounter {
  private count = 0
  private decrementCount = 0

  increment(): void {
    this.count++
  }

  decrement(): void {
    this.decrementCount++
    // Bug: after 10 decrements, we decrement by 2 instead of 1
    if (this.decrementCount > 10) {
      this.count -= 2
    } else {
      this.count--
    }
  }

  value(): number {
    return this.count
  }

  reset(): void {
    this.count = 0
    this.decrementCount = 0
  }
}

describe('Stateful Testing - Counter', () => {
  describe('stateful() builder API', () => {
    it('should require model factory', () => {
      expect(() => {
        fc.stateful<{count: number}, Counter>()
          .sut(() => new Counter())
          .command('inc')
          .run(() => {})
          .check()
      }).to.throw('model factory')
    })

    it('should require SUT factory', () => {
      expect(() => {
        fc.stateful<{count: number}, Counter>()
          .model(() => ({count: 0}))
          .command('inc')
          .run(() => {})
          .check()
      }).to.throw('SUT factory')
    })

    it('should require at least one command', () => {
      expect(() => {
        fc.stateful<{count: number}, Counter>()
          .model(() => ({count: 0}))
          .sut(() => new Counter())
          .check()
      }).to.throw('at least one command')
    })
  })

  describe('correct Counter', () => {
    it('should pass with correct implementation', () => {
      const result = fc.stateful<{count: number}, Counter>()
        .model(() => ({count: 0}))
        .sut(() => new Counter())

        .command('increment')
        .run((_args, model, sut) => {
          model.count++
          sut.increment()
        })

        .command('decrement')
        .run((_args, model, sut) => {
          model.count--
          sut.decrement()
        })

        .command('reset')
        .run((_args, model, sut) => {
          model.count = 0
          sut.reset()
        })

        .invariant((model, sut) => sut.value() === model.count)
        .check({numRuns: 50, maxCommands: 30})

      expect(result.success).to.be.true
      expect(result.numRuns).to.equal(50)
    })

    it('should work with forall arguments', () => {
      const result = fc.stateful<{count: number}, Counter>()
        .model(() => ({count: 0}))
        .sut(() => new Counter())

        .command('incrementBy')
        .forall('amount', fc.integer(1, 10))
        .run(({amount}, model, sut) => {
          for (let i = 0; i < amount; i++) {
            model.count++
            sut.increment()
          }
        })

        .invariant((model, sut) => sut.value() === model.count)
        .check({numRuns: 30, maxCommands: 20})

      expect(result.success).to.be.true
    })

    it('should support preconditions', () => {
      const result = fc.stateful<{count: number}, Counter>()
        .model(() => ({count: 0}))
        .sut(() => new Counter())

        .command('increment')
        .run((_args, model, sut) => {
          model.count++
          sut.increment()
        })

        .command('decrement')
        .pre(model => model.count > 0) // Only decrement if count > 0
        .run((_args, model, sut) => {
          model.count--
          sut.decrement()
        })

        .invariant((model, sut) => sut.value() >= 0) // Count never negative
        .invariant((model, sut) => sut.value() === model.count)
        .check({numRuns: 50, maxCommands: 30})

      expect(result.success).to.be.true
    })

    it('should support postconditions', () => {
      const result = fc.stateful<{count: number}, Counter>()
        .model(() => ({count: 0}))
        .sut(() => new Counter())

        .command('getValue')
        .run((_args, model, sut) => {
          return sut.value()
        })
        .post((_args, model, _sut, result) => result === model.count)

        .command('increment')
        .run((_args, model, sut) => {
          model.count++
          sut.increment()
        })

        .check({numRuns: 30, maxCommands: 20})

      expect(result.success).to.be.true
    })
  })

  describe('buggy Counter', () => {
    it('should find bug in buggy implementation', () => {
      const result = fc.stateful<{count: number}, BuggyCounter>()
        .model(() => ({count: 0}))
        .sut(() => new BuggyCounter())

        .command('increment')
        .run((_args, model, sut) => {
          model.count++
          sut.increment()
        })

        .command('decrement')
        .run((_args, model, sut) => {
          model.count--
          sut.decrement()
        })

        .invariant((model, sut) => sut.value() === model.count)
        .check({numRuns: 100, maxCommands: 50})

      expect(result.success).to.be.false
      expect(result.error).to.include('Invariant failed')
      expect(result.shrunkSequence).to.be.an('array')

      // Shrunk sequence should be minimal
      if (result.shrunkSequence !== undefined) {
        // Should need multiple decrements to trigger the bug
        const decrementCount = result.shrunkSequence.filter(
          cmd => cmd.command.name === 'decrement'
        ).length
        expect(decrementCount).to.be.greaterThan(10)
      }
    })
  })

  describe('shrinking', () => {
    it('should shrink failing sequences', () => {
      // Counter that fails after exactly 5 increments
      class FailAfter5 {
        private count = 0
        increment(): void {
          this.count++
          if (this.count === 5) throw new Error('Boom!')
        }
        value(): number { return this.count }
      }

      const result = fc.stateful<{count: number}, FailAfter5>()
        .model(() => ({count: 0}))
        .sut(() => new FailAfter5())

        .command('increment')
        .run((_args, model, sut) => {
          model.count++
          sut.increment()
        })

        .check({numRuns: 100, maxCommands: 50})

      expect(result.success).to.be.false
      expect(result.error).to.include('Boom!')

      // Shrunk sequence should be exactly 5 increments
      if (result.shrunkSequence !== undefined) {
        expect(result.shrunkSequence.length).to.equal(5)
        for (const cmd of result.shrunkSequence) {
          expect(cmd.command.name).to.equal('increment')
        }
      }
    })
  })

  describe('seed reproducibility', () => {
    it('should reproduce same sequence with same seed', () => {
      const config = {numRuns: 10, maxCommands: 20, seed: 12345}

      const result1 = fc.stateful<{count: number}, Counter>()
        .model(() => ({count: 0}))
        .sut(() => new Counter())
        .command('inc').run((_args, model, sut) => { model.count++; sut.increment() })
        .check(config)

      const result2 = fc.stateful<{count: number}, Counter>()
        .model(() => ({count: 0}))
        .sut(() => new Counter())
        .command('inc').run((_args, model, sut) => { model.count++; sut.increment() })
        .check(config)

      expect(result1.seed).to.equal(result2.seed)
      expect(result1.success).to.equal(result2.success)
    })
  })
})
