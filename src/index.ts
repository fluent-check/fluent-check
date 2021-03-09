import {FluentCheck} from './FluentCheck'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory'
export const scenario = () => new FluentCheck()
export const strategy = () => new FluentStrategyFactory()
export {integer, real, nat, string, array, union, boolean, empty, constant, set, tuple, oneof} from './arbitraries'
