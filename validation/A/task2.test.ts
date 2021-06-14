import * as fc from '../../src/index'
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
    if (index < right - 1)
      quickSort(items, index, right - 1)
  }
  return items
}

function quick_sort(items) {
  return quickSort(items, 0, items.length - 1)
}

describe('QuickSort properties', () => {
  let seededGen: (seed: number) => () => number

  beforeEach(() =>
    seededGen = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  it('Placeholder property', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll('quicksort_p1').withDefaultGraphs())    //displays information after a run and also generates csv and graphs
      .withGenerator(seededGen)
      .forall('a', fc.integer(-10,10))
      .then(({a}) => a === a)
      .check()
    )
  })
})
