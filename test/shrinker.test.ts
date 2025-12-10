import {describe, it} from 'mocha'
import {expect} from 'chai'
import * as fc from '../src/index.js'
import {buildPartialExecutableScenario} from '../src/strategies/Shrinker.js'

describe('PerArbitraryShrinker', () => {
  it('rebuilds partial scenarios with fixed quantifiers (search space reduced to 1)', () => {
    const scenario = fc.scenario()
      .forall('x', fc.integer(0, 10))
      .then(({x}) => x >= 0)
      .buildScenario()

    const executableScenario = fc.createExecutableScenario(scenario)
    const boundValues = {x: {value: 5, original: 5}}
    const partial = buildPartialExecutableScenario(executableScenario, 'x', boundValues)

    expect(partial.searchSpaceSize).to.equal(1)

    const sampler = new fc.RandomSampler()
    const samples = partial.quantifiers[0]?.sample(sampler, 3) ?? []
    expect(samples.map(p => p.value)).to.deep.equal([5, 5, 5])
  })
})
