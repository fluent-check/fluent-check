/**
 * Example: Coverage Requirements
 * 
 * This example demonstrates how to use coverage requirements to ensure
 * that important categories of inputs are adequately tested.
 */

import * as fc from 'fluent-check'

// Example 1: Basic coverage requirements
// --------------------------------------
// Ensure at least 10% of tests cover each sign category

const signCoverage = fc.scenario()
  .forall('x', fc.integer(-1000, 1000))
  .cover(10, ({x}) => x < 0, 'negative')
  .cover(10, ({x}) => x > 0, 'positive')
  .cover(0.5, ({x}) => x === 0, 'zero')  // Zero is rare, require at least 0.5%
  .then(({x}) => Math.abs(x) >= 0)
  .checkCoverage()

console.log('Sign Coverage Results:')
console.log('  Coverage Results:', signCoverage.statistics.coverageResults)

// Expected output:
// Coverage Results: [
//   { label: 'negative', required: 10, observed: 49.8, satisfied: true, ... },
//   { label: 'positive', required: 10, observed: 49.7, satisfied: true, ... },
//   { label: 'zero', required: 0.5, observed: 0.5, satisfied: true, ... }
// ]


// Example 2: Coverage with multiple arbitraries
// ---------------------------------------------
// Ensure coverage across combinations of inputs

const combinationCoverage = fc.scenario()
  .forall('a', fc.integer(-100, 100))
  .forall('b', fc.integer(-100, 100))
  .cover(5, ({a, b}) => a < 0 && b < 0, 'both-negative')
  .cover(5, ({a, b}) => a > 0 && b > 0, 'both-positive')
  .cover(5, ({a, b}) => a * b < 0, 'opposite-signs')
  .cover(1, ({a, b}) => a === 0 || b === 0, 'has-zero')
  .then(({a, b}) => (a + b) - b === a)
  .checkCoverage({ confidence: 0.99 })

console.log('\nCombination Coverage Results:')
combinationCoverage.statistics.coverageResults?.forEach(cr => {
  const status = cr.satisfied ? '✓' : '✗'
  console.log(`  ${status} ${cr.label}: ${cr.observedPercentage.toFixed(1)}% (required: ${cr.requiredPercentage}%)`)
})


// Example 3: Coverage table for categories
// ----------------------------------------
// Define coverage requirements as a table

const sizeCoverage = fc.scenario()
  .forall('xs', fc.array(fc.integer(), { maxLength: 50 }))
  .coverTable('array-sizes', 
    { empty: 5, tiny: 10, small: 20, medium: 20, large: 10 },
    ({xs}) => {
      if (xs.length === 0) return 'empty'
      if (xs.length <= 2) return 'tiny'
      if (xs.length <= 10) return 'small'
      if (xs.length <= 30) return 'medium'
      return 'large'
    })
  .then(({xs}) => xs.sort((a, b) => a - b).length === xs.length)
  .checkCoverage()

console.log('\nSize Coverage Table:')
console.log('  Results:', sizeCoverage.statistics.coverageResults)


// Example 4: Strict coverage for critical paths
// ---------------------------------------------
// Ensure edge cases are definitely tested

const edgeCaseCoverage = fc.scenario()
  .forall('n', fc.nat(1000))
  .cover(1, ({n}) => n === 0, 'zero')
  .cover(0.5, ({n}) => n === 1, 'one')
  .cover(0.1, ({n}) => n >= 999, 'near-max')
  .cover(5, ({n}) => n < 10, 'single-digit')
  .cover(5, ({n}) => n >= 100 && n < 1000, 'three-digit')
  .then(({n}) => n >= 0)
  .checkCoverage({ confidence: 0.999, maxTests: 50000 })

console.log('\nEdge Case Coverage:')
edgeCaseCoverage.statistics.coverageResults?.forEach(cr => {
  console.log(`  ${cr.label}: ${cr.observedPercentage.toFixed(2)}% [${cr.confidenceInterval[0].toFixed(2)}%, ${cr.confidenceInterval[1].toFixed(2)}%]`)
})


// Example 5: Coverage for string patterns
// ---------------------------------------
// Ensure different string categories are tested

const stringCoverage = fc.scenario()
  .forall('s', fc.string({ minLength: 0, maxLength: 20 }))
  .cover(5, ({s}) => s.length === 0, 'empty')
  .cover(10, ({s}) => /^[a-z]+$/.test(s), 'lowercase-only')
  .cover(10, ({s}) => /^[A-Z]+$/.test(s), 'uppercase-only')
  .cover(5, ({s}) => /\d/.test(s), 'contains-digit')
  .cover(5, ({s}) => /[^a-zA-Z0-9]/.test(s), 'contains-special')
  .then(({s}) => typeof s === 'string')
  .checkCoverage()

console.log('\nString Pattern Coverage:')
stringCoverage.statistics.coverageResults?.forEach(cr => {
  const status = cr.satisfied ? '✓' : '✗'
  console.log(`  ${status} ${cr.label}: ${cr.observedPercentage.toFixed(1)}%`)
})


// Example 6: Combining classification and coverage
// ------------------------------------------------
// Use classification to understand distribution, coverage to enforce it

const comprehensiveTest = fc.scenario()
  .forall('xs', fc.array(fc.integer(-50, 50), { maxLength: 20 }))
  // Classification for visibility
  .classify(({xs}) => xs.every((v, i, arr) => i === 0 || arr[i-1] <= v), 'already-sorted')
  .classify(({xs}) => xs.every((v, i, arr) => i === 0 || arr[i-1] >= v), 'reverse-sorted')
  .classify(({xs}) => new Set(xs).size === xs.length, 'all-unique')
  .classify(({xs}) => xs.some(x => x < 0), 'has-negatives')
  // Coverage requirements
  .cover(5, ({xs}) => xs.length === 0, 'empty')
  .cover(5, ({xs}) => xs.length === 1, 'singleton')
  .cover(10, ({xs}) => xs.length >= 10, 'large')
  .then(({xs}) => {
    const sorted = [...xs].sort((a, b) => a - b)
    return sorted.every((v, i, arr) => i === 0 || arr[i-1] <= v)
  })
  .checkCoverage()

console.log('\nComprehensive Test:')
console.log('  Labels:', comprehensiveTest.statistics.labels)
console.log('  Coverage:')
comprehensiveTest.statistics.coverageResults?.forEach(cr => {
  const status = cr.satisfied ? '✓' : '✗'
  console.log(`    ${status} ${cr.label}: ${cr.observedPercentage.toFixed(1)}%`)
})


// Example 7: Handling coverage failures
// -------------------------------------
// What happens when coverage requirements can't be met

try {
  const impossibleCoverage = fc.scenario()
    .forall('x', fc.nat(10))  // Only generates 0-10
    .cover(50, ({x}) => x > 100, 'greater-than-100')  // Impossible!
    .then(({x}) => x >= 0)
    .checkCoverage({ maxTests: 10000 })
} catch (error) {
  console.log('\nImpossible Coverage Error:')
  console.log('  ', error.message)
  // Error: Coverage requirement 'greater-than-100' not satisfied:
  //        Required 50%, observed 0% [0%, 0.05%]
}
