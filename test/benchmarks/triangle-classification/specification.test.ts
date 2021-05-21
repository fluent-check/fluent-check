import * as fc from '../../../src/index'
import * as bc from '../index'
import {triangle} from '../../../src/benchmarks/triangle-classification/original/main'
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
  it('#1 should detect invalid triangles with either negative or null side\'s length', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('a', fc.integer(Number.MIN_SAFE_INTEGER, 0))
        .forall('b', fc.integer(Number.MIN_SAFE_INTEGER, 0))
        .forall('c', fc.integer(Number.MIN_SAFE_INTEGER, 0))
        .then(({a, b, c}) => triangle(a, b, c) === 'Not a triangle')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '1', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#2 should detect invalid triangles which sum of the length of any two sides of a triangle is lesser or equal than the length of the third side', () => {
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
        .then(({a, b, c}) => a + b <= c || b + c <= a || c + a <= b ? triangle(a, b, c) === 'Not a triangle' : true)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '2', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#3 should classify as scalene a triangle with all three sides of different lengths', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('a', fc.integer(1, Math.floor(Number.MAX_SAFE_INTEGER / 3)))
        .forall('b', fc.integer(Math.ceil(Number.MAX_SAFE_INTEGER / 3), Math.floor(Number.MAX_SAFE_INTEGER * 2 / 3)))
        .forall('c', fc.integer(Math.ceil(Number.MAX_SAFE_INTEGER * 2 / 3 + 1), Number.MAX_SAFE_INTEGER))
        .then(({a, b, c}) => a + b <= c || b + c <= a || c + a <= b ? triangle(a, b, c) === 'Not a triangle' :
          triangle(a, b, c) === 'Scalene' && triangle(c, a, b) === 'Scalene' && triangle(b, c, a) === 'Scalene')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '3', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#4 should classify as isosceles a triangle with two sides of the same length and the third side of a different length', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('x', fc.integer(1, Number.MAX_SAFE_INTEGER))
        .forall('y', fc.integer(1, Number.MAX_SAFE_INTEGER))
        .then(({x, y}) => x + x <= y || x + y <= x ? triangle(x, x, y) === 'Not a triangle' :
          triangle(x, x, y) === 'Isosceles' && triangle(x, y, x) === 'Isosceles' && triangle(y, x, x) === 'Isosceles')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '4', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#5 should classify as equilateral a triangle with all the three sides of the same length', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('x', fc.integer(1, Number.MAX_SAFE_INTEGER))
        .then(({x}) => triangle(x, x, x) === 'Equilateral')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '5', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })
})
