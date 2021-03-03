import {FluentStrategy, Random, Dedupable, Biased, Cacheable, Shrinkable} from './FluentStrategy'

export const BiasedRandomCachedStrategyWithShrinking = Shrinkable(Cacheable(Biased(Dedupable(Random(FluentStrategy)))))
