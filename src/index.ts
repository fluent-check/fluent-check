import { FluentCheck, FluentConfig } from './FluentCheck'
export const scenario = () => new FluentCheck()
export { integer, real, nat, string, array, union, boolean, empty, constant, set, tuple, oneof } from './arbitraries'
