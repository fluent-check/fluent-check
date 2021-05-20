import * as fc from '../src/index'
import {it} from 'mocha'

function unfactorial(num) {
  let d = 1
  while (num > 1 && Math.round(num) === num) {
    d++
    num /= d
  }
  if (num === 1)
    return d + '!'
  else
    return 'NONE'
}

console.log(unfactorial(8))  //for no lint errors

describe('Unfactorial properties', () => {
  let seededGen: (seed: number) => () => number

  beforeEach(() =>
    seededGen = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  it('Property', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll().withDefaultGraphs())
      .withGenerator(seededGen)
      .forall('a', fc.integer(-10,10))
      .then(({a}) => a === a)
      .check()
    )
  })
})
