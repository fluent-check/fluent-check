import {FluentStrategy} from './FluentStrategy'
import {Random, Dedupable, Biased, Cacheable, Shrinkable} from './FluentStrategyMixins'

export const BiasedRandomCachedStrategyWithShrinking = Shrinkable(Cacheable(Biased(Dedupable(Random(FluentStrategy)))))
