import { ArbitrarySize, FluentPick } from './types'
<<<<<<< HEAD
import { Arbitrary } from './internal'

export const NoArbitrary: Arbitrary<never> = new class extends Arbitrary<never> {
=======
import { BaseArbitrary } from './internal'

export const NoArbitrary: BaseArbitrary<any> = new class extends BaseArbitrary<any> {
>>>>>>> 24cfe80b5f6c30f43635541484c7cd49646eaf8e
  size(): ArbitrarySize { return { value: 0, type: 'exact' } }
  sampleWithBias(): FluentPick<never>[] { return [] }
  sample(): FluentPick<never>[] { return [] }
  map(_: (a: never) => any) { return NoArbitrary }
  filter(_: (a: never) => boolean) { return NoArbitrary }
  unique() { return NoArbitrary }
<<<<<<< HEAD
  canGenerate(_: FluentPick<never>) { return false }
}()
=======
  canGenerate(_: FluentPick<never[]>) { return false }
}()
>>>>>>> 24cfe80b5f6c30f43635541484c7cd49646eaf8e
