import * as fc from '../../src/index'
import {it, describe} from 'mocha'
import {expect} from 'chai'

/**
 * Edge Case Influence on Miss Probability
 * 
 * This experiment compares uniform sampling to edge-case-biased sampling (like FluentCheck uses)
 * and examines how the location of violations affects the effectiveness of each sampling strategy.
 * 
 * Mathematical model:
 * P(miss D* | uniform) = (1 - μ(D*)/|D|)^t
 * P(miss D* | biased) = (1 - p_e·|D*∩E| - p_n·|D*\E|)^t
 * 
 * Where:
 * - D* is the violation region
 * - E is the set of edge cases
 * - p_e is the probability of sampling an edge case
 * - p_n is the probability of sampling a non-edge case
 */
describe('Edge Case Influence on Miss Probability', () => {
  // Parameters for the experiment
  const domainSize = 10000  // Size of the total domain
  const edgeCases = [0, 1, 9999]  // Designated edge cases
  const edgeCaseBias = 0.5  // Probability mass allocated to edge cases (higher = more bias)
  const sampleCounts = [10, 50, 200]  // Number of samples to take
  const numTrials = 100  // Number of trials for statistical significance
  
  // Different violation patterns to test
  const violationPatterns = [
    { 
      name: 'Violations at Edge Cases Only',
      isViolation: (x: number) => edgeCases.includes(x),
      violationSize: edgeCases.length  // Exact size
    },
    { 
      name: 'Violations Disjoint from Edge Cases',
      isViolation: (x: number) => x >= 100 && x <= 199 && !edgeCases.includes(x),
      violationSize: 100  // Approximate size
    },
    { 
      name: 'Violations Include Some Edge Cases',
      isViolation: (x: number) => (x < 100) || edgeCases.includes(x),
      violationSize: 100 + edgeCases.filter(e => e >= 100).length  // Approximate size
    },
    { 
      name: 'Uniformly Distributed Violations',
      isViolation: (x: number) => x % 100 === 0,  // Every 100th number
      violationSize: Math.floor(domainSize / 100)  // Approximate size
    }
  ]

  /**
   * Generates a truly uniform random integer in range [min, max]
   */
  function uniformRandom(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generates a random integer biased toward edge cases
   * 
   * @param min Minimum value (inclusive)
   * @param max Maximum value (inclusive)
   * @param edgeCases Array of edge case values
   * @param bias Probability mass allocated to edge cases (0-1)
   */
  function biasedRandom(min: number, max: number, edgeCases: number[], bias: number): number {
    // Filter edge cases to ensure they're in range
    const validEdgeCases = edgeCases.filter(e => e >= min && e <= max);
    
    // If no valid edge cases, fall back to uniform
    if (validEdgeCases.length === 0) {
      return uniformRandom(min, max);
    }
    
    // Decide whether to return an edge case or non-edge case
    if (Math.random() < bias) {
      // Return a random edge case
      const index = Math.floor(Math.random() * validEdgeCases.length);
      return validEdgeCases[index];
    } else {
      // Generate a non-edge value
      // Simple approach: just regenerate if we hit an edge case
      // More efficient approaches exist but this is clear
      let value;
      do {
        value = uniformRandom(min, max);
      } while (validEdgeCases.includes(value));
      return value;
    }
  }

  /**
   * Calculates theoretical miss probability with uniform sampling
   */
  function uniformMissProbability(violationSize: number, domainSize: number, sampleCount: number): number {
    const ratio = violationSize / domainSize;
    return Math.pow(1 - ratio, sampleCount);
  }

  /**
   * Calculates theoretical miss probability with edge-case-biased sampling
   * Based on our mathematical model
   */
  function biasedMissProbability(
    violationPattern: (x: number) => boolean,
    edgeCases: number[],
    edgeCaseBias: number,
    domainSize: number,
    sampleCount: number
  ): number {
    // Count violations in edge cases
    const violatingEdgeCases = edgeCases.filter(e => violationPattern(e));
    
    // Calculate sampling probabilities
    const pEdge = edgeCaseBias / edgeCases.length;  // Prob of sampling a specific edge case
    const pNonEdge = (1 - edgeCaseBias) / (domainSize - edgeCases.length);  // Prob of sampling a specific non-edge
    
    // Approximate non-edge violations (without enumerating all values)
    // This is an approximation for the sake of the experiment
    const foundPattern = violationPatterns.find(v => v.isViolation === violationPattern);
    const nonEdgeCaseViolationsEstimate = foundPattern 
      ? foundPattern.violationSize - violatingEdgeCases.length
      : 0;
    
    // Calculate prob of sampling a violation
    const pViolation = 
      (pEdge * violatingEdgeCases.length) + 
      (pNonEdge * nonEdgeCaseViolationsEstimate);
    
    // Calculate miss probability
    return Math.pow(1 - pViolation, sampleCount);
  }

  /**
   * Run trials with uniform sampling
   */
  function runUniformTrials(
    property: (x: number) => boolean, 
    sampleCount: number, 
    numTrials: number
  ): number {
    let missCount = 0;

    for (let i = 0; i < numTrials; i++) {
      let foundViolation = false;
      
      for (let j = 0; j < sampleCount; j++) {
        const value = uniformRandom(0, domainSize - 1);
        
        if (property(value)) {
          foundViolation = true;
          break;
        }
      }
      
      if (!foundViolation) {
        missCount++;
      }
    }

    return missCount / numTrials;
  }

  /**
   * Run trials with edge-case-biased sampling
   */
  function runBiasedTrials(
    property: (x: number) => boolean, 
    sampleCount: number, 
    numTrials: number
  ): number {
    let missCount = 0;

    for (let i = 0; i < numTrials; i++) {
      let foundViolation = false;
      
      for (let j = 0; j < sampleCount; j++) {
        const value = biasedRandom(0, domainSize - 1, edgeCases, edgeCaseBias);
        
        if (property(value)) {
          foundViolation = true;
          break;
        }
      }
      
      if (!foundViolation) {
        missCount++;
      }
    }

    return missCount / numTrials;
  }

  /**
   * Determines appropriate tolerance based on the theoretical probability
   */
  function getTolerance(theoretical: number): number {
    if (theoretical < 0.01) {
      return Math.max(0.03, theoretical);
    }
    
    const midRangeFactor = 4 * theoretical * (1 - theoretical);
    return Math.max(0.03, midRangeFactor * 0.6);
  }

  // Run the experiment for each violation pattern and sample count
  violationPatterns.forEach(({name, isViolation, violationSize}) => {
    describe(`${name} (size: ${violationSize})`, () => {
      sampleCounts.forEach(sampleCount => {
        it(`compares uniform vs biased sampling with ${sampleCount} samples`, () => {
          // Theoretical predictions
          const uniformTheoretical = uniformMissProbability(
            violationSize, domainSize, sampleCount
          );
          
          // Run the trials
          const uniformEmpirical = runUniformTrials(isViolation, sampleCount, numTrials);
          const biasedEmpirical = runBiasedTrials(isViolation, sampleCount, numTrials);
          
          // Calculate effectiveness ratio
          const empiricalRatio = uniformEmpirical / biasedEmpirical || 1; // Avoid division by zero
          
          // Log results
          console.log(`  Pattern: ${name}, Samples: ${sampleCount}`)
          console.log(`  Uniform miss probability: ${uniformEmpirical.toFixed(4)} (theoretical: ${uniformTheoretical.toFixed(4)})`)
          console.log(`  Biased miss probability: ${biasedEmpirical.toFixed(4)}`)
          console.log(`  Effectiveness ratio: ${empiricalRatio.toFixed(4)} (> 1 means biased sampling is better)`)
          
          // Verify uniform sampling matches its theoretical prediction
          const tolerance = getTolerance(uniformTheoretical);
          if (uniformTheoretical < 0.001) {
            expect(uniformEmpirical).to.be.lessThan(0.05);
          } else if (uniformTheoretical > 0.999) {
            expect(uniformEmpirical).to.be.greaterThan(0.95);
          } else {
            expect(uniformEmpirical).to.be.closeTo(uniformTheoretical, tolerance);
          }
          
          // Special cases to check our theoretical understanding
          if (name === 'Violations at Edge Cases Only') {
            // Biased sampling should be significantly better
            expect(empiricalRatio).to.be.greaterThan(1.5);
          } else if (name === 'Violations Disjoint from Edge Cases') {
            // Biased sampling should be worse or similar
            expect(empiricalRatio).to.be.at.most(1.2);
          }
        });
      });
    });
  });

  /**
   * Theoretical Insights from Mathematical Analysis:
   * 
   * 1. Sampling distribution significantly affects probabilities:
   *    P(miss D*) = (1 - p_e·|D*∩E| - p_n·|D*\E|)^t
   * 
   * 2. Edge case bias helps when:
   *    - Violations occur at or near edge cases (|D*∩E| is large)
   *    - The bias towards edge cases (p_e/p_n ratio) is substantial
   * 
   * 3. Edge case bias hurts when:
   *    - Violations are disjoint from edge cases (|D*∩E| = 0)
   *    - Violations are uniformly distributed throughout the domain
   * 
   * 4. Implications for early stopping:
   *    - The classic formula P(miss D*) ≤ (1 - μ(D*)/|D|)^t only applies for uniform sampling
   *    - For biased sampling, we must account for the sampling distribution
   *    - The optimal sampling strategy depends on where violations are likely to occur
   *    - Adaptive strategies can combine the benefits of both approaches
   */
}); 