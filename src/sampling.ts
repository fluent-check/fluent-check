import stats from 'jstat'

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Calculates the probability of seeing duplicate elements in a sample with replacement of size
 * `sampleSize` from a population of size `popSize`.
 */
export function duplicatesProbability(sampleSize: number, popSize: number): number {
  if (sampleSize > popSize) return 1.0
  if (sampleSize <= 1) return 0.0
  return 1.0 - Math.exp(
    stats.factorialln(popSize) -
    stats.factorialln(popSize - sampleSize) -
    sampleSize * Math.log(popSize)
  )
}

/**
 * Returns a simple random sample without replacement of size `sampleSize` from a population of
 * size `populationSize`.
 *
 * This is an implementation of Algorithm L, a reservoir sampling algorithm that runs in
 * O(sampleSize * (1 + log(popSize / sampleSize))) time.
 */
export function reservoirSampling<T>(sampleSize: number, popSize: number, access: (idx: number) => T): T[] {
  sampleSize = Math.min(sampleSize, popSize)
  const r = [...Array(sampleSize)].map((_, i) => access(i))

  let w = Math.exp(Math.log(Math.random()) / sampleSize)
  for (let i = sampleSize; i < popSize;) {
    i += Math.floor(Math.log(Math.random()) / Math.log(1 - w)) + 1
    if (i < popSize) {
      r[randomInt(0, sampleSize - 1)] = access(i)
      w *= Math.exp(Math.log(Math.random()) / sampleSize)
    }
  }
  return r
}
