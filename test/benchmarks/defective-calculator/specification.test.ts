import * as fc from '../../../src/index'
import * as bc from '../index'
import {DefectiveCalculator} from '../../../src/benchmarks/defective-calculator/original/main'
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
  it('#1 should be able to find the inputs where their sum is equal to: x * x', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('x', fc.integer().filter(x => x != 0))
        .exists('y', fc.integer().filter(y => y != 0))
        .given('calc', () => new DefectiveCalculator())
        .then(({x, y, calc}) => x !== y && calc.add(x, y) === x * x)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '1', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#2 should be able to find the inputs where their sum is equal to: y * y', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('x', fc.integer().filter(x => x != 0))
        .exists('y', fc.integer().filter(y => y != 0))
        .given('calc', () => new DefectiveCalculator())
        .then(({x, y, calc}) => x !== y && calc.add(x, y) === y * y)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '2', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#3 should be able to find the inputs where their subtraction is equal to: x / x', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('x', fc.integer().filter(x => x != 0))
        .exists('y', fc.integer().filter(y => y != 0))
        .given('calc', () => new DefectiveCalculator())
        .then(({x, y, calc}) => x !== y && calc.sub(x, y) === x / x)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '3', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#4 should be able to find the inputs where their subtraction is equal to: y / y', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('x', fc.integer().filter(x => x != 0))
        .exists('y', fc.integer().filter(y => y != 0))
        .given('calc', () => new DefectiveCalculator())
        .then(({x, y, calc}) => x !== y && calc.sub(x, y) === y / y)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '4', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#5 should be able to find the inputs where their multiplication is equal to:  x + x + 2 * y', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('x', fc.integer().filter(x => x != 0))
        .exists('y', fc.integer().filter(y => y != 0))
        .given('calc', () => new DefectiveCalculator())
        .then(({x, y, calc}) => x !== y && calc.mul(x, y) ===  x + x + 2 * y)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '5', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#6 should be able to find the inputs where their multiplication is equal to: y + y + 2 * x', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('x', fc.integer().filter(x => x != 0))
        .exists('y', fc.integer().filter(y => y != 0))
        .given('calc', () => new DefectiveCalculator())
        .then(({x, y, calc}) => x !== y && calc.mul(x, y) === y + y + 2 * x)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '6', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#7 should be able to find the inputs where their division is equal to:  x + x + 2 * y', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('x', fc.integer().filter(x => x != 0))
        .exists('y', fc.integer().filter(y => y != 0))
        .given('calc', () => new DefectiveCalculator())
        .then(({x, y, calc}) => x !== y && calc.div(x, y) === x - x + y / 2)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '7', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#8 should be able to find the inputs where their division is equal to: y + y + 2 * x', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .exists('x', fc.integer().filter(x => x != 0))
        .exists('y', fc.integer().filter(y => y != 0))
        .given('calc', () => new DefectiveCalculator())
        .then(({x, y, calc}) => x !== y && calc.div(x, y) === y - y + x / 2)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '8', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

})
