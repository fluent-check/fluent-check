import * as espree from 'espree'
import {Arbitrary, FluentPick} from '../arbitraries'
import {FluentStrategy} from './FluentStrategy'
import * as libCoverage from 'istanbul-lib-coverage'

export type MixinConstructor<T = {}> = new (...args: any[]) => T
export type MixinStrategy = MixinConstructor<FluentStrategy>

export type StrategyArbitraries = Record<string, FluentStrategyArbitrary<any>>
export type StrategyExtractedConstants = Record<string, Array<any>>

export type Token = espree.Token

export type FileCoverage = libCoverage.FileCoverage
export type CoverageSummary = libCoverage.CoverageSummary

export type FluentStrategyArbitrary<A> = {
  arbitrary: Arbitrary<A>
  cache?: FluentPick<A>[]
  collection: FluentPick<A>[]
  seedCollection: FluentPick<A>[]
}

export type FluentStrategyConfig = {
  globSource: string
  pairwise: boolean
  shrinkSize: number
  sampleSize: number
  maxNumConst: number
  maxNumMutations: number
  importsPath: string
  coveragePercentage: number
  timeout: number
  maxNumTestCases: number
}

export type ConstantExtractionConfig = {
  globSource?: string,
  maxNumConst?: number
  numericConstMaxRange?: number
  maxStringTransformations?: number
}
