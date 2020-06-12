import { FluentCheck } from './index'
import { ArbitraryInteger, ArbitraryBoolean, ArbitraryReal, ArbitraryString } from './arbitraries'

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

new FluentCheck() 
    .forall('a', new ArbitraryInteger(-10, 10))
    .exists('b', new ArbitraryInteger(-10, 10))
    .then(({ a, b }) => a + b == 0)
    .check() //?. $

new FluentCheck()
    .forall('a', new ArbitraryInteger(-10, 10))
    .exists('b', new ArbitraryInteger(-100, 100))
    .then(({ a, b }) => a * b == 0)
    .check() //?. $

new FluentCheck() 
    .exists('b', new ArbitraryInteger(-10, 10))
    .forall('a', new ArbitraryInteger())
    .then(({ a, b }) => (a * b) === a && (b * a) === a)
    .check()  //?. $

new FluentCheck()
    .exists('b', new ArbitraryInteger(-10, 10))
    .forall('a', new ArbitraryInteger())
    .then(({ a, b }) => (a + b) === a && (b + a) === a)
    .check()  //?. $

new FluentCheck() 
    .forall('a', new ArbitraryInteger())
    .forall('b', new ArbitraryInteger())
    .then(({ a, b }) => (a + b) === (b + a))
    .check()  //?. $ 

new FluentCheck() 
    .forall('a', new ArbitraryInteger())
    .forall('b', new ArbitraryInteger())
    .then(({ a, b }) => (a - b) === (b - a))
    .check()  //?. $

new FluentCheck()
    .forall('a', new ArbitraryInteger())
    .exists('b', new ArbitraryInteger(-500, 500))
    .then(({ a, b }) => a * b == 0)
    .check() //?. $

new FluentCheck()
    .exists('a', new ArbitraryInteger())
    .forall('b', new ArbitraryInteger(-100, 100))
    .then(({ a, b }) => a > b)
    .check() //?. $
    
new FluentCheck()
    .exists('a', new ArbitraryBoolean())
    .exists('b', new ArbitraryBoolean())
    .then(({ a, b }) => (a && b))
    .check() //?. $

new FluentCheck()
    .exists('b', new ArbitraryBoolean())
    .forall('a', new ArbitraryBoolean())
    .then(({ a, b }) => (a && b))
    .check() //?. $

new FluentCheck()
    .forall('a', new ArbitraryBoolean())
    .then(({ a }) => !(a ^ a))
    .check() //?. $

new FluentCheck()
    .forall('a', new ArbitraryBoolean())
    .then(({ a }) => a || !a)
    .check() //?. $

new FluentCheck()
    .forall('a', new ArbitraryInteger(5, 10))
    .exists('b', new ArbitraryInteger(1, 2))
    .then(({ a, b }) => a + b == 0)
    .check() //?. $

new FluentCheck()
    .exists('a', new ArbitraryReal())
    .forall('b', new ArbitraryReal())
    .then(({ a, b }) => a * b == 0)
    .check() //?. $

new FluentCheck()
    .exists('a', new ArbitraryInteger())
    .then(({ a }) => a + 1000 > a)
    .check() //?. $ 

new FluentCheck()
    .forall('a', new ArbitraryString())
    .forall('b', new ArbitraryString())
    .then(({ a, b }) => a.length + b.length === (a + b).length)
    .check() //?. $

new FluentCheck()
    .exists('a', new ArbitraryString())
    .then(({ a }) => a.length  === 5)
    .check() //?. $