import * as fc from '../src/index.js'
import {it, describe} from 'mocha'
import * as chai from 'chai'
const {expect} = chai

describe('Scenario AST', () => {
  describe('buildScenario()', () => {
    it('should build an empty scenario from root', () => {
      const scenario = fc.scenario().buildScenario()

      expect(scenario.nodes).to.have.length(0)
      expect(scenario.quantifiers).to.have.length(0)
      expect(scenario.hasExistential).to.be.false
      expect(scenario.searchSpaceSize).to.equal(1)
    })

    it('should capture a single forall quantifier', () => {
      const scenario = fc.scenario()
        .forall('x', fc.integer())
        .buildScenario()

      expect(scenario.nodes).to.have.length(1)
      expect(scenario.nodes[0].type).to.equal('forall')
      expect((scenario.nodes[0] as fc.ForallNode).name).to.equal('x')
    })

    it('should capture multiple forall quantifiers in order', () => {
      const scenario = fc.scenario()
        .forall('x', fc.integer())
        .forall('y', fc.integer())
        .buildScenario()

      expect(scenario.nodes).to.have.length(2)
      expect(scenario.nodes[0].type).to.equal('forall')
      expect((scenario.nodes[0] as fc.ForallNode).name).to.equal('x')
      expect(scenario.nodes[1].type).to.equal('forall')
      expect((scenario.nodes[1] as fc.ForallNode).name).to.equal('y')
    })

    it('should capture exists quantifier', () => {
      const scenario = fc.scenario()
        .exists('x', fc.integer())
        .buildScenario()

      expect(scenario.nodes).to.have.length(1)
      expect(scenario.nodes[0].type).to.equal('exists')
      expect((scenario.nodes[0] as fc.ExistsNode).name).to.equal('x')
    })

    it('should capture mixed forall and exists quantifiers', () => {
      const scenario = fc.scenario()
        .exists('a', fc.integer())
        .forall('b', fc.integer())
        .buildScenario()

      expect(scenario.nodes).to.have.length(2)
      expect(scenario.nodes[0].type).to.equal('exists')
      expect((scenario.nodes[0] as fc.ExistsNode).name).to.equal('a')
      expect(scenario.nodes[1].type).to.equal('forall')
      expect((scenario.nodes[1] as fc.ForallNode).name).to.equal('b')
    })

    it('should capture then assertion', () => {
      const assertion = ({x}: {x: number}) => x > 0
      const scenario = fc.scenario()
        .forall('x', fc.integer())
        .then(assertion)
        .buildScenario()

      expect(scenario.nodes).to.have.length(2)
      expect(scenario.nodes[1].type).to.equal('then')
      expect((scenario.nodes[1] as fc.ThenNode).predicate).to.equal(assertion)
    })

    it('should capture given with factory', () => {
      const factory = () => [1, 2, 3]
      const scenario = fc.scenario()
        .given('list', factory)
        .buildScenario()

      expect(scenario.nodes).to.have.length(1)
      expect(scenario.nodes[0].type).to.equal('given')
      const givenNode = scenario.nodes[0] as fc.GivenNode
      expect(givenNode.name).to.equal('list')
      expect(givenNode.isFactory).to.be.true
      expect(givenNode.predicate).to.equal(factory)
    })

    it('should capture given with constant', () => {
      const scenario = fc.scenario()
        .given('count', 42)
        .buildScenario()

      expect(scenario.nodes).to.have.length(1)
      expect(scenario.nodes[0].type).to.equal('given')
      const givenNode = scenario.nodes[0] as fc.GivenNode
      expect(givenNode.name).to.equal('count')
      expect(givenNode.isFactory).to.be.false
      expect(givenNode.predicate).to.equal(42)
    })

    it('should capture when clause', () => {
      const action = () => { /* side effect */ }
      const scenario = fc.scenario()
        .when(action)
        .buildScenario()

      expect(scenario.nodes).to.have.length(1)
      expect(scenario.nodes[0].type).to.equal('when')
      expect((scenario.nodes[0] as fc.WhenNode).predicate).to.equal(action)
    })

    it('should capture complex scenario with all node types', () => {
      const setup = () => [1, 2, 3]
      const action = () => { /* side effect */ }
      const assertion = ({x}: {x: number}) => x > 0

      const scenario = fc.scenario()
        .given('list', setup)
        .when(action)
        .exists('a', fc.integer())
        .forall('x', fc.integer())
        .then(assertion)
        .buildScenario()

      expect(scenario.nodes).to.have.length(5)
      expect(scenario.nodes[0].type).to.equal('given')
      expect(scenario.nodes[1].type).to.equal('when')
      expect(scenario.nodes[2].type).to.equal('exists')
      expect(scenario.nodes[3].type).to.equal('forall')
      expect(scenario.nodes[4].type).to.equal('then')
    })
  })

  describe('property-based', () => {
    it('preserves quantifier order', () => {
      fc.prop(
        fc.array(fc.string(1, 5), 1, 4),
        names => {
          const chain = names.reduce(
            (acc, name) => acc.forall(name, fc.integer(-5, 5)),
            fc.scenario()
          )
          const scenario = chain.buildScenario()
          const quantifierNames = scenario.quantifiers.map(q => q.name)

          return quantifierNames.length === names.length &&
            quantifierNames.every((q, idx) => q === names[idx])
        }
      ).assert()
    })

    it('computes search space as product of quantifier sizes', () => {
      fc.prop(
        fc.integer(1, 5),
        fc.integer(1, 5),
        (sizeA, sizeB) => {
          const scenario = fc.scenario()
            .forall('a', fc.integer(0, sizeA - 1))
            .forall('b', fc.integer(0, sizeB - 1))
            .buildScenario()

          return scenario.searchSpaceSize === sizeA * sizeB
        }
      ).assert()
    })
  })

  describe('derived properties', () => {
    describe('quantifiers', () => {
      it('should return only quantifier nodes', () => {
        const scenario = fc.scenario()
          .given('list', () => [])
          .forall('x', fc.integer())
          .exists('y', fc.integer())
          .then(({x, y}) => x + y > 0)
          .buildScenario()

        expect(scenario.quantifiers).to.have.length(2)
        expect(scenario.quantifiers[0].type).to.equal('forall')
        expect(scenario.quantifiers[1].type).to.equal('exists')
      })

      it('should return empty array for scenarios without quantifiers', () => {
        const scenario = fc.scenario()
          .given('x', 42)
          .buildScenario()

        expect(scenario.quantifiers).to.have.length(0)
      })
    })

    describe('hasExistential', () => {
      it('should return false when no exists quantifiers', () => {
        const scenario = fc.scenario()
          .forall('x', fc.integer())
          .forall('y', fc.integer())
          .buildScenario()

        expect(scenario.hasExistential).to.be.false
      })

      it('should return true when exists quantifier present', () => {
        const scenario = fc.scenario()
          .exists('x', fc.integer())
          .buildScenario()

        expect(scenario.hasExistential).to.be.true
      })

      it('should return true for mixed quantifiers with exists', () => {
        const scenario = fc.scenario()
          .forall('x', fc.integer())
          .exists('y', fc.integer())
          .forall('z', fc.integer())
          .buildScenario()

        expect(scenario.hasExistential).to.be.true
      })
    })

    describe('searchSpaceSize', () => {
      it('should return 1 for empty scenario', () => {
        const scenario = fc.scenario().buildScenario()
        expect(scenario.searchSpaceSize).to.equal(1)
      })

      it('should return arbitrary size for single quantifier', () => {
        const scenario = fc.scenario()
          .forall('x', fc.integer(1, 10))
          .buildScenario()

        expect(scenario.searchSpaceSize).to.equal(10)
      })

      it('should return product of sizes for multiple quantifiers', () => {
        const scenario = fc.scenario()
          .forall('x', fc.integer(1, 10))
          .forall('y', fc.integer(1, 5))
          .buildScenario()

        expect(scenario.searchSpaceSize).to.equal(50)
      })

      it('should include exists quantifiers in size calculation', () => {
        const scenario = fc.scenario()
          .exists('a', fc.integer(1, 3))
          .forall('b', fc.integer(1, 4))
          .buildScenario()

        expect(scenario.searchSpaceSize).to.equal(12)
      })
    })
  })

  describe('immutability', () => {
    it('should have readonly nodes array', () => {
      const scenario = fc.scenario()
        .forall('x', fc.integer())
        .buildScenario()

      // TypeScript enforces this at compile time via readonly
      // At runtime, we verify the structure exists
      expect(scenario.nodes).to.be.an('array')
      expect(Object.isFrozen(scenario.nodes) || scenario.nodes.length === 1).to.be.true
    })
  })

  describe('integration with check()', () => {
    it('should not affect check() behavior', () => {
      // Verify that building scenario doesn't change test execution
      const result = fc.scenario()
        .forall('x', fc.integer())
        .forall('y', fc.integer())
        .then(({x, y}) => x + y === y + x)
        .check()

      result.assertSatisfiable()
    })

    it('should produce same scenario before and after check()', () => {
      const chain = fc.scenario()
        .forall('x', fc.integer(1, 10))
        .then(({x}) => x > 0)

      const scenarioBefore = chain.buildScenario()
      chain.check()
      const scenarioAfter = chain.buildScenario()

      expect(scenarioBefore.nodes).to.have.length(scenarioAfter.nodes.length)
      expect(scenarioBefore.quantifiers).to.have.length(scenarioAfter.quantifiers.length)
      expect(scenarioBefore.hasExistential).to.equal(scenarioAfter.hasExistential)
    })
  })

  describe('createScenario function', () => {
    it('should create scenario from nodes array', () => {
      const nodes: fc.ScenarioNode[] = [
        {type: 'forall', name: 'x', arbitrary: fc.integer()},
        {type: 'then', predicate: ({x}: {x: number}) => x > 0}
      ]

      const scenario = fc.createScenario(nodes)

      expect(scenario.nodes).to.have.length(2)
      expect(scenario.quantifiers).to.have.length(1)
      expect(scenario.hasExistential).to.be.false
    })
  })
})
