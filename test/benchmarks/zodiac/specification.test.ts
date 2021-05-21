import * as fc from '../../../src/index'
import * as bc from '../index'
import {zodiac} from '../../../src/benchmarks/zodiac/original/main'
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
  it('#1 should consider dates with invalid months as invalid dates', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.integer().filter(m => m < 1 || m > 12))
        .forall('day', fc.integer(1, 31))
        .then(({month, day}) => zodiac(month, day) === 'Illegal date')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '1', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#2 should consider dates with invalid days as invalid', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.integer(1, 12))
        .forall('day', fc.integer().filter(d => d < 1 || d > 31))
        .then(({month, day}) => zodiac(month, day) === 'Illegal date')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '2', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#3 should return Capricorn as the zodiac sign for all dates ranging from 22/12 to 31/12', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(12))
        .forall('day', fc.integer(22, 31))
        .then(({month, day}) => zodiac(month, day) === 'Capricorn')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '3', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#4 should return Capricorn as the zodiac sign for all dates ranging from 01/01 to 19/01', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(1))
        .forall('day', fc.integer(1, 19))
        .then(({month, day}) => zodiac(month, day) === 'Capricorn')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '4', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#5 should return Aquarius as the zodiac sign for all dates ranging from 20/01 to 31/01', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(1))
        .forall('day', fc.integer(20, 31))
        .then(({month, day}) => zodiac(month, day) === 'Aquarius')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '5', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#6 should return Aquarius as the zodiac sign for all dates ranging from 01/02 to 17/02', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(2))
        .forall('day', fc.integer(1, 17))
        .then(({month, day}) => zodiac(month, day) === 'Aquarius')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '6', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#7 should return Pisces as the zodiac sign for all dates ranging from 18/02 to 29/02', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(2))
        .forall('day', fc.integer(18, 29))
        .then(({month, day}) => zodiac(month, day) === 'Pisces')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '7', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })
  
  it('#8 should return Pisces as the zodiac sign for all dates ranging from 01/03 to 19/03', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(3))
        .forall('day', fc.integer(1, 19))
        .then(({month, day}) => zodiac(month, day) === 'Pisces')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '8', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#9 should return Aries as the zodiac sign for all dates ranging from 20/03 to 31/03', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(3))
        .forall('day', fc.integer(20, 31))
        .then(({month, day}) => zodiac(month, day) === 'Aries')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '9', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#10 should return Aries as the zodiac sign for all dates ranging from 01/04 to 19/04', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(4))
        .forall('day', fc.integer(1, 19))
        .then(({month, day}) => zodiac(month, day) === 'Aries')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '10', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#11 should return Taurus as the zodiac sign for all dates ranging from 20/04 to 30/04', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(4))
        .forall('day', fc.integer(20, 30))
        .then(({month, day}) => zodiac(month, day) === 'Taurus')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '11', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#12 should return Taurus as the zodiac sign for all dates ranging from 01/05 to 20/05', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(5))
        .forall('day', fc.integer(1, 20))
        .then(({month, day}) => zodiac(month, day) === 'Taurus')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '12', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#13 should return Gemini as the zodiac sign for all dates ranging from 21/05 to 31/05', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(5))
        .forall('day', fc.integer(21, 31))
        .then(({month, day}) => zodiac(month, day) === 'Gemini')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '13', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#14 should return Gemini as the zodiac sign for all dates ranging from 01/06 to 20/06', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(6))
        .forall('day', fc.integer(1, 20))
        .then(({month, day}) => zodiac(month, day) === 'Gemini')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '14', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#15 should return Cancer as the zodiac sign for all dates ranging from 21/06 to 30/06', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(6))
        .forall('day', fc.integer(21, 30))
        .then(({month, day}) => zodiac(month, day) === 'Cancer')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '15', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#16 should return Cancer as the zodiac sign for all dates ranging from 01/07 to 22/07', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(7))
        .forall('day', fc.integer(1, 22))
        .then(({month, day}) => zodiac(month, day) === 'Cancer')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '16', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#17 should return Leo as the zodiac sign for all dates ranging from 23/07 to 31/07', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(7))
        .forall('day', fc.integer(23, 31))
        .then(({month, day}) => zodiac(month, day) === 'Leo')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '17', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#18 should return Leo as the zodiac sign for all dates ranging from 01/08 to 22/08', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(8))
        .forall('day', fc.integer(1, 22))
        .then(({month, day}) => zodiac(month, day) === 'Leo')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '18', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#19 should return Virgo as the zodiac sign for all dates ranging from 23/08 to 31/08', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(8))
        .forall('day', fc.integer(23, 31))
        .then(({month, day}) => zodiac(month, day) === 'Virgo')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '19', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#20 should return Virgo as the zodiac sign for all dates ranging from 01/09 to 22/09', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(9))
        .forall('day', fc.integer(1, 22))
        .then(({month, day}) => zodiac(month, day) === 'Virgo')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '20', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#21 should return Libra as the zodiac sign for all dates ranging from 23/09 to 30/09', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(9))
        .forall('day', fc.integer(23, 30))
        .then(({month, day}) => zodiac(month, day) === 'Libra')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '21', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#22 should return Libra as the zodiac sign for all dates ranging from 01/10 to 22/10', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(10))
        .forall('day', fc.integer(1, 22))
        .then(({month, day}) => zodiac(month, day) === 'Libra')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '22', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#23 should return Scorpio as the zodiac sign for all dates ranging from 23/10 to 31/10', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(10))
        .forall('day', fc.integer(23, 31))
        .then(({month, day}) => zodiac(month, day) === 'Scorpio')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '23', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#24 should return Scorpio as the zodiac sign for all dates ranging from 01/11 to 21/11', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(11))
        .forall('day', fc.integer(1, 21))
        .then(({month, day}) => zodiac(month, day) === 'Scorpio')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '24', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#25 should return Sagittarius as the zodiac sign for all dates ranging from 22/11 to 30/11', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(11))
        .forall('day', fc.integer(22, 30))
        .then(({month, day}) => zodiac(month, day) === 'Sagittarius')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '25', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

  it('#26 should return Sagittarius as the zodiac sign for all dates ranging from 01/12 to 21/12', () => {
    const expected = {'satisfiable': true}
    const seed = Math.floor(Math.random() * 0x100000000)
    const initTime = performance.now()
    
    let scenario = new fc.FluentResult()
    for(let i = 0; i < NRUNS; i++) {
      scenario = fc.scenario()
        .config(bc.PBTS(CONFIGURATION))
        .withGenerator(PRNG, seed)
        .forall('month', fc.constant(12))
        .forall('day', fc.integer(1, 21))
        .then(({month, day}) => zodiac(month, day) === 'Sagittarius')
        .check()
    }

    scenario.benchmarkMetrics!.time = Number(((performance.now() - initTime) / NRUNS).toPrecision(5))
    bc.exportTestData(PATH, '26', expected, scenario)
    expect(scenario).to.deep.include(expected)
  })

})
