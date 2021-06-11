import * as fc from '../src/index'
import {it} from 'mocha'

function sliceArray(array: number[], n1: number, n2: number) {
  const slices: number[][] = []
  for (let i = 0; i < array.length; i++) {
    if (i === 0 || array[i] === n1 || array[i] === n2) {
      const slice: number[] = []
      if (i === 0 && array[i] !== n1 && array[i] !== n2)
        slice.push(array[i])
      if (i === array.length - 1 && slice.length > 0)
        slices.push(slice)
      for (let j = i + 1; j < array.length; j++) {
        if (array[j] === n1 || array[j] === n2 || j === array.length - 1) {
          if (j === array.length - 1 && array[j] !== n1 && array[j] !== n2)
            slice.push(array[j])
          if (slice.length > 0)
            slices.push(slice)
          break
        } else
          slice.push(array[j])
      }
    }
  }
  return slices
}

console.log(sliceArray([7,1,2,3,4,4,5,4,3,2,1],1,4))

describe('Array slicing properties', () => {
  let seededGen: (seed: number) => () => number

  beforeEach(() =>
    seededGen = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

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

  it('Combined size of slices equals size of array without the values', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll().withDefaultGraphs())
      .withGenerator(seededGen)
      .forall('arr', fc.array(fc.integer(-5,5), 0, 10))
      .forall('n1', fc.integer(-5,5))
      .forall('n2', fc.integer(-5,5))
      .then(({arr, n1, n2}) =>
        getCombinedSize(sliceArray(arr, n1, n2)) === arr.length - getNumberOfValues(arr, n1, n2)
      )
      .check()
    )
  })

  const slicesHaveOtherValues = (arr: number[], slices: number[][], n1: number, n2: number): boolean => {
    let next = -1
    let slice = 0
    let j = 0
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== n1 && arr[i] !== n2) {
        next = i
        if (arr[i] !== slices[slice][j])
          return false
        j++
      } else if (next > -1) {
        slice++
        j = 0
        next = -1
      }
    }
    return true
  }

  it('Slices contain other values in order', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll().withDefaultGraphs())
      .withGenerator(seededGen)
      .forall('arr', fc.array(fc.integer(-5,5), 0, 10))
      .forall('n1', fc.integer(-5,5))
      .forall('n2', fc.integer(-5,5))
      .then(({arr, n1, n2}) => slicesHaveOtherValues(arr, sliceArray(arr, n1, n2), n1, n2))
      .check()
    )
  })
})
