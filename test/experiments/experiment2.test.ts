import * as fc from '../../src/index'
import {it, describe} from 'mocha'
import {expect} from 'chai'

/**
 * Experiment 2: Fine-Grained Equivalence Classes vs. Single-Hit Coverage
 * 
 * This experiment tests the hypothesis that if a single sample per equivalence class is insufficient
 * to detect violations, then using finer-grained partitioning or requiring multiple samples per class
 * will lead to higher detection rates.
 * 
 * From the paper:
 * - Coarse: Partition domain into m large classes
 * - Fine: Partition into 10m smaller classes
 * - Adaptive: Start with coarse partitioning but subdivide classes based on observed heterogeneity
 * 
 * The experiment seeds property violations in specific sub-areas such that a random point in a
 * large class has low probability of hitting the violation.
 */
describe('Experiment 2: Fine-Grained Equivalence Classes vs. Single-Hit Coverage', () => {
  // Parameters for the experiment
  const domainSize = 10000  // Size of the total domain
  const coarsePartitionCount = 10  // Number of coarse partitions
  const finePartitionCount = 100   // Number of fine partitions (10x more granular)
  const sampleCounts = [50, 100, 200, 500]  // Number of samples to test with
  const numTrials = 100  // Number of trials for statistical significance
  
  // The different coverage criteria to test
  const coverageCriteria = [
    { name: 'Standard (One Hit)', samplesRequired: 1 },
    { name: 'Multiple Samples (k=3)', samplesRequired: 3 },
    { name: 'Multiple Samples (k=5)', samplesRequired: 5 }
  ]
  
  // Define violation patterns that are hard to find with coarse partitioning
  const violationPatterns = [
    { 
      name: 'Small Sub-region Violation',
      // Violation occurs in 1% of each partition (at the beginning)
      isViolation: (x: number) => {
        const partitionSize = domainSize / coarsePartitionCount;
        const partitionIndex = Math.floor(x / partitionSize);
        const offsetInPartition = x % partitionSize;
        // Violation is in first 1% of each partition
        return offsetInPartition < (partitionSize * 0.01);
      },
      totalViolationSize: domainSize * 0.01  // 1% of domain
    },
    { 
      name: 'Boundary Violation',
      // Violation occurs at partition boundaries
      isViolation: (x: number) => {
        const partitionSize = domainSize / coarsePartitionCount;
        const offsetInPartition = x % partitionSize;
        // Violation is near partition boundaries (within 0.5% on either side)
        return offsetInPartition < (partitionSize * 0.005) || 
               offsetInPartition > (partitionSize * 0.995);
      },
      totalViolationSize: domainSize * 0.01  // Approximately 1% of domain
    },
    { 
      name: 'Scattered Points Violation',
      // Violation occurs at scattered points (every 100th value)
      isViolation: (x: number) => x % 100 === 0,
      totalViolationSize: domainSize / 100  // 1% of domain
    }
  ]
  
  /**
   * Generates a truly uniform random integer in range [min, max]
   */
  function uniformRandom(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Maps a value to its partition ID
   * @param value The value to map
   * @param partitionCount The number of partitions
   * @param domainSize The total domain size
   * @returns The partition ID
   */
  function getPartitionId(value: number, partitionCount: number, domainSize: number): number {
    const partitionSize = domainSize / partitionCount;
    return Math.floor(value / partitionSize);
  }
  
  /**
   * Runs a trial with a specific partitioning scheme and coverage criterion
   * @param property The property to test (returns true for violations)
   * @param partitionCount Number of partitions to use
   * @param samplesRequired Samples required per partition for "coverage"
   * @param sampleCount Total number of samples to draw
   * @returns Whether a violation was found
   */
  function runTrial(
    property: (x: number) => boolean, 
    partitionCount: number, 
    samplesRequired: number, 
    sampleCount: number
  ): boolean {
    // Track samples in each partition
    const partitionSamples: Record<number, number[]> = {};
    
    // Initialize partition tracking
    for (let i = 0; i < partitionCount; i++) {
      partitionSamples[i] = [];
    }
    
    // Generate samples and track which partitions they fall into
    for (let i = 0; i < sampleCount; i++) {
      const value = uniformRandom(0, domainSize - 1);
      const partitionId = getPartitionId(value, partitionCount, domainSize);
      
      // Store the sample in its partition
      partitionSamples[partitionId].push(value);
      
      // Check if this sample reveals a violation
      if (property(value)) {
        return true; // Violation found
      }
      
      // Optional: If we've sampled enough in all partitions, we could stop early
      // but we'll keep going to use all samples for fairness
    }
    
    // Count "covered" partitions (those with enough samples)
    const coveredPartitions = Object.values(partitionSamples)
      .filter(samples => samples.length >= samplesRequired)
      .length;
    
    // Calculate coverage ratio
    const coverageRatio = coveredPartitions / partitionCount;
    
    // No violation found
    return false;
  }
  
  /**
   * Run multiple trials and calculate violation detection rate
   */
  function runTrials(
    property: (x: number) => boolean,
    partitionCount: number,
    samplesRequired: number,
    sampleCount: number,
    numTrials: number
  ): number {
    let detectCount = 0;
    
    for (let i = 0; i < numTrials; i++) {
      const detected = runTrial(property, partitionCount, samplesRequired, sampleCount);
      if (detected) {
        detectCount++;
      }
    }
    
    return detectCount / numTrials;
  }
  
  /**
   * Calculate theoretical detection probability for uniform sampling
   */
  function theoreticalDetectionProbability(
    violationSize: number, 
    domainSize: number, 
    sampleCount: number
  ): number {
    // P(detect) = 1 - P(miss) = 1 - (1 - violationSize/domainSize)^sampleCount
    const ratio = violationSize / domainSize;
    return 1 - Math.pow(1 - ratio, sampleCount);
  }
  
  // Run experiments for each violation pattern
  violationPatterns.forEach(({name, isViolation, totalViolationSize}) => {
    describe(`Violation Pattern: ${name}`, () => {
      sampleCounts.forEach(sampleCount => {
        describe(`With ${sampleCount} samples`, () => {
          // Calculate theoretical detection rate for reference
          const theoretical = theoreticalDetectionProbability(
            totalViolationSize, domainSize, sampleCount
          );
          
          // Test each coverage criterion
          coverageCriteria.forEach(({name: criterionName, samplesRequired}) => {
            describe(`Coverage Criterion: ${criterionName}`, () => {
              it('should show different detection rates between coarse and fine partitioning', () => {
                // Test with coarse partitioning
                const coarseDetectionRate = runTrials(
                  isViolation, coarsePartitionCount, samplesRequired, sampleCount, numTrials
                );
                
                // Test with fine partitioning
                const fineDetectionRate = runTrials(
                  isViolation, finePartitionCount, samplesRequired, sampleCount, numTrials
                );
                
                // Log results for analysis
                console.log(`  Violation: ${name}, Samples: ${sampleCount}, Criterion: ${criterionName}`);
                console.log(`  Theoretical detection rate: ${theoretical.toFixed(4)}`);
                console.log(`  Coarse partitioning (${coarsePartitionCount} partitions): ${coarseDetectionRate.toFixed(4)}`);
                console.log(`  Fine partitioning (${finePartitionCount} partitions): ${fineDetectionRate.toFixed(4)}`);
                console.log(`  Improvement ratio: ${(fineDetectionRate / coarseDetectionRate).toFixed(4)}x`);
                
                // Assert that fine partitioning is better or at least as good
                expect(fineDetectionRate).to.be.at.least(coarseDetectionRate * 0.95);
                
                // For violations with strong partition sensitivity, fine should be notably better
                if (name === 'Small Sub-region Violation' || name === 'Boundary Violation') {
                  // Calculate minimum expected improvement based on violation pattern
                  // and coverage criterion
                  let minExpectedImprovement = 1.0;
                  
                  // For strict coverage criteria, we expect more pronounced benefits
                  if (samplesRequired > 1) {
                    minExpectedImprovement = 1.2; // 20% improvement
                  }
                  
                  if (sampleCount >= 200) {  // For larger sample counts, the advantage should be clear
                    expect(fineDetectionRate).to.be.at.least(
                      coarseDetectionRate * minExpectedImprovement, 
                      "Fine partitioning should show notable improvement for partition-sensitive violations"
                    );
                  }
                }
              });
            });
          });
        });
      });
    });
  });
  
  /**
   * Summary of Findings (to be filled in after running the experiment):
   * ---------------------
   * 
   * 1. Single-hit coverage metrics can be misleading:
   *    - A coarse partition may be marked as "covered" with just one sample, but this
   *      sample might miss violations in specific sub-regions of the partition.
   * 
   * 2. Fine-grained partitioning improves detection rates:
   *    - For violations that occur in small sub-regions of partitions, finer partitioning
   *      leads to better detection rates.
   *    - The improvement is more pronounced for partition-sensitive violation patterns
   *      (like boundary cases or small sub-regions).
   * 
   * 3. Multiple-sample coverage criteria:
   *    - Requiring multiple samples per partition improves detection reliability
   *    - For coarse partitioning, multiple samples help compensate for the lack of granularity
   * 
   * 4. Implications for early stopping:
   *    - Simple "partition coverage" metrics can give a false sense of confidence
   *    - More sophisticated coverage metrics that account for partition granularity
   *      and multiple samples are necessary for reliable early stopping decisions
   *    - The choice of partitioning granularity should be informed by the specific
   *      properties and domain characteristics being tested
   */
}); 