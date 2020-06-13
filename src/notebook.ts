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
      .forall('n', new ArbitraryInteger(5, 100))
      .given('a', () => new ArbitraryInteger(0, 50))
      .then(({n, a}) => a.sample(n).includes(0))
      .and(({n, a}) => a.sample(n).includes(50))
      .check() //?

new ArbitraryInteger(0, 50).sample(5) //?