import { FluentCheck } from './index'
import { ArbitraryInteger, ArbitraryBoolean, ArbitraryReal, ArbitraryString, ArbitraryComposite } from './arbitraries'

/* TODO List
 * 
 * a. SUT
 * b. Chains
 * d. Configurable runnables (exhaustive, numRuns, etc..)
 * e. ~~Have our own arbitraries~~ (done for Integers, Booleans and Reals)
 * f. Estimate the confidence of the results (given certain boundaries) 
 * g. Types
 * h. Ensure Mocha Integration
 * i. README
 * j. ... after this is ready, mutations  
 */

new ArbitraryInteger(4, 6).shrink(5) //? 
new ArbitraryInteger(-10, 10).shrink(-5) //? 

new ArbitraryInteger(10, 20).shrink(15) //? 
new ArbitraryInteger(-20, -10).shrink(-15) //? 

new FluentCheck() 
    .exists('b', new ArbitraryInteger(-10, 10))
    .forall('a', new ArbitraryInteger())
    .then(({ a, b }) => (a * b) === a && (b * a) === a)
    .check() //?
