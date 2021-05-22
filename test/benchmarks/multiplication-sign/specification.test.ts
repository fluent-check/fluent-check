import * as fc from '../../../src/index'
import * as bc from '../index'
import {multSign} from '../../../src/benchmarks/multiplication-sign/original/main'
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

describe('Benchmark tests', () => {
  it('#1 should return a positive sign (+) when all numbers are positive', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('a', fc.integer(1, Number.MAX_SAFE_INTEGER))
        .forall('b', fc.integer(1, Number.MAX_SAFE_INTEGER))
        .forall('c', fc.integer(1, Number.MAX_SAFE_INTEGER))
        .then(({a, b, c}) => multSign(a, b, c) === '+')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '1', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#2 should return a negative sign (-) when all numbers are negative', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('a', fc.integer(Number.MIN_SAFE_INTEGER, -1))
        .forall('b', fc.integer(Number.MIN_SAFE_INTEGER, -1))
        .forall('c', fc.integer(Number.MIN_SAFE_INTEGER, -1))
        .then(({a, b, c}) => multSign(a, b, c) === '-')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '2', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#3 should return a positive sign (+) when only two of the numbers are negative and the other is positive', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('a', fc.integer(Number.MIN_SAFE_INTEGER, -1))
        .forall('b', fc.integer(Number.MIN_SAFE_INTEGER, -1))
        .forall('c', fc.integer(1, Number.MAX_SAFE_INTEGER))
        .then(({a, b, c}) => multSign(a, b, c) === '+' && multSign(a, c, b) === '+' && multSign(b, a, c) === '+' && multSign(c, a, b) === '+'
          && multSign(b, c, a) === '+' && multSign(c, b, a) === '+')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '3', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#4 should return a negative sign (-) when only one of the numbers is negative and the others are positive', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('a', fc.integer(1, Number.MAX_SAFE_INTEGER))
        .forall('b', fc.integer(1, Number.MAX_SAFE_INTEGER))
        .forall('c', fc.integer(Number.MIN_SAFE_INTEGER, -1))
        .then(({a, b, c}) => multSign(a, b, c) === '-' && multSign(a, c, b) === '-' && multSign(b, a, c) === '-' && multSign(c, a, b) === '-'
          && multSign(b, c, a) === '-' && multSign(c, b, a) === '-')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '4', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#5 should not return either a positive/negative sign when at least one of the numbers is zero', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('n', fc.integer())
        .then(({n}) => multSign(0, 0, 0) === '' && multSign(0, 0, n) === '' && multSign(0, n, 0) === '' && multSign(n, 0, 0) === ''
          && multSign(0, n, n) === '' && multSign(n, 0, n) === '' && multSign(n, n, 0) === '')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '5', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

})
