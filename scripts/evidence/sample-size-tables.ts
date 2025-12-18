/**
 * Generate sample size requirement tables for documentation.
 * 
 * This script outputs the actual computed values for:
 * - Required tests to achieve various confidence levels at different thresholds
 * - Detection probabilities for various failure rates and test counts
 * 
 * Usage:
 *   npx tsx scripts/evidence/sample-size-tables.ts
 */

import {
  sampleSizeForConfidence,
  detectionProbability,
  expectedTestsToDetectFailure,
  calculateBayesianConfidence
} from '../../src/statistics.js'

interface SampleSizeEntry {
  threshold: number
  confidence: number
  requiredTests: number
}

interface DetectionEntry {
  failureRate: number
  tests: number
  detectionRate: number
}

/**
 * Generate sample size requirements table
 */
function generateSampleSizeTable(): SampleSizeEntry[] {
  const thresholds = [0.99, 0.995, 0.999, 0.9999]
  const confidenceLevels = [0.90, 0.95, 0.99]
  
  const results: SampleSizeEntry[] = []
  
  for (const threshold of thresholds) {
    for (const confidence of confidenceLevels) {
      const requiredTests = sampleSizeForConfidence(threshold, confidence)
      results.push({ threshold, confidence, requiredTests })
    }
  }
  
  return results
}

/**
 * Generate detection probability table
 */
function generateDetectionTable(): DetectionEntry[] {
  const failureRates = [0.01, 0.005, 0.001, 0.0001] // 1%, 0.5%, 0.1%, 0.01%
  const testCounts = [100, 500, 1000, 5000, 10000]
  
  const results: DetectionEntry[] = []
  
  for (const failureRate of failureRates) {
    for (const tests of testCounts) {
      const detectionRate = detectionProbability(failureRate, tests)
      results.push({ failureRate, tests, detectionRate })
    }
  }
  
  return results
}

/**
 * Verify Bayesian confidence calculations
 */
function verifyBayesianCalculations(): void {
  console.log('\n## Bayesian Confidence Verification\n')
  console.log('These values verify the Bayesian confidence calculation:')
  console.log('')
  
  const testCases = [
    { successes: 100, failures: 0, threshold: 0.99 },
    { successes: 100, failures: 0, threshold: 0.999 },
    { successes: 1000, failures: 0, threshold: 0.999 },
    { successes: 3000, failures: 0, threshold: 0.999 },
    { successes: 5000, failures: 0, threshold: 0.999 },
    { successes: 10000, failures: 0, threshold: 0.999 }
  ]
  
  console.log('| Successes | Failures | Threshold | Confidence |')
  console.log('|-----------|----------|-----------|------------|')
  
  for (const tc of testCases) {
    const confidence = calculateBayesianConfidence(tc.successes, tc.failures, tc.threshold)
    console.log(`| ${tc.successes} | ${tc.failures} | ${tc.threshold} | ${(confidence * 100).toFixed(2)}% |`)
  }
}

/**
 * Main function - outputs markdown tables
 */
function main(): void {
  console.log('# Sample Size Requirements (Generated)\n')
  console.log('*Generated from actual framework calculations.*\n')
  
  // Sample size table
  console.log('## Required Tests by Threshold and Confidence\n')
  console.log('Tests required to achieve target confidence (assuming zero failures):\n')
  
  const sampleSizes = generateSampleSizeTable()
  
  // Group by threshold for readability
  const byThreshold = new Map<number, SampleSizeEntry[]>()
  for (const entry of sampleSizes) {
    const group = byThreshold.get(entry.threshold) || []
    group.push(entry)
    byThreshold.set(entry.threshold, group)
  }
  
  console.log('| Threshold | 90% Confidence | 95% Confidence | 99% Confidence |')
  console.log('|-----------|----------------|----------------|----------------|')
  
  for (const [threshold, entries] of byThreshold) {
    const conf90 = entries.find(e => e.confidence === 0.90)?.requiredTests ?? '-'
    const conf95 = entries.find(e => e.confidence === 0.95)?.requiredTests ?? '-'
    const conf99 = entries.find(e => e.confidence === 0.99)?.requiredTests ?? '-'
    console.log(`| ${(threshold * 100).toFixed(2)}% | ${conf90} | ${conf95} | ${conf99} |`)
  }
  
  // Detection probability table
  console.log('\n## Detection Probability by Failure Rate\n')
  console.log('Probability of finding at least one failure given failure rate and test count:\n')
  
  const detection = generateDetectionTable()
  
  // Group by failure rate
  const byFailureRate = new Map<number, DetectionEntry[]>()
  for (const entry of detection) {
    const group = byFailureRate.get(entry.failureRate) || []
    group.push(entry)
    byFailureRate.set(entry.failureRate, group)
  }
  
  console.log('| Failure Rate | 100 Tests | 500 Tests | 1000 Tests | 5000 Tests | 10000 Tests |')
  console.log('|--------------|-----------|-----------|------------|------------|-------------|')
  
  for (const [failureRate, entries] of byFailureRate) {
    const t100 = entries.find(e => e.tests === 100)?.detectionRate ?? 0
    const t500 = entries.find(e => e.tests === 500)?.detectionRate ?? 0
    const t1000 = entries.find(e => e.tests === 1000)?.detectionRate ?? 0
    const t5000 = entries.find(e => e.tests === 5000)?.detectionRate ?? 0
    const t10000 = entries.find(e => e.tests === 10000)?.detectionRate ?? 0
    
    const rateStr = failureRate >= 0.01 
      ? `${(failureRate * 100).toFixed(0)}%` 
      : `${(failureRate * 100).toFixed(2)}%`
    
    console.log(`| ${rateStr} | ${(t100 * 100).toFixed(1)}% | ${(t500 * 100).toFixed(1)}% | ${(t1000 * 100).toFixed(1)}% | ${(t5000 * 100).toFixed(1)}% | ${(t10000 * 100).toFixed(1)}% |`)
  }
  
  // Expected tests to detect
  console.log('\n## Expected Tests to First Failure\n')
  console.log('| Failure Rate | Expected Tests |')
  console.log('|--------------|----------------|')
  
  for (const failureRate of [0.01, 0.005, 0.001, 0.0005, 0.0001]) {
    const expected = expectedTestsToDetectFailure(failureRate)
    const rateStr = failureRate >= 0.01 
      ? `${(failureRate * 100).toFixed(0)}%` 
      : `${(failureRate * 100).toFixed(2)}%`
    console.log(`| ${rateStr} | ${expected.toLocaleString()} |`)
  }
  
  // Verification
  verifyBayesianCalculations()
  
  // Output JSON for programmatic use
  console.log('\n## JSON Data\n')
  console.log('```json')
  console.log(JSON.stringify({
    sampleSizeRequirements: sampleSizes,
    detectionProbabilities: detection.map(d => ({
      ...d,
      detectionRatePercent: (d.detectionRate * 100).toFixed(2)
    }))
  }, null, 2))
  console.log('```')
}

main()
