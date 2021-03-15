
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
