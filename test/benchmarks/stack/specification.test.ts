import * as fc from '../../../src/index'
import * as bc from '../index'
import {Stack} from '../../../src/benchmarks/stack/original/main'
import {it} from 'mocha'
import {expect} from 'chai'

////////////
// HEADER //
////////////

const RUN = 'R' + process.env.FLUENT_CHECK_RUN
const PROJECT = process.env.FLUENT_CHECK_PROJECT
const MUTATION_ID = 'M' + process.env.FLUENT_CHECK_MUTATION_ID
const CONFIGURATION = process.env.FLUENT_CHECK_CONFIGURATION
const PBTS = bc.getConfiguration(CONFIGURATION)
const PATH = '.benchmarks/' + PROJECT + '/' + MUTATION_ID + '/' + RUN + '/' + CONFIGURATION + '.json'

///////////////////
// SPECIFICATION //
///////////////////

describe('Benchmark tests', () => {
  it('#1 should push one element to the stack and have size one', () => {
    const expected = {'satisfiable': true}
    const scenario = fc.scenario()
      .config(PBTS)
      .forall('e', fc.integer())
      .given('stack', () => new Stack<number>())
      .when(({e, stack}) => stack.push(e))
      .then(({stack}) => stack.size() === 1)
      .check()
    bc.exportTestData(PATH, '1', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#2 should push several elements to the stack and have size equal to the number of pushed elements', () => {
    const expected = {'satisfiable': true}
    const scenario = fc.scenario()
      .config(PBTS)
      .forall('es', fc.array(fc.integer()))
      .given('stack', () => new Stack<number>())
      .when(({es, stack}) => stack.push(...es))
      .then(({es, stack}) => stack.size() === es.length)
      .check()
    bc.exportTestData(PATH, '2', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#3 should find an example where pushing a collection of elements keeps the stack empty', () => {
    const expected = {satisfiable: false}
    const scenario = fc.scenario()
      .config(PBTS)
      .given('stack', () => new Stack<number>())
      .forall('es', fc.array(fc.integer()))
      .when(({es, stack}) => stack.push(...es))
      .then(({es, stack}) => stack.size() === es.length)
      .and(({stack}) => stack.size() > 0)
      .check()

    bc.exportTestData(PATH, '3', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#4 should find if two different stacks behave the same', () => {
    const expected = {'satisfiable': true}
    const scenario = fc.scenario()
      .config(PBTS)
      .forall('es', fc.array(fc.integer()))
      .given('s1', () => new Stack<number>())
      .and('s2', () => new Stack<number>())
      .when(({es, s1}) => s1.push(...es))
      .and(({es, s2}) => s2.push(...es))
      .then(({s1, s2}) => s1.size() === s2.size())
      .and(({es, s1}) => s1.size() === es.length)
      .and(({es, s2}) => s2.size() === es.length)
      .check()

    bc.exportTestData(PATH, '4', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#5 should check if after being pushed some elements, and then popped just one,' +
    'it has size equal to the number of elements minus one', () => {
    const expected = {'satisfiable': true}
    const scenario = fc.scenario()
      .config(PBTS)
      .given('stack', () => new Stack<number>())
      .forall('es', fc.array(fc.integer(), 1))
      .when(({es, stack}) => stack.push(...es))
      .then(({es, stack}) => stack.size() === es.length)
      .when(({stack}) => stack.pop())
      .then(({es, stack}) => stack.size() === es.length - 1)
      .check()

    bc.exportTestData(PATH, '5', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })
})
