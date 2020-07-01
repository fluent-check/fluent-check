import { FluentCheck, FluentConfig } from './FluentCheck'
export const scenario = (config: FluentConfig = {}) => new FluentCheck(undefined, config)
export { integer, real, nat, string, array, union, boolean, empty, constant, set, tuple, oneof } from './arbitraries'
