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
      quickSort(items, left, index)
    if (index < right - 1)
      quickSort(items, index, right - 1)
  }
  return items
}

describe('QuickSort properties', () => {
  it('Property', () => {
    fc.expect(fc.scenario()
      .forall('a', fc.integer(-10,10))
      .then(({a}) => a === a)
      .check()
    )
  })
})
