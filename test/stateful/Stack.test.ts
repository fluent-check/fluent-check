import {expect} from 'chai'
import * as fc from '../../src/index.js'

/**
 * Simple Stack implementation for testing.
 */
class Stack<T> {
  private elements: T[] = []

  push(value: T): void {
    this.elements.push(value)
  }

  pop(): T | undefined {
    return this.elements.pop()
  }

  peek(): T | undefined {
    return this.elements[this.elements.length - 1]
  }

  size(): number {
    return this.elements.length
  }

  isEmpty(): boolean {
    return this.elements.length === 0
  }

  clear(): void {
    this.elements = []
  }
}

/**
 * Buggy Stack with a memory leak on clear.
 */
class BuggyStack<T> {
  private elements: T[] = []
  private internalSize = 0 // Tracks size independently (buggy)

  push(value: T): void {
    this.elements.push(value)
    this.internalSize++
  }

  pop(): T | undefined {
    if (this.internalSize > 0) {
      this.internalSize--
    }
    return this.elements.pop()
  }

  peek(): T | undefined {
    return this.elements[this.elements.length - 1]
  }

  size(): number {
    return this.internalSize // Bug: should be this.elements.length
  }

  isEmpty(): boolean {
    return this.internalSize === 0
  }

  clear(): void {
    this.elements = []
    // Bug: forgot to reset internalSize!
  }
}

describe('Stateful Testing - Stack', () => {
  describe('correct Stack<number>', () => {
    interface StackModel {
      elements: number[]
    }

    it('should pass with correct implementation', () => {
      const result = fc.stateful<StackModel, Stack<number>>()
        .model(() => ({elements: []}))
        .sut(() => new Stack<number>())

        .command('push')
        .forall('value', fc.integer(-100, 100))
        .run(({value}, model, sut) => {
          model.elements.push(value)
          sut.push(value)
        })

        .command('pop')
        .pre(model => model.elements.length > 0)
        .run((_args, model, sut) => {
          const expected = model.elements.pop()
          const actual = sut.pop()
          if (expected !== actual) {
            throw new Error(`Pop mismatch: expected ${expected}, got ${actual}`)
          }
        })

        .command('peek')
        .pre(model => model.elements.length > 0)
        .run((_args, model, sut) => {
          const expected = model.elements[model.elements.length - 1]
          const actual = sut.peek()
          return {expected, actual}
        })
        .post((_args, _model, _sut, result) => {
          const r = result as {expected: number; actual: number | undefined}
          return r.expected === r.actual
        })

        .invariant((model, sut) => sut.size() === model.elements.length)
        .check({numRuns: 50, maxCommands: 40})

      expect(result.success).to.be.true
    })

    it('should verify LIFO property', () => {
      const result = fc.stateful<StackModel, Stack<number>>()
        .model(() => ({elements: []}))
        .sut(() => new Stack<number>())

        .command('push')
        .forall('value', fc.integer())
        .run(({value}, model, sut) => {
          model.elements.push(value)
          sut.push(value)
        })

        .command('pop')
        .pre(model => model.elements.length > 0)
        .run((_args, model, sut) => {
          // LIFO: last pushed should be first popped
          const expected = model.elements.pop()
          const actual = sut.pop()
          if (expected !== actual) {
            throw new Error(`LIFO violation: expected ${expected}, got ${actual}`)
          }
        })

        .check({numRuns: 50, maxCommands: 30})

      expect(result.success).to.be.true
    })

    it('should support clear operation', () => {
      const result = fc.stateful<StackModel, Stack<number>>()
        .model(() => ({elements: []}))
        .sut(() => new Stack<number>())

        .command('push')
        .forall('value', fc.integer(0, 100))
        .run(({value}, model, sut) => {
          model.elements.push(value)
          sut.push(value)
        })

        .command('clear')
        .run((_args, model, sut) => {
          model.elements = []
          sut.clear()
        })

        .invariant((model, sut) => sut.size() === model.elements.length)
        .invariant((model, sut) => sut.isEmpty() === (model.elements.length === 0))
        .check({numRuns: 50, maxCommands: 30})

      expect(result.success).to.be.true
    })
  })

  describe('buggy Stack', () => {
    interface StackModel {
      elements: number[]
    }

    it('should find size tracking bug', () => {
      const result = fc.stateful<StackModel, BuggyStack<number>>()
        .model(() => ({elements: []}))
        .sut(() => new BuggyStack<number>())

        .command('push')
        .forall('value', fc.integer(0, 100))
        .run(({value}, model, sut) => {
          model.elements.push(value)
          sut.push(value)
        })

        .command('clear')
        .run((_args, model, sut) => {
          model.elements = []
          sut.clear()
        })

        .invariant((model, sut) => sut.size() === model.elements.length)
        .check({numRuns: 100, maxCommands: 30})

      expect(result.success).to.be.false
      expect(result.error).to.include('Invariant failed')

      // The bug requires: push some items, then clear
      if (result.shrunkSequence !== undefined) {
        const hasPush = result.shrunkSequence.some(c => c.command.name === 'push')
        const hasClear = result.shrunkSequence.some(c => c.command.name === 'clear')
        expect(hasPush).to.be.true
        expect(hasClear).to.be.true
      }
    })
  })

  describe('Stack<string>', () => {
    interface StringStackModel {
      elements: string[]
    }

    it('should work with string values', () => {
      const result = fc.stateful<StringStackModel, Stack<string>>()
        .model(() => ({elements: []}))
        .sut(() => new Stack<string>())

        .command('push')
        .forall('value', fc.string(1, 10))
        .run(({value}, model, sut) => {
          model.elements.push(value)
          sut.push(value)
        })

        .command('pop')
        .pre(model => model.elements.length > 0)
        .run((_args, model, sut) => {
          const expected = model.elements.pop()
          const actual = sut.pop()
          if (expected !== actual) {
            throw new Error(`Mismatch: expected "${expected}", got "${actual}"`)
          }
        })

        .invariant((model, sut) => sut.size() === model.elements.length)
        .check({numRuns: 30, maxCommands: 20})

      expect(result.success).to.be.true
    })
  })

  describe('edge cases', () => {
    interface StackModel {
      elements: number[]
    }

    it('should handle empty stack operations gracefully', () => {
      const result = fc.stateful<StackModel, Stack<number>>()
        .model(() => ({elements: []}))
        .sut(() => new Stack<number>())

        .command('checkEmpty')
        .run((_args, model, sut) => {
          const modelEmpty = model.elements.length === 0
          const sutEmpty = sut.isEmpty()
          if (modelEmpty !== sutEmpty) {
            throw new Error(`isEmpty mismatch: model=${modelEmpty}, sut=${sutEmpty}`)
          }
        })

        .command('push')
        .forall('value', fc.integer())
        .run(({value}, model, sut) => {
          model.elements.push(value)
          sut.push(value)
        })

        .command('pop')
        .pre(model => model.elements.length > 0)
        .run((_args, model, sut) => {
          model.elements.pop()
          sut.pop()
        })

        .check({numRuns: 50, maxCommands: 30})

      expect(result.success).to.be.true
    })

    it('should handle many operations', () => {
      const result = fc.stateful<StackModel, Stack<number>>()
        .model(() => ({elements: []}))
        .sut(() => new Stack<number>())

        .command('push')
        .forall('value', fc.integer())
        .run(({value}, model, sut) => {
          model.elements.push(value)
          sut.push(value)
        })

        .command('pop')
        .pre(model => model.elements.length > 0)
        .run((_args, model, sut) => {
          model.elements.pop()
          sut.pop()
        })

        .invariant((model, sut) => sut.size() === model.elements.length)
        .check({numRuns: 20, maxCommands: 200}) // Long sequences

      expect(result.success).to.be.true
    })
  })
})
