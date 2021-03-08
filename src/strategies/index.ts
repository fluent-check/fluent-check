import {FluentStrategy} from './FluentStrategy'
import {Random, Dedupable, Biased, Cached, Shrinkable} from './FluentStrategyMixins'

export const RandomCachedStrategy = Cached(Dedupable(Random(FluentStrategy)))

export const RandomCachedStrategyWithShrinking = Shrinkable(Cached(Dedupable(Random(FluentStrategy))))

export const BiasedRandomCachedStrategy = Cached(Biased(Dedupable(Random(FluentStrategy))))

export const BiasedRandomCachedStrategyWithShrinking = Shrinkable(Cached(Biased(Dedupable(Random(FluentStrategy)))))
