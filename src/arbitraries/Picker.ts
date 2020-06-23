import { FluentPick } from './types'
import { duplicatesProbability, reservoirSampling } from '../sampling'

export class Picker<A> {
  constructor(public readonly pick: () => FluentPick<A> | undefined) {}

  sample(sampleSize: number): FluentPick<A>[] {
    return this.sampleWithReplacement(sampleSize)
  }

  sampleWithReplacement(sampleSize: number): FluentPick<A>[] {
    const result: FluentPick<A>[] = []
    for (let i = 0; i < sampleSize; i += 1) {
      const pick = this.pick()
      if (pick) result.push(pick)
      else break
    }
    return result
  }

  map<B>(f: (pick: FluentPick<A>) => FluentPick<B>): Picker<B> {
    return new Picker(() => {
      const pick = this.pick()
      return pick ? f(pick) : undefined
    })
  }
}

export class IndexedPicker<A> extends Picker<A> {
  constructor(public readonly size: number, public readonly pickWithIndex: (idx: number) => FluentPick<A>) {
    super(size === 0 ? () => undefined : () => pickWithIndex(Math.floor(Math.random() * this.size)))
  }

  sample(sampleSize: number): FluentPick<A>[] {
    if (sampleSize === 0) return []

    const shouldSampleWithReplacement =
      this.size >= Number.MAX_SAFE_INTEGER ||
      duplicatesProbability(sampleSize, this.size) <= 0.01

    return shouldSampleWithReplacement ?
      this.sampleWithReplacement(sampleSize) :
      this.sampleWithoutReplacement(sampleSize)
  }

  sampleWithoutReplacement(sampleSize: number): FluentPick<A>[] {
    return reservoirSampling(sampleSize, this.size, this.pickWithIndex)
  }

  map<B>(f: (pick: FluentPick<A>) => FluentPick<B>): IndexedPicker<B> {
    return new IndexedPicker(this.size, idx => f(this.pickWithIndex(idx)))
  }
}
