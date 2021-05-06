import {FluentStrategyTypeFactory} from './FluentStrategyFactory'

export const PBTS1 = new FluentStrategyTypeFactory()
  .withRandomSampling()
  .withoutReplacement()
  .withShrinking()
  .usingCache()
  .withBias()

export const PBTS2 = new FluentStrategyTypeFactory()
  .withRandomSampling()
  .withoutReplacement()
  .withShrinking()
  .usingCache()
