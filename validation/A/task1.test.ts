import * as fc from '../../src/index'
import {it} from 'mocha'

function upperCase(text: string) {
  let result = ''

  for (let i = 0; i < text.length; i++)
    result += String.fromCharCode(text.charCodeAt(i) - 32)

  return result
}

describe('Upper case properties', () => {
  let seededGen: (seed: number) => () => number

  beforeEach(() =>
    seededGen = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  it('Resulting string doesn\'t contain lower case letters', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll('uppercase_p1').withDefaultGraphs())    //displays information after a run and also generates csv and graphs
      .withGenerator(seededGen)
      .forall('text', fc.string(0, 10, fc.char('a', 'z')))
      .then(({text}) => !/[a-z]/.test(upperCase(text)))     //regex
      .check()
    )
  })

  it('Resulting string has the same length as original', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll('uppercase_p2').withDefaultGraphs())    //displays information after a run and also generates csv and graphs
      .withGenerator(seededGen)
      .forall('text', fc.string(0, 10))
      .then(({text}) => text.length === upperCase(text).length)
      .check()
    )
  })
})
