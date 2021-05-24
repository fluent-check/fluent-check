import * as fc from '../../../src/index'
import * as bc from '../index'
import {Stack} from '../../../src/benchmarks/js-algorithms-stack/original/main'
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
  it('#1 should push one element to the stack and have size one', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('e', fc.integer())
        .given('stack', () => new Stack())
        .when(({e, stack}) => stack.push(e))
        .then(({stack}) => stack.toArray().length === 1)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '1', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#2 should push several elements to the stack and have size equal to the number of pushed elements', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('es', fc.array(fc.integer()))
        .given('stack', () => new Stack())
        .when(({es, stack}) => es.forEach(e => stack.push(e)))
        .then(({es, stack}) => stack.toArray().length === es.length)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '2', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#3 should find an example where pushing a collection of elements keeps the stack empty', () => {
    const expected = {'satisfiable': false}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .given('stack', () => new Stack())
        .forall('es', fc.array(fc.integer()))
        .when(({es, stack}) => es.forEach(e => stack.push(e)))
        .then(({es, stack}) => stack.toArray().length === es.length)
        .and(({stack}) => stack.toArray().length > 0)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '3', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#4 should find if two different stacks behave the same', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('es', fc.array(fc.integer()))
        .given('s1', () => new Stack())
        .and('s2', () => new Stack())
        .when(({es, s1}) => es.forEach(e => s1.push(e)))
        .and(({es, s2}) => es.forEach(e => s2.push(e)))
        .then(({s1, s2}) => s1.toArray().length === s2.toArray().length)
        .and(({es, s1}) => s1.toArray().length === es.length)
        .and(({es, s2}) => s2.toArray().length === es.length)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '4', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#5 should check if after being pushed some elements, and then popped just one,' +
    'it has size equal to the number of elements minus one', () => {

    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .given('stack', () => new Stack())
        .forall('es', fc.array(fc.integer(), 1))
        .when(({es, stack}) => es.forEach(e => stack.push(e)))
        .then(({es, stack}) => stack.toArray().length === es.length)
        .when(({stack}) => stack.pop())
        .then(({es, stack}) => stack.toArray().length === es.length - 1)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '5', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#6 should stack data to stack', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('e', fc.tuple(fc.integer(), fc.integer()))
        .given('stack', () => new Stack())
        .when(({e, stack}) => { stack.push(e[0]); stack.push(e[1]) })
        .then(({e, stack}) => stack.toString() === '' + e[1] + ',' + e[0])
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '6', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#7 should peek data from stack', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('e', fc.tuple(fc.integer(), fc.integer()))
        .given('stack', () => new Stack())
        .then(({stack}) => stack.peek() === null)
        .when(({e, stack}) => { stack.push(e[0]); stack.push(e[1]) })
        .then(({e, stack}) => stack.peek() === e[1])
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '7', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#8 should check if stack is empty', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('e', fc.integer())
        .given('stack', () => new Stack())
        .then(({stack}) => stack.isEmpty() === true)
        .when(({e, stack}) => stack.push(e))
        .then(({stack}) => stack.isEmpty() === false)
        .and(({e, stack}) => stack.peek() === e)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '8', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#9 should pop data from stack', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('e', fc.tuple(fc.integer(), fc.integer()))
        .given('stack', () => new Stack())
        .when(({e, stack}) => { stack.push(e[0]); stack.push(e[1]) })
        .then(({stack}) => stack.toArray().length === 2)
        .when(({stack}) => { stack.pop(); stack.pop() })
        .then(({stack}) => stack.pop() === null)
        .and(({stack}) => stack.isEmpty() === true)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '9', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#10 should be possible to push/pop objects', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('e', fc.string())
        .given('stack', () => new Stack())
        .when(({e, stack}) => { stack.push({value: e, key: 'key1'}); stack.push({value: e + '_', key: 'key2'}) })
        .then(({e, stack}) => stack.toString((value) => '' + value.key + ':' + value.value) === 'key2:' + e + '_' + ',key1:' + e)
        .and(({e, stack}) => stack.pop().value === e + '_')
        .when(({e, stack}) => { stack.pop() })
        .and(({e, stack}) => stack.pop().value === e)
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '10', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#11 should be possible to convert stack to array', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('e', fc.array(fc.integer(), 3, 3))
        .given('stack', () => new Stack())
        .when(({e, stack}) => { stack.push(e[0]); stack.push(e[1]); stack.push(e[2]); })
        .then(({e, stack}) => JSON.stringify(stack.toArray()) === JSON.stringify(e.reverse()))
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '11', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

})
