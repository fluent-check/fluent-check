import { FluentCheck } from './FluentCheck'
export const scenario = () => new FluentCheck()
export { integer, real, nat, string, array, union, boolean, empty, constant } from './arbitraries'
