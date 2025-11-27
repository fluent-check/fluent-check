import {FluentCheck, pre, PreconditionFailure} from './FluentCheck.js'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory.js'
import type { ArbitrarySize } from './arbitraries/types.js'
export {expect} from './FluentReporter.js'
export {pre, PreconditionFailure}
export {prop} from './FluentProperty.js'
export type {FluentProperty} from './FluentProperty.js'
export const scenario = () => new FluentCheck()
export const strategy = () => new FluentStrategyFactory()
export {
  integer,
  real,
  nat,
  char,
  hex,
  base64,
  ascii,
  unicode,
  string,
  array,
  union,
  boolean,
  empty,
  constant,
  set,
  tuple,
  oneof,
  date,
  time,
  datetime,
  duration,
  timeToMilliseconds,
  regex,
  patterns,
  shrinkRegexString,
  // Presets
  positiveInt,
  negativeInt,
  nonZeroInt,
  byte,
  nonEmptyString,
  nonEmptyArray,
  pair,
  nullable,
  optional,
  ArbitrarySize
} from './arbitraries/index.js'
