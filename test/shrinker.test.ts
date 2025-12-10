import {describe, it} from 'mocha'
import * as fc from '../src/index.js'
import {buildPartialExecutableScenario} from '../src/strategies/Shrinker.js'

describe('PerArbitraryShrinker', () => {
  it('keeps bound quantifiers as constants (property-based)', () => {
    fc.prop(
      fc.integer(-100, 100),
      value => {
        const scenario = fc.scenario()
          .forall('x', fc.integer(-100, 100))
          .then(({x}) => x >= -100 && x <= 100)
          .buildScenario()

        const executableScenario = fc.createExecutableScenario(scenario)
        const boundValues = {x: {value, original: value}}
        const partial = buildPartialExecutableScenario(executableScenario, 'x', boundValues)

        const sampler = new fc.RandomSampler()
        const samples = partial.quantifiers[0]?.sample(sampler, 3) ?? []

        return partial.searchSpaceSize === 1 && samples.every(p => p.value === value)
      }
    ).assert()
  })
})
