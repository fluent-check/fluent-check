/**
 * Proof-of-concept: fc.pre() preconditions implementation
 * 
 * This demonstrates how in-body preconditions could be implemented
 * to skip test cases that don't meet criteria.
 */

import * as fc from '../../../src/index.js';

// Special error class for precondition failures
class PreconditionFailure extends Error {
  static readonly isPreconditionFailure = true;
  readonly isPreconditionFailure = true;
  
  constructor(message?: string) {
    super(message ?? 'Precondition not satisfied');
    this.name = 'PreconditionFailure';
  }
}

/**
 * Assert a precondition. If the condition is false, the current test case
 * is skipped (not counted as failure).
 * 
 * @param condition - The precondition to check
 * @param message - Optional message for debugging
 * @throws PreconditionFailure if condition is false
 * 
 * @example
 * fc.scenario()
 *   .forall('a', fc.integer())
 *   .forall('b', fc.integer())
 *   .then(({ a, b }) => {
 *     pre(b !== 0, 'divisor must be non-zero');
 *     return a / b * b + a % b === a;
 *   })
 *   .check();
 */
function pre(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new PreconditionFailure(message);
  }
}

// Helper to check if an error is a precondition failure
function isPreconditionFailure(error: unknown): error is PreconditionFailure {
  return error instanceof Error && 
         'isPreconditionFailure' in error && 
         (error as PreconditionFailure).isPreconditionFailure === true;
}

// Wrapper to handle preconditions in then() callbacks
function withPreconditions<R extends {}>(
  assertion: (args: R) => boolean
): (args: R) => boolean {
  return (args: R) => {
    try {
      return assertion(args);
    } catch (e) {
      if (isPreconditionFailure(e)) {
        // Skip this test case by returning true (vacuously satisfied)
        // In a real implementation, this would be tracked separately
        return true;
      }
      throw e;
    }
  };
}

// ============================================================================
// Usage Examples
// ============================================================================

console.log('\n=== Example 1: Division Property with Precondition ===');

// Without precondition (manual approach)
const manualResult = fc.scenario()
  .forall('a', fc.integer(-100, 100))
  .forall('b', fc.integer(-100, 100))
  .then(({ a, b }) => {
    if (b === 0) return true;  // Manual skip
    return a / b * b + a % b === a;
  })
  .check();
console.log('Manual skip approach:', manualResult.satisfiable ? 'PASSED' : 'FAILED');

// With precondition helper
const preResult = fc.scenario()
  .forall('a', fc.integer(-100, 100))
  .forall('b', fc.integer(-100, 100))
  .then(withPreconditions(({ a, b }) => {
    pre(b !== 0, 'divisor must be non-zero');
    return a / b * b + a % b === a;
  }))
  .check();
console.log('Precondition approach:', preResult.satisfiable ? 'PASSED' : 'FAILED');

// ============================================================================

console.log('\n=== Example 2: Array Index Property ===');

const arrayIndexResult = fc.scenario()
  .forall('arr', fc.array(fc.integer(), 0, 10))
  .forall('idx', fc.integer(0, 15))
  .then(withPreconditions(({ arr, idx }) => {
    pre(idx < arr.length, `index ${idx} must be less than array length ${arr.length}`);
    return arr[idx] === arr[idx];  // Trivial property
  }))
  .check();
console.log('Array index bounds:', arrayIndexResult.satisfiable ? 'PASSED' : 'FAILED');

// ============================================================================

console.log('\n=== Example 3: String Parsing Property ===');

const parseIntResult = fc.scenario()
  .forall('s', fc.string(0, 10))
  .then(withPreconditions(({ s }) => {
    pre(/^\d+$/.test(s), 'string must be numeric');
    const n = parseInt(s, 10);
    return n.toString() === s || s.startsWith('0');
  }))
  .check();
console.log('Numeric string parsing:', parseIntResult.satisfiable ? 'PASSED' : 'FAILED');

// ============================================================================

console.log('\n=== Example 4: Multiple Preconditions ===');

const multiPreResult = fc.scenario()
  .forall('a', fc.integer(-100, 100))
  .forall('b', fc.integer(-100, 100))
  .forall('c', fc.integer(-100, 100))
  .then(withPreconditions(({ a, b, c }) => {
    pre(a !== 0, 'a must be non-zero');
    pre(b !== 0, 'b must be non-zero');
    pre(c !== 0, 'c must be non-zero');
    pre(a !== b && b !== c && a !== c, 'all values must be distinct');
    
    // With all distinct non-zero values, test something interesting
    return (a * b * c) / a === b * c;
  }))
  .check();
console.log('Multiple preconditions:', multiPreResult.satisfiable ? 'PASSED' : 'FAILED');

// ============================================================================

console.log('\n=== Example 5: Precondition with Complex Object ===');

interface User {
  name: string;
  age: number;
  email: string;
}

const userArbitrary = fc.tuple(
  fc.string(1, 20),
  fc.integer(0, 150),
  fc.string(5, 50)
).map(([name, age, email]) => ({ name, age, email }));

const userResult = fc.scenario()
  .forall('user', userArbitrary)
  .then(withPreconditions(({ user }) => {
    pre(user.age >= 18, 'user must be adult');
    pre(user.email.includes('@'), 'email must contain @');
    
    // Only test adult users with valid emails
    return user.name.length > 0;
  }))
  .check();
console.log('User validation:', userResult.satisfiable ? 'PASSED' : 'FAILED');

console.log('\n=== All examples completed ===');

// ============================================================================
// Comparison Summary
// ============================================================================

/*
BEFORE (manual conditional):
  .then(({ a, b }) => {
    if (b === 0) return true;  // Skip
    return a / b * b + a % b === a;
  })

AFTER (explicit precondition):
  .then(({ a, b }) => {
    pre(b !== 0);
    return a / b * b + a % b === a;
  })

Benefits:
  - Clear intent: "this is a precondition, not part of the property"
  - Debugging: error messages explain why cases are skipped
  - Statistics: can track skip rate (in full implementation)
  - Composition: multiple preconditions are readable
*/

export { pre, withPreconditions, PreconditionFailure, isPreconditionFailure };
