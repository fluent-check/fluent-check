/**
 * Counts and returns the number of decimal cases of a given number.
 */
export function countDecimals(value: number): number {
  return Math.floor(value) === value ? 0 : value.toString().split('.')[1].length || 0
}
