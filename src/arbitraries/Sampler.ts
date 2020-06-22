import { FluentPick } from './types'
import { duplicatesProbability, reservoirSampling } from '../sampling'

export interface Sampling<A> {
  sample(sampleSize: number): FluentPick<A>[]
}

export class SamplingWithReplacement<A> implements Sampling<A> {
  constructor(public readonly next: () => FluentPick<A> | undefined) {}

  sample(sampleSize: number): FluentPick<A>[] {
    const result: FluentPick<A>[] = []
    for (let i = 0; i < sampleSize; i += 1) {
      const pick = this.next()
      if (pick) result.push(pick)
      else break
    }
    return result
  }
}

export class SamplingWithoutReplacement<A> implements Sampling<A> {
  constructor(public readonly size: number, public readonly access: (idx: number) => FluentPick<A>) {}

  sample(sampleSize: number): FluentPick<A>[] {
    return reservoirSampling(sampleSize, this.size, this.access)
  }
}

export class HybridSampling<A> implements Sampling<A> {
  constructor(
    public readonly size: number,
    public readonly next: () => FluentPick<A> | undefined,
    public readonly access: (idx: number) => FluentPick<A>) {}

  sample(sampleSize: number): FluentPick<A>[] {
    if (sampleSize === 0) return []

    const shouldSampleWithReplacement =
      this.size >= Number.MAX_SAFE_INTEGER ||
      duplicatesProbability(sampleSize, this.size) <= 0.01

    const sampler = shouldSampleWithReplacement ?
      new SamplingWithReplacement(this.next) :
      new SamplingWithoutReplacement(this.size, this.access)

    return sampler.sample(sampleSize)
  }
}
