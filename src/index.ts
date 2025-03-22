import {FluentCheck} from './FluentCheck.js'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory.js'
export {expect} from './FluentReporter.js'
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
  oneof
} from './arbitraries/index.js'
