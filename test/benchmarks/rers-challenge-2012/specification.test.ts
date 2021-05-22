import * as fc from '../../../src/index'
import * as bc from '../index'
import {Problem1} from '../../../src/benchmarks/rers-challenge-2012/original/main'
import {it} from 'mocha'
import {expect} from 'chai'
import {performance} from 'perf_hooks'

////////////
// HEADER //
////////////

const NRUNS = Number(process.env.FLUENT_CHECK_NRUNS ?? 3)
const RUN = 'R' + process.env.FLUENT_CHECK_RUN
const PROJECT = process.env.FLUENT_CHECK_PROJECT
const MUTATION_ID = 'M' + process.env.FLUENT_CHECK_MUTATION_ID
const CONFIGURATION = process.env.FLUENT_CHECK_CONFIGURATION
const PATH = '.benchmarks/' + PROJECT + '/' + MUTATION_ID + '/' + RUN + '/' + CONFIGURATION + '.json'

const PRNG = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647

///////////////////
// SPECIFICATION //
///////////////////

// http://www.rers-challenge.org/2012/
// http://www.rers-challenge.org/2012/examples/small-easy/Problem1-solutions.txt

describe('Benchmark tests', () => {
  it('#1 should be able to reach error_44', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_44')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '1', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#2 should be able to reach error_50', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_50')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '2', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#3 should be able to reach error_35', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_35')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '3', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#4 should be able to reach error_15', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_15')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '4', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#5 should be able to reach error_38', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_38')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '5', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#6 should be able to reach error_21', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_21')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '6', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#7 should be able to reach error_37', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_37')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '7', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#8 should be able to reach error_56', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_56')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '8', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#9 should be able to reach error_33', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_33')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '9', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#10 should be able to reach error_57', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_57')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '10', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#11 should be able to reach error_47', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_47')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '11', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#12 should be able to reach error_32', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_32')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '12', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })
  
  it('#13 should be able to reach error_20', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null) === 'error_20')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '13', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#14 should not be able to find an error different from those defined above', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('sequence', fc.array(fc.char('A', 'F'), 1, 10))
        .given('problem', () => new Problem1())
        .then(({sequence, problem}) => {
          const reachableErrors = [
            'error_44', 'error_50', 'error_35', 'error_15', 'error_38', 'error_21', 'error_37',
            'error_56', 'error_33', 'error_57', 'error_47', 'error_32', 'error_20'
          ]
          const result = sequence.reduce((_, input) => problem.calculateOutput(input), '' as string | null)
          return result !== null && result!.includes('error') ? reachableErrors.includes(result!) : true
        })
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '14', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

})
