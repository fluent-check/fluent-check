import { ArbitrarySize, FluentPick } from './types'
import { BaseArbitrary } from './internal'

export const NoArbitrary: BaseArbitrary<never> = new class extends BaseArbitrary<never> {
  size(): ArbitrarySize { return { value: 0, type: 'exact' } }
  sampleWithBias(): FluentPick<never>[] { return [] }
  sample(): FluentPick<never>[] { return [] }
  map(_: (a: never) => any) { return NoArbitrary }
  filter(_: (a: never) => boolean) { return NoArbitrary }
  unique() { return NoArbitrary }
}()
