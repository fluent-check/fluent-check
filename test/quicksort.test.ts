import * as fc from '../src/index'
import {it} from 'mocha'

function swap(items, leftIndex, rightIndex) {
  const temp = items[leftIndex]
  items[leftIndex] = items[rightIndex]
  items[rightIndex] = temp
}

function partition(items, left, right) {
  const pivot = items[Math.floor((right + left) / 2)]
  let i = left
  let j = right
  while (i <= j) {
    while (items[i] < pivot)
      i++
    while (items[j] > pivot)
      j--
    if (i <= j) {
      swap(items, i, j)
      i++
      j--
    }
  }
  return i
}

function quickSort(items, left, right) {
  if (items.length > 1) {
    const index = partition(items, left, right)
    if (left < index - 1)
      quickSort(items, left, index - 1)
    if (index < right)
      quickSort(items, index, right)
  }
  return items
}

console.log(quickSort([7,8,7,0,5,4,3,2,1,6], 0, 9))  //for no lint errors

describe('QuickSort properties', () => {
  let seededGen: (seed: number) => () => number

  beforeEach(() =>
    seededGen = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )
  /*
  it('Property', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll().withDefaultGraphs())
      .withGenerator(seededGen)
      .forall('a', fc.integer(-10,10))
      .then(({a}) => a === a)
      .check()
    )
  })
  */
  const isSorted = (arr: number[]) => {
    if (arr.length <= 1)
      return true
    return arr[0] <= arr[1] && isSorted(arr.slice(1, arr.length))
  }

  it('Sorted array is sorted', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll())
      .withGenerator(seededGen)
      .forall('a', fc.array(fc.integer(-10,10), 0, 5))
      .then(({a}) => isSorted(quickSort(a, 0, a.length - 1)))
      .check()
    )
  })

  it('Sorted array has same size as original', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll())
      .withGenerator(seededGen)
      .forall('a', fc.array(fc.integer(-10,10), 0, 5))
      .then(({a}) => quickSort(a, 0, a.length - 1).length === a.length)
      .check()
    )
  })

  const eqSet = (as: Set<number>, bs: Set<number>) => {
    if (as.size !== bs.size)
      return false
    for (const a of as)
      if (!bs.has(a))
        return false
    return true
  }

  it('Sorted array constains same elements as original', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll())
      .withGenerator(seededGen)
      .forall('a', fc.array(fc.integer(-10,10), 0, 5))
      .then(({a}) => eqSet(new Set(a), new Set(quickSort(a, 0, a.length - 1))))
      .check()
    )
  })
})
