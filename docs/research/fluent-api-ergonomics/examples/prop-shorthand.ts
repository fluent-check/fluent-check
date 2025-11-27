/**
 * Proof-of-concept: fc.prop() shorthand implementation
 * 
 * This demonstrates how a simplified entry point for property testing
 * could be implemented without breaking the existing API.
 */

import * as fc from '../../../src/index.js';

// Type definitions for the shorthand API
interface FluentProperty<Rec extends {} = {}> {
  check(): fc.FluentResult<Rec>;
  assert(): void;
  config(strategy: ReturnType<typeof fc.strategy>): FluentProperty<Rec>;
}

// Implementation for single arbitrary
function prop<A>(
  arb: fc.Arbitrary<A>,
  property: (a: A) => boolean
): FluentProperty<{ a: A }>;

// Implementation for two arbitraries
function prop<A, B>(
  arbA: fc.Arbitrary<A>,
  arbB: fc.Arbitrary<B>,
  property: (a: A, b: B) => boolean
): FluentProperty<{ a: A; b: B }>;

// Implementation for three arbitraries
function prop<A, B, C>(
  arbA: fc.Arbitrary<A>,
  arbB: fc.Arbitrary<B>,
  arbC: fc.Arbitrary<C>,
  property: (a: A, b: B, c: C) => boolean
): FluentProperty<{ a: A; b: B; c: C }>;

// Unified implementation
function prop(...args: unknown[]): FluentProperty {
  const arbitraries = args.slice(0, -1) as fc.Arbitrary<unknown>[];
  const property = args[args.length - 1] as (...vals: unknown[]) => boolean;
  
  let strategyFactory = fc.strategy();
  
  const createScenario = () => {
    let scenario = fc.scenario().config(strategyFactory);
    const names = ['a', 'b', 'c', 'd', 'e'];
    
    for (let i = 0; i < arbitraries.length; i++) {
      scenario = scenario.forall(names[i], arbitraries[i]) as any;
    }
    
    return scenario.then((args: Record<string, unknown>) => {
      const values = names.slice(0, arbitraries.length).map(n => args[n]);
      return property(...values);
    });
  };
  
  return {
    check: () => createScenario().check(),
    
    assert: function() {
      const result = this.check();
      if (!result.satisfiable) {
        const example = JSON.stringify(result.example, null, 2);
        throw new Error(`Property failed!\n\nCounterexample:\n${example}\n\nSeed: ${result.seed}`);
      }
    },
    
    config: function(strategy) {
      strategyFactory = strategy;
      return this;
    }
  };
}

// ============================================================================
// Usage Examples
// ============================================================================

// Example 1: Simple property (current vs proposed)
console.log('\n=== Example 1: Integer Identity ===');

// Current verbose way
const currentResult = fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 0 === x)
  .check();
console.log('Current style result:', currentResult.satisfiable);

// Proposed shorthand
const shorthandResult = prop(fc.integer(), x => x + 0 === x).check();
console.log('Shorthand style result:', shorthandResult.satisfiable);

// Example 2: Two arbitraries - commutativity
console.log('\n=== Example 2: Addition Commutativity ===');

prop(
  fc.integer(-1000, 1000),
  fc.integer(-1000, 1000),
  (a, b) => a + b === b + a
).assert();
console.log('Commutativity: PASSED');

// Example 3: Three arbitraries - associativity
console.log('\n=== Example 3: Addition Associativity ===');

prop(
  fc.integer(-100, 100),
  fc.integer(-100, 100),
  fc.integer(-100, 100),
  (a, b, c) => (a + b) + c === a + (b + c)
).assert();
console.log('Associativity: PASSED');

// Example 4: Array property
console.log('\n=== Example 4: Array Reverse Identity ===');

prop(
  fc.array(fc.integer(-100, 100), 0, 10),
  xs => {
    const reversed = [...xs].reverse().reverse();
    return xs.length === reversed.length && 
           xs.every((x, i) => x === reversed[i]);
  }
).assert();
console.log('Double reverse identity: PASSED');

// Example 5: With strategy configuration
console.log('\n=== Example 5: With Strategy Config ===');

prop(fc.integer(1, 100), x => x > 0)
  .config(fc.strategy().withRandomSampling().withShrinking())
  .assert();
console.log('Positive integers: PASSED');

// Example 6: Failing property (demonstrates error message)
console.log('\n=== Example 6: Failing Property (expected) ===');

try {
  prop(fc.integer(), x => x > 0).assert();
  console.log('This should not be reached');
} catch (e) {
  console.log('Caught expected failure:');
  console.log((e as Error).message.split('\n')[0]);
}

console.log('\n=== All examples completed ===');

// ============================================================================
// Comparison Summary
// ============================================================================

/*
BEFORE (verbose):
  expect(fc.scenario()
    .forall('x', fc.integer())
    .then(({ x }) => x + 0 === x)
    .check()
  ).to.have.property('satisfiable', true);

AFTER (shorthand):
  prop(fc.integer(), x => x + 0 === x).assert();

Reduction:
  - Lines: 5 → 1 (80% reduction)
  - Method calls: 4 → 2 (50% reduction)
  - Characters: ~120 → ~45 (62% reduction)
*/
