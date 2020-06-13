import { FluentCheck } from './index'
import { ArbitraryInteger, ArbitraryBoolean, ArbitraryReal, ArbitraryString, ArbitraryComposite, ArbitraryCollection } from './arbitraries'

/* TODO List
 * 
 * - Separate tests into categories
 * - Chains
 * - Configurable runnables (exhaustive, numRuns, etc..)
 * - ~~Have our own arbitraries~~ (done for Integers, Booleans, Strings, Composite, and Reals)
 * - Estimate the confidence of the results (given certain boundaries) 
 * - Types
 * - README
 * - ... after this is ready, mutations  
 * - ... and then meta-PBT
 */

new FluentCheck()
    .forall('s', new ArbitraryString())
    .chain('a', ({s}) => new ArbitraryInteger(0, s.length))
    .chain('b', ({s, a}) => new ArbitraryInteger(a, s.length))
    .then(({ s, a, b }) => s.includes(s.substring(a, b)))
    .then(({ a, b }) => b >= a)
    .check() //?

new FluentCheck()
    .forall('s1', new ArbitraryString())
    .forall('s2', new ArbitraryString())
    .chain('a', ({s1}) => new ArbitraryInteger(0, s1.length))
    .chain('b', ({s2}) => new ArbitraryInteger(0, s2.length))
    .then(({ s1, s2, a, b }) => s1.length + s2.length >= a + b)
    .check() //?