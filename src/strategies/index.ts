import {FluentStrategy} from './FluentStrategy'
import {Random, Dedupable, Biased, Cacheable, Shrinkable} from './FluentStrategyMixins'

export const RandomCachedStrategy = Cacheable(Dedupable(Random(FluentStrategy)))

export const RandomCachedStrategyWithShrinking = Shrinkable(Cacheable(Dedupable(Random(FluentStrategy))))

export const BiasedRandomCachedStrategy = Cacheable(Biased(Dedupable(Random(FluentStrategy))))

export const BiasedRandomCachedStrategyWithShrinking = Shrinkable(Cacheable(Biased(Dedupable(Random(FluentStrategy)))))
