import * as espree from 'espree'
import {Arbitrary, FluentPick} from '../arbitraries'
import {FluentStrategy} from './FluentStrategy'

export type FluentStrategyArbitrary<A> = {
  pickNum: number
  arbitrary: Arbitrary<A>
  cache?: FluentPick<A>[]
  collection?: FluentPick<A>[]
}

export type FluentStrategyConfig = {
  sampleSize: number,
  shrinkSize?: number,
  globSource?: string,
  numericConstMaxRange?: number
  maxNumericConst?: number
  maxStringConst?: number
}

export type MixinConstructor<T = {}> = new (...args: any[]) => T
export type MixinStrategy = MixinConstructor<FluentStrategy>

export type StrategyArbitraries = Record<string, FluentStrategyArbitrary<any>>

export type StrategyExtractedConstants = Record<string, Array<any>>

export type Token = espree.Token
