/**
 * Example: Confidence-Based Testing
 * 
 * This example demonstrates how to use confidence-based termination
 * to run tests until a specified level of statistical confidence is achieved.
 */

import * as fc from 'fluent-check'

// Example 1: Basic confidence-based testing
// -----------------------------------------
// Run tests until 99% confident the property holds

const basicConfidence = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .checkWithConfidence(0.99)

console.log('Basic Confidence Test:')
console.log('  Tests run:', basicConfidence.statistics.testsRun)
console.log('  Confidence:', (basicConfidence.statistics.confidence! * 100).toFixed(2) + '%')
console.log('  Credible interval:', basicConfidence.statistics.credibleInterval)

// Expected output:
// Tests run: ~4600 (varies based on confidence achieved)
// Confidence: 99.01%
// Credible interval: [0.9978, 1.0000]


// Example 2: High confidence for critical systems
// -----------------------------------------------
// For mission-critical code, require very high confidence

const criticalTest = fc.scenario()
  .config(fc.strategy()
    .withConfidence(0.9999)        // 99.99% confidence
    .withMaxIterations(100000))    // Cap at 100k tests
  .forall('a', fc.integer())
  .forall('b', fc.integer())
  .then(({a, b}) => a + b === b + a)  // Commutativity
  .check()

console.log('\nCritical System Test:')
console.log('  Tests run:', criticalTest.statistics.testsRun)
console.log('  Confidence:', (criticalTest.statistics.confidence! * 100).toFixed(4) + '%')


// Example 3: Strategy-level configuration
// ---------------------------------------
// Set confidence at strategy level for reuse

const highConfidenceStrategy = fc.strategy()
  .withConfidence(0.999)
  .withMinConfidence(0.99)     // Continue past sample size if below 99%
  .withMaxIterations(50000)

const test1 = fc.scenario()
  .config(highConfidenceStrategy)
  .forall('x', fc.nat(1000))
  .then(({x}) => x >= 0)
  .check()

const test2 = fc.scenario()
  .config(highConfidenceStrategy)
  .forall('s', fc.string())
  .then(({s}) => s.length >= 0)
  .check()

console.log('\nStrategy-level Confidence:')
console.log('  Test 1 confidence:', test1.statistics.confidence)
console.log('  Test 2 confidence:', test2.statistics.confidence)


// Example 4: Understanding credible intervals
// -------------------------------------------
// The credible interval tells you the range of possible success rates

const intervalTest = fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .then(({x}) => Math.abs(x) >= 0)
  .checkWithConfidence(0.95, { credibleIntervalWidth: 0.99 })

console.log('\nCredible Interval Analysis:')
console.log('  Tests run:', intervalTest.statistics.testsRun)
console.log('  Confidence:', intervalTest.statistics.confidence)
console.log('  99% Credible interval:', intervalTest.statistics.credibleInterval)
// Interpretation: We are 99% confident the true success rate lies within this interval


// Example 5: Comparing fixed vs confidence-based
// -----------------------------------------------
// Show the difference between approaches

// Fixed sample size
const fixedTest = fc.scenario()
  .config(fc.strategy().withSampleSize(1000))
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()

// Confidence-based
const confidenceTest = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .checkWithConfidence(0.999)

console.log('\nFixed vs Confidence-Based:')
console.log('  Fixed (1000 tests):')
console.log('    Tests run:', fixedTest.statistics.testsRun)
console.log('    Confidence:', fixedTest.statistics.confidence)
console.log('  Confidence-based (99.9%):')
console.log('    Tests run:', confidenceTest.statistics.testsRun)
console.log('    Confidence:', confidenceTest.statistics.confidence)


// Example 6: Early stopping on failure
// ------------------------------------
// Confidence drops to 0 when a counterexample is found

const failingTest = fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .then(({x}) => x < 50)  // Fails for x >= 50
  .check()

console.log('\nFailing Test:')
console.log('  Satisfiable:', failingTest.satisfiable)
console.log('  Counterexample:', failingTest.example)
console.log('  Tests run before failure:', failingTest.statistics.testsRun)
console.log('  Confidence (should be 0):', failingTest.statistics.confidence)


// Example 7: Confidence with coverage
// -----------------------------------
// Combine confidence-based stopping with coverage requirements

const combinedTest = fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .cover(10, ({x}) => x < 0, 'negative')
  .cover(10, ({x}) => x > 0, 'positive')
  .then(({x}) => x * x >= 0)
  .checkCoverage({ confidence: 0.99 })

console.log('\nCombined Confidence + Coverage:')
console.log('  Tests run:', combinedTest.statistics.testsRun)
console.log('  Confidence:', combinedTest.statistics.confidence)
console.log('  Coverage results:')
combinedTest.statistics.coverageResults?.forEach(cr => {
  console.log(`    ${cr.label}: ${cr.observedPercentage.toFixed(1)}% (required: ${cr.requiredPercentage}%)`)
})


// Example 8: Understanding the math
// ---------------------------------
// Show how confidence relates to test count

console.log('\nConfidence vs Test Count (for always-passing property):')
const testCounts = [100, 500, 1000, 5000, 10000, 50000]
for (const n of testCounts) {
  const result = fc.scenario()
    .config(fc.strategy().withSampleSize(n))
    .forall('x', fc.nat())
    .then(({x}) => x >= 0)
    .check()
  
  console.log(`  ${n.toString().padStart(5)} tests: ${(result.statistics.confidence! * 100).toFixed(4)}% confidence`)
}
// Shows: More tests = higher confidence in the property holding


// Example 9: Custom confidence options
// ------------------------------------
// Fine-tune confidence calculation

const customOptions = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .checkWithConfidence(0.99, {
    maxTests: 20000,           // Cap at 20k tests
    credibleIntervalWidth: 0.95  // 95% credible interval
  })

console.log('\nCustom Options:')
console.log('  Tests run:', customOptions.statistics.testsRun)
console.log('  Confidence:', customOptions.statistics.confidence)
console.log('  95% CI:', customOptions.statistics.credibleInterval)


// Example 10: Practical use case - GCD algorithm
// ----------------------------------------------
// Testing a critical algorithm with high confidence

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

const gcdTest = fc.scenario()
  .forall('a', fc.nat(10000))
  .forall('b', fc.nat(10000))
  // Classify to understand test distribution
  .classify(({a, b}) => a === 0 || b === 0, 'has-zero')
  .classify(({a, b}) => gcd(a, b) === 1, 'coprime')
  .classify(({a, b}) => gcd(a, b) === Math.min(a, b), 'one-divides-other')
  // Test properties of GCD
  .then(({a, b}) => {
    const g = gcd(a, b)
    // GCD divides both numbers
    if (a !== 0 && a % g !== 0) return false
    if (b !== 0 && b % g !== 0) return false
    // GCD is commutative
    if (g !== gcd(b, a)) return false
    return true
  })
  .checkWithConfidence(0.9999)

console.log('\nGCD Algorithm Test:')
console.log('  Confidence:', (gcdTest.statistics.confidence! * 100).toFixed(4) + '%')
console.log('  Tests run:', gcdTest.statistics.testsRun)
console.log('  Distribution:', gcdTest.statistics.labels)
