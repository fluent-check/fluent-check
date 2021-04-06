import {FluentCheck} from './FluentCheck'
import {FluentStatisticianFactory} from './statistics/FluentStatisticianFactory'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory'
export {expect} from './FluentReporter'
export const scenario = () => new FluentCheck()
export const strategy = () => new FluentStrategyFactory()
export const statistics = () => new FluentStatisticianFactory()
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
} from './arbitraries'
