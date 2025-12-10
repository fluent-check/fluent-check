import * as fc from '../src/index.js'
import {it, describe} from 'mocha'
import * as chai from 'chai'
const {expect} = chai

describe('Explorer', () => {
  describe('NestedLoopExplorer', () => {
    describe('basic exploration', () => {
      it('should pass for a valid forall property', () => {
        const scenario = fc.scenario()
          .forall('x', fc.integer(1, 10))
          .then(({x}) => x > 0)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{x: number}>()
        const sampler = new fc.RandomSampler()
        const budget: fc.ExplorationBudget = {maxTests: 100}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        expect(result.outcome).to.equal('passed')
        expect(result.testsRun).to.be.greaterThan(0)
      })

      it('should fail when counterexample found', () => {
        const scenario = fc.scenario()
          .forall('x', fc.integer(-10, 10))
          .then(({x}) => x > 0)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{x: number}>()
        const sampler = new fc.RandomSampler()
        const budget: fc.ExplorationBudget = {maxTests: 100}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        expect(result.outcome).to.equal('failed')
        if (result.outcome === 'failed') {
          expect(result.counterexample.x.value).to.be.at.most(0)
        }
      })

      it('should respect budget limits', () => {
        const scenario = fc.scenario()
          .forall('x', fc.integer())
          .then(({x}) => x + 0 === x)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{x: number}>()
        const sampler = new fc.RandomSampler()
        const budget: fc.ExplorationBudget = {maxTests: 10}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        expect(result.testsRun).to.be.at.most(10)
      })
    })

    describe('property-based exploration', () => {
      it('respects budget bounds for forall-only scenarios', () => {
        fc.prop(
          fc.integer(1, 20),
          fc.integer(1, 10),
          (maxTests, span) => {
            const min = -span
            const max = span
            const scenario = fc.scenario()
              .forall('x', fc.integer(min, max))
              .then(({x}) => x >= min && x <= max)
              .buildScenario()

            const explorer = fc.createNestedLoopExplorer<{x: number}>()
            const result = explorer.explore(scenario, () => true, new fc.RandomSampler(), {maxTests})

            return result.outcome === 'passed' && result.testsRun <= maxTests
          }
        ).assert()
      })

      it('finds a corner-case witness for exists scenarios', () => {
        fc.prop(
          fc.integer(-5, 0),
          fc.integer(0, 10),
          (start, offset) => {
            const min = start
            const max = start + offset
            const witness = min

            const scenario = fc.scenario()
              .exists('x', fc.integer(min, max))
              .then(({x}) => x === witness)
              .buildScenario()

            const explorer = fc.createNestedLoopExplorer<{x: number}>()
            const sampler = new fc.BiasedSampler(new fc.RandomSampler())
            const budget: fc.ExplorationBudget = {maxTests: Math.max(5, max - min + 1)}

            const result = explorer.explore(scenario, () => true, sampler, budget)
            return result.outcome === 'passed'
          }
        ).assert()
      })
    })

    describe('forall semantics', () => {
      it('should fail on first counterexample', () => {
        const scenario = fc.scenario()
          .forall('x', fc.integer(1, 100))
          .then(({x}) => x <= 50)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{x: number}>()
        const sampler = new fc.BiasedSampler(new fc.RandomSampler())
        const budget: fc.ExplorationBudget = {maxTests: 1000}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        expect(result.outcome).to.equal('failed')
        if (result.outcome === 'failed') {
          expect(result.counterexample.x.value).to.be.greaterThan(50)
        }
      })

      it('should pass when all tests satisfy property', () => {
        const scenario = fc.scenario()
          .forall('x', fc.integer(1, 10))
          .then(({x}) => x >= 1 && x <= 10)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{x: number}>()
        const sampler = new fc.RandomSampler()
        const budget: fc.ExplorationBudget = {maxTests: 100}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        expect(result.outcome).to.equal('passed')
      })
    })

    describe('budget exhaustion', () => {
      it('should report exhausted for forall-only scenarios when no tests can run', () => {
        const scenario = fc.scenario()
          .forall('x', fc.constant(1))
          .then(({x}) => x === 2)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{x: number}>()
        const sampler = new fc.RandomSampler()
        const budget: fc.ExplorationBudget = {maxTests: 0}

        const result = explorer.explore(
          scenario,
          () => false,
          sampler,
          budget
        )

        expect(result.outcome).to.equal('exhausted')
        expect(result.testsRun).to.equal(0)
      })
    })

    describe('exists semantics', () => {
      it('should pass when witness found', () => {
        // Use a small range to ensure we can find a witness
        const scenario = fc.scenario()
          .exists('x', fc.integer(1, 10))
          .then(({x}) => x > 5)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{x: number}>()
        const sampler = new fc.BiasedSampler(new fc.RandomSampler())
        const budget: fc.ExplorationBudget = {maxTests: 100}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        // Should find a witness (any number > 5 in range 1-10)
        expect(result.outcome).to.equal('passed')
      })

      it('should exhaust when no witness found', () => {
        const scenario = fc.scenario()
          .exists('x', fc.integer(0, 10))
          .then(({x}) => x === 999)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{x: number}>()
        const sampler = new fc.RandomSampler()
        const budget: fc.ExplorationBudget = {maxTests: 50}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        expect(result.outcome).to.equal('exhausted')
      })
    })

    describe('multiple quantifiers', () => {
      it('should handle nested forall quantifiers', () => {
        const scenario = fc.scenario()
          .forall('x', fc.integer(1, 5))
          .forall('y', fc.integer(1, 5))
          .then(({x, y}) => x + y >= 2)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{x: number; y: number}>()
        const sampler = new fc.RandomSampler()
        const budget: fc.ExplorationBudget = {maxTests: 100}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        expect(result.outcome).to.equal('passed')
      })

      it('should handle mixed exists/forall', () => {
        const scenario = fc.scenario()
          .exists('a', fc.integer(0, 100))
          .forall('b', fc.integer(-5, 5))
          .then(({a, b}) => a + b >= 0)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{a: number; b: number}>()
        const sampler = new fc.BiasedSampler(new fc.RandomSampler())
        const budget: fc.ExplorationBudget = {maxTests: 1000}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        // Should find a=5 (or higher) as a witness
        expect(result.outcome).to.equal('passed')
      })
    })

    describe('given predicates', () => {
      it('should apply given factory predicates', () => {
        const scenario = fc.scenario()
          .given('list', () => [1, 2, 3])
          .forall('x', fc.integer(0, 10))
          .then(({list, x}) => list.length + x >= 3)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{list: number[]; x: number}>()
        const sampler = new fc.RandomSampler()
        const budget: fc.ExplorationBudget = {maxTests: 50}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        expect(result.outcome).to.equal('passed')
      })

      it('should apply given constant predicates', () => {
        const scenario = fc.scenario()
          .given('multiplier', 2)
          .forall('x', fc.integer(1, 10))
          .then(({multiplier, x}) => multiplier * x >= 2)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{multiplier: number; x: number}>()
        const sampler = new fc.RandomSampler()
        const budget: fc.ExplorationBudget = {maxTests: 50}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        expect(result.outcome).to.equal('passed')
      })
    })

    describe('skipped tests', () => {
      it('should track skipped tests from precondition failures', () => {
        const scenario = fc.scenario()
          .forall('x', fc.integer(-10, 10))
          .then(({x}) => {
            fc.pre(x !== 0)
            return true
          })
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{x: number}>()
        const sampler = new fc.BiasedSampler(new fc.RandomSampler())
        const budget: fc.ExplorationBudget = {maxTests: 100}

        const result = explorer.explore(
          scenario,
          () => true,
          sampler,
          budget
        )

        expect(result.outcome).to.equal('passed')
        expect(result.skipped).to.be.greaterThan(0)
      })
    })
  })

  describe('FluentStrategyFactory explorer configuration', () => {
    it('should build NestedLoopExplorer by default', () => {
      const factory = fc.strategy()
      const explorer = factory.buildExplorer()

      expect(explorer).to.be.instanceOf(fc.NestedLoopExplorer)
    })

    it('should build explorer with withNestedExploration()', () => {
      const factory = fc.strategy().withNestedExploration()
      const explorer = factory.buildExplorer()

      expect(explorer).to.be.instanceOf(fc.NestedLoopExplorer)
    })

    it('should build standalone sampler', () => {
      const factory = fc.strategy().defaultStrategy()
      const {sampler, randomGenerator} = factory.buildStandaloneSampler()

      expect(sampler).to.exist
      expect(randomGenerator).to.exist
      expect(randomGenerator.seed).to.be.a('number')
    })
  })

  describe('integration with FluentCheck', () => {
    it('should work alongside existing check() method', () => {
      // Test that the Explorer can be used independently
      const chain = fc.scenario()
        .forall('x', fc.integer())
        .then(({x}) => x + 0 === x)

      // Traditional check still works
      const result = chain.check()
      result.assertSatisfiable()

      // Explorer can be used with buildScenario
      const scenario = chain.buildScenario()
      expect(scenario.quantifiers).to.have.length(1)
    })

    it('should produce consistent results with check()', () => {
      // Property that should pass
      const checkResult = fc.scenario()
        .forall('x', fc.integer(1, 10))
        .forall('y', fc.integer(1, 10))
        .then(({x, y}) => x + y >= 2)
        .check()

      expect(checkResult.satisfiable).to.be.true

      // Same property via Explorer
      const scenario = fc.scenario()
        .forall('x', fc.integer(1, 10))
        .forall('y', fc.integer(1, 10))
        .then(({x, y}) => x + y >= 2)
        .buildScenario()

      const explorer = fc.createNestedLoopExplorer<{x: number; y: number}>()
      const sampler = new fc.RandomSampler()
      const budget: fc.ExplorationBudget = {maxTests: 100}

      const explorerResult = explorer.explore(scenario, () => true, sampler, budget)
      expect(explorerResult.outcome).to.equal('passed')
    })
  })
})
