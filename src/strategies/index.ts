import {FluentStrategyTypeFactory} from './FluentStrategyFactory'

const RANDOM = () => new FluentStrategyTypeFactory()
  .withRandomSampling()
  .withoutReplacement()
  .usingCache()

export const PBT_R_S1 = RANDOM()
export const PBT_R_S2 = RANDOM().withBias()
export const PBT_R_S3 = RANDOM().withConstantExtraction({globSource: process.env.FLUENT_CHECK_EXTRACTION_PATH ?? ''})
export const PBT_R_S4 = RANDOM().withPairWiseTesting()
export const PBT_R_S5 = RANDOM()
  .withBias()
  .withConstantExtraction({globSource: process.env.FLUENT_CHECK_EXTRACTION_PATH ?? ''})
export const PBT_R_S6 = RANDOM().withBias().withPairWiseTesting()
export const PBT_R_S7 = RANDOM()
  .withConstantExtraction({globSource: process.env.FLUENT_CHECK_EXTRACTION_PATH ?? ''})
  .withPairWiseTesting()
export const PBT_R_S8 = RANDOM().withBias()
  .withConstantExtraction({globSource: process.env.FLUENT_CHECK_EXTRACTION_PATH ?? ''})
  .withPairWiseTesting()

const COVERAGE_GUIDED = () => new FluentStrategyTypeFactory()
  .withCoverageGuidance(process.env.FLUENT_CHECK_SPECIFICATION_PATH ?? 'test')
  .withoutReplacement()
  .usingCache()
  .withTimeout(2000)

export const PBT_CG_S1 = COVERAGE_GUIDED()
export const PBT_CG_S2 = COVERAGE_GUIDED().withBias()
export const PBT_CG_S3 = COVERAGE_GUIDED()
  .withConstantExtraction({globSource: process.env.FLUENT_CHECK_EXTRACTION_PATH ?? ''})
export const PBT_CG_S4 = COVERAGE_GUIDED().withPairWiseTesting()
export const PBT_CG_S5 = COVERAGE_GUIDED()
  .withBias()
  .withConstantExtraction({globSource: process.env.FLUENT_CHECK_EXTRACTION_PATH ?? ''})
export const PBT_CG_S6 = COVERAGE_GUIDED().withBias().withPairWiseTesting()
export const PBT_CG_S7 = COVERAGE_GUIDED()
  .withConstantExtraction({globSource: process.env.FLUENT_CHECK_EXTRACTION_PATH ?? ''})
  .withPairWiseTesting()
export const PBT_CG_S8 = COVERAGE_GUIDED().withBias()
  .withConstantExtraction({globSource: process.env.FLUENT_CHECK_EXTRACTION_PATH ?? ''})
  .withPairWiseTesting()

/**
 * Returns the configuration matching the configuration identifier.
 */
export function getConfiguration(config: string | undefined = undefined) {
  if (config === undefined) return PBT_R_S1
  else if (config.includes('S1')) return config.includes('R') ? PBT_R_S1 : PBT_CG_S1
  else if (config.includes('S2')) return config.includes('R') ? PBT_R_S2 : PBT_CG_S2
  else if (config.includes('S3')) return config.includes('R') ? PBT_R_S3 : PBT_CG_S3
  else if (config.includes('S4')) return config.includes('R') ? PBT_R_S4 : PBT_CG_S4
  else if (config.includes('S5')) return config.includes('R') ? PBT_R_S5 : PBT_CG_S5
  else if (config.includes('S6')) return config.includes('R') ? PBT_R_S6 : PBT_CG_S6
  else if (config.includes('S7')) return config.includes('R') ? PBT_R_S7 : PBT_CG_S7
  else return config.includes('R') ? PBT_R_S8 : PBT_CG_S8
}
