import * as fc from '../../index'

/**
 * Counts and returns the number of decimal cases of a given number.
 */
export function countDecimals(value: number): number {
  return Math.floor(value) === value ? 0 : value.toString().split('.')[1].length || 0
}

/**
 * Returns the values' range for a given max and min value.
 */
export function computeRange(range: number[]) {
  const rangesDiff = +(range[1] - range[0]).toFixed(Math.max(countDecimals(range[1]), countDecimals(range[0])))
  return rangesDiff * (10 ** countDecimals(rangesDiff)) + 1
}

/**
 * Builds an array containing sequential values from a given min to a given max with an increment that considers the
 * number of decimal cases of the numbers involved.
 */
export function buildSequentialArray(range: number[]) {
  const maxDecimalCases = Math.max(countDecimals(range[1]), countDecimals(range[0]))
  const rangesDiff = +(range[1] - range[0]).toFixed(maxDecimalCases)
  const arrayLength = rangesDiff * (10 ** countDecimals(rangesDiff)) + 1

  const result: number[] = []
  let acc = 0
  let index = 0

  while (index++ < arrayLength) {
    result.push(+(range[0] + acc).toFixed(maxDecimalCases))
    acc = +(acc + (1 / (10 ** maxDecimalCases))).toFixed(maxDecimalCases)
  }

  return result
}

/**
 * Builds an array containing a given string <data> and a series of simple mutations applied to that same string. Apart
 * the mutations it also divides the string in two substrings with half of the size of the original string.
 */
export function manipulateString(data: string, numMutations: number): string[] {
  const result = [data, data.slice(0, Math.floor(data.length / 2)),
    data.slice(Math.floor(data.length / 2), data.length)]

  while (numMutations-- > 0) {
    switch (Math.floor(Math.random() * 3)) {
      case 0: // Insert
        result.push(Math.round(Math.random()) === 0 ? data.padStart(1, fc.char().pick()!.value) :
          data.padEnd(1, fc.char().pick()!.value))
        break
      case 1: // Replace
        result.push(data.replace(data.charAt(Math.random() * data.length), fc.char().pick()!.value))
        break
      default: // Delete
        result.push(data.replace(data.charAt(Math.random() * data.length), ''))
        break
    }
  }

  return result
}
