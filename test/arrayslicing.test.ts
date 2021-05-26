import * as fc from '../src/index'
import {it} from 'mocha'

function sliceArray(array: number[], n1: number, n2: number) {
  const slices: number[][] = []
  for (let i = 0; i < array.length; i++) {
    if (array[i] === n1 || array[i] === n2) {
      const slice: number[] = []
      for (let j = i + 1; j < array.length; j++) {
        if (array[j] === n1 || array[j] === n2) {
          slices.push(slice)
          break
        } else
          slice.push(array[j])
      }
    }
  }
  return slices
}

console.log(sliceArray([1,2,3,4,5,4,3,2,1],1,4))

describe('Array slicing properties', () => {
  let seededGen: (seed: number) => () => number

  beforeEach(() =>
    seededGen = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  const slicesDontHaveValues = (slices: number[][], n1: number, n2: number): boolean => {
    for (const slice of slices)
      if (slice.includes(n1) || slice.includes(n2))
        return false
    return true
  }

  it('Slices don\'t contain any of the values', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll().withDefaultGraphs())
      .withGenerator(seededGen)
      .forall('arr', fc.array(fc.integer(-5,5), 0, 10))
      .forall('n1', fc.integer(-5,5))
      .forall('n2', fc.integer(-5,5))
      .then(({arr, n1, n2}) => slicesDontHaveValues(sliceArray(arr, n1, n2), n1, n2))
      .check()
    )
  })

  const getCombinedSize = (slices: number[][]): number => {
    let result = 0
    for (const slice of slices)
      result += slice.length
    return result
  }

  const getNumberOfValues = (array: number[], n1: number, n2: number): number => {
    let result = 0
    for (const n of array)
      if (n === n1 || n === n2)
        result++
    return result
  }

  const trimArray = (array: number[], n1: number, n2: number): number[] => {
    const indexes: number[] = []
    for (let i = 0; i < array.length; i++) {
      if (array[i] === n1 || array[i] === n2)
        indexes.push(i)
    }
    if (indexes.length > 1)
      return array.slice(indexes[0], indexes[indexes.length - 1] + 1)
    return []
  }

  it('Combined size of slices equals size of trimmed array without the values', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll().withDefaultGraphs())
      .withGenerator(seededGen)
      .forall('arr', fc.array(fc.integer(-5,5), 0, 10))
      .forall('n1', fc.integer(-5,5))
      .forall('n2', fc.integer(-5,5))
      .then(({arr, n1, n2}) => {
        const trimmedArr = trimArray(arr, n1, n2)
        return getCombinedSize(sliceArray(arr, n1, n2)) ===
        trimmedArr.length - getNumberOfValues(trimmedArr, n1, n2)
      })
      .check()
    )
  })

  it('Number of slices is the number of occurences of the values minus 1', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll().withDefaultGraphs())
      .withGenerator(seededGen)
      .forall('arr', fc.array(fc.integer(-5,5), 0, 10))
      .forall('n1', fc.integer(-5,5))
      .forall('n2', fc.integer(-5,5))
      .then(({arr, n1, n2}) => {
        let expectedNSlices = getNumberOfValues(arr, n1, n2) - 1
        if (expectedNSlices === -1)
          expectedNSlices = 0
        return sliceArray(arr, n1, n2).length === expectedNSlices
      })
      .check()
    )
  })
})
