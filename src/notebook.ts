import { FluentCheck } from './index'
import { ArbitraryInteger, ArbitraryBoolean, ArbitraryReal, ArbitraryString, ArbitraryComposite } from './arbitraries'

class Stack<T> {
    elements: Array<T> = []

    push = (e: T) => { this.elements.push(e) }
    pop = () => { return this.elements.pop() }
    size = () => { return this.elements.length }
}

/* TODO List
 * 
 * - Chains
 * - Configurable runnables (exhaustive, numRuns, etc..)
 * - ~~Have our own arbitraries~~ (done for Integers, Booleans, Strings, Composite, and Reals)
 * - Estimate the confidence of the results (given certain boundaries) 
 * - Types
 * - README
 * - ... after this is ready, mutations  
 */

new FluentCheck() 
    .given('sut', () => 1)
    .exists('a', new ArbitraryInteger(1))
    .then(({ a, sut }) => a == sut)
    .check() //?
  
new FluentCheck()
    .given('sut', 1)
    .exists('a', new ArbitraryInteger(1))
    .then(({ a, sut }) => a == sut)
    .check() //?

new FluentCheck()
    .given('sut', () => ({ x: 0 }))
    .when(({ sut }) => sut.x += 1)
    .exists('a', new ArbitraryInteger(1, 1000))
    .then(({ a, sut }) => a == sut.x)
    .check() //?
        
new FluentCheck()
    .exists('e', new ArbitraryInteger())
    .given('stack', () => new Stack<number>())
    .when(({ e, stack }) => stack.push(e))
    .then(({ stack }) => stack.size() == 1)
    .check() //?
    
    