import * as fc from '../src/index.js'
import {it, describe} from 'mocha'
import {expect} from 'chai'
import {scenarioWithSampleSize} from './test-utils.js'

// Helper to run exploration with default settings
function explore<T extends Record<string, unknown>>(
  scenario: fc.Scenario<T>,
  maxTests = 100,
  useBias = false
) {
  const explorer = fc.createNestedLoopExplorer<T>()
  const baseSampler = new fc.RandomSampler()
  const sampler = useBias ? new fc.BiasedSampler(baseSampler) : baseSampler
  return explorer.explore(scenario, () => true, sampler, {maxTests})
}

// Helper to build a scenario and explore it
function buildAndExplore<T extends Record<string, unknown>>(
  chain: {buildScenario(): fc.Scenario<T>},
  maxTests = 100,
  useBias = false
) {
  return explore(chain.buildScenario(), maxTests, useBias)
}

describe('Explorer', () => {
  describe('NestedLoopExplorer', () => {
    describe('basic exploration', () => {
      it('should pass for a valid forall property', () => {
        const result = buildAndExplore(
          fc.scenario().forall('x', fc.integer(1, 10)).then(({x}) => x > 0)
        )
        expect(result.outcome).to.equal('passed')
        expect(result.testsRun).to.be.greaterThan(0)
      })

      it('should fail when counterexample found', () => {
        const result = buildAndExplore(
          fc.scenario().forall('x', fc.integer(-10, 10)).then(({x}) => x > 0)
        )
        expect(result.outcome).to.equal('failed')
        if (result.outcome === 'failed') {
          expect(result.counterexample.x.value).to.be.at.most(0)
        }
      })

      it('should respect budget limits', () => {
        const result = buildAndExplore(
          fc.scenario().forall('x', fc.integer()).then(({x}) => x + 0 === x),
          10
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
            const result = buildAndExplore(
              fc.scenario()
                .forall('x', fc.integer(-span, span))
                .then(({x}) => x >= -span && x <= span),
              maxTests
            )
            return result.outcome === 'passed' && result.testsRun <= maxTests
          }
        ).assert()
      })

      it('finds a corner-case witness for exists scenarios', () => {
        fc.prop(
          fc.integer(-5, 0),
          fc.integer(0, 10),
          (start, offset) => {
            const result = buildAndExplore(
              fc.scenario()
                .exists('x', fc.integer(start, start + offset))
                .then(({x}) => x === start),
              Math.max(5, offset + 1),
              true // use bias
            )
            return result.outcome === 'passed'
          }
        ).assert()
      })
    })

    describe('forall semantics', () => {
      it('should fail on first counterexample', () => {
        const result = buildAndExplore(
          fc.scenario().forall('x', fc.integer(1, 100)).then(({x}) => x <= 50),
          1000,
          true
        )
        expect(result.outcome).to.equal('failed')
        if (result.outcome === 'failed') {
          expect(result.counterexample.x.value).to.be.greaterThan(50)
        }
      })

      it('should pass when all tests satisfy property', () => {
        const result = buildAndExplore(
          fc.scenario().forall('x', fc.integer(1, 10)).then(({x}) => x >= 1 && x <= 10)
        )
        expect(result.outcome).to.equal('passed')
      })
    })

    describe('budget exhaustion', () => {
      it('should report exhausted when no tests can run', () => {
        const scenario = fc.scenario()
          .forall('x', fc.constant(1))
          .then(({x}) => x === 2)
          .buildScenario()

        const explorer = fc.createNestedLoopExplorer<{x: number}>()
        const result = explorer.explore(
          scenario,
          () => false, // precondition always fails
          new fc.RandomSampler(),
          {maxTests: 0}
        )

        expect(result.outcome).to.equal('exhausted')
        expect(result.testsRun).to.equal(0)
      })
    })

    describe('exists semantics', () => {
      it('should pass when witness found', () => {
        const result = buildAndExplore(
          fc.scenario().exists('x', fc.integer(1, 10)).then(({x}) => x > 5),
          100,
          true
        )
        expect(result.outcome).to.equal('passed')
      })

      it('should exhaust when no witness found', () => {
        const result = buildAndExplore(
          fc.scenario().exists('x', fc.integer(0, 10)).then(({x}) => x === 999),
          50
        )
        expect(result.outcome).to.equal('exhausted')
      })
    })

    describe('multiple quantifiers', () => {
      it('should handle nested forall quantifiers', () => {
        const result = buildAndExplore(
          fc.scenario()
            .forall('x', fc.integer(1, 5))
            .forall('y', fc.integer(1, 5))
            .then(({x, y}) => x + y >= 2)
        )
        expect(result.outcome).to.equal('passed')
      })

      it('should handle mixed exists/forall', () => {
        const result = buildAndExplore(
          fc.scenario()
            .exists('a', fc.integer(0, 100))
            .forall('b', fc.integer(-5, 5))
            .then(({a, b}) => a + b >= 0),
          1000,
          true
        )
        expect(result.outcome).to.equal('passed')
      })
    })

    describe('given predicates', () => {
      it('should apply given factory predicates', () => {
        const result = buildAndExplore(
          fc.scenario()
            .given('list', () => [1, 2, 3])
            .forall('x', fc.integer(0, 10))
            .then(({list, x}) => list.length + x >= 3),
          50
        )
        expect(result.outcome).to.equal('passed')
      })

      it('should apply given constant predicates', () => {
        const result = buildAndExplore(
          fc.scenario()
            .given('multiplier', 2)
            .forall('x', fc.integer(1, 10))
            .then(({multiplier, x}) => multiplier * x >= 2),
          50
        )
        expect(result.outcome).to.equal('passed')
      })
    })

    describe('skipped tests', () => {
      it('should track skipped tests from precondition failures', () => {
        const result = buildAndExplore(
          fc.scenario()
            .forall('x', fc.integer(-10, 10))
            .then(({x}) => { fc.pre(x !== 0); return true }),
          100,
          true
        )
        expect(result.outcome).to.equal('passed')
        expect(result.skipped).to.be.greaterThan(0)
      })
    })
  })

  describe('FluentStrategyFactory explorer configuration', () => {
    it('should build NestedLoopExplorer by default', () => {
      expect(fc.strategy().buildExplorer()).to.be.instanceOf(fc.NestedLoopExplorer)
    })

    it('should build explorer with withNestedExploration()', () => {
      expect(fc.strategy().withNestedExploration().buildExplorer()).to.be.instanceOf(fc.NestedLoopExplorer)
    })

    it('should build standalone sampler', () => {
      const {sampler, randomGenerator} = fc.strategy().defaultStrategy().buildStandaloneSampler()
      expect(sampler).to.exist
      expect(randomGenerator).to.exist
      expect(randomGenerator.seed).to.be.a('number')
    })
  })

  describe('integration with FluentCheck', () => {
    it('should work alongside existing check() method', () => {
      const chain = fc.scenario().forall('x', fc.integer()).then(({x}) => x + 0 === x)

      chain.check().assertSatisfiable()
      expect(chain.buildScenario().quantifiers).to.have.length(1)
    })

    it('should produce consistent results with check()', () => {
      const chain = fc.scenario()
        .forall('x', fc.integer(1, 10))
        .forall('y', fc.integer(1, 10))
        .then(({x, y}) => x + y >= 2)

      expect(chain.check().satisfiable).to.be.true
      expect(buildAndExplore(chain).outcome).to.equal('passed')
    })

    it('should treat exhausted budget as satisfiable for forall-only scenarios', () => {
      const result = scenarioWithSampleSize(0)
        .forall('x', fc.integer())
        .then(() => false)
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.example).to.deep.equal({})
    })
  })
})
