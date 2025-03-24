# Early Stopping Implementation Guide

This document complements the mathematical exposition in `early-stopping.md` by providing pseudo-code and implementation guidance for software engineers who want to contribute to the framework.

## Overview of Early Stopping Implementation

The early stopping mechanism should be implemented as a strategy mixin that can be composed with other strategies in the FluentCheck framework. This approach aligns with the existing architecture where strategies like `Random`, `Shrinkable`, etc. are implemented as mixins.

## Core Components

### 1. Domain Coverage Tracker

```typescript
/**
 * Tracks coverage of the domain during property testing
 */
class DomainCoverageTracker<A> {
  // For discrete domains, track visited values
  private visitedValues: Set<string> = new Set();
  // For partitioned domains, track visited partitions
  private visitedPartitions: Map<string, number> = new Map();
  // History of coverage ratios over time
  private coverageHistory: number[] = [];
  // Total domain size (if known)
  private domainSize?: number;
  // Total number of partitions (if known)
  private totalPartitions?: number;
  // Partitioning function (if using equivalence classes)
  private partitionFunction?: (a: A) => string;
  // Samples per partition for adequate coverage (default = 1)
  private samplesPerPartition: number = 1;
  // Function to subdivide a partition if needed
  private partitionSubdivider?: (partition: string, samples: A[]) => string[];
  
  constructor(options: {
    domainSize?: number,
    totalPartitions?: number,
    partitionFunction?: (a: A) => string,
    samplesPerPartition?: number,
    partitionSubdivider?: (partition: string, samples: A[]) => string[]
  }) {
    this.domainSize = options.domainSize;
    this.totalPartitions = options.totalPartitions;
    this.partitionFunction = options.partitionFunction;
    this.samplesPerPartition = options.samplesPerPartition || 1;
    this.partitionSubdivider = options.partitionSubdivider;
  }
  
  // Track samples by partition
  private partitionSamples: Map<string, A[]> = new Map();
  
  /**
   * Record a new sample
   */
  recordSample(sample: A): void {
    const stringRepresentation = JSON.stringify(sample);
    this.visitedValues.add(stringRepresentation);
    
    if (this.partitionFunction) {
      const partition = this.partitionFunction(sample);
      const currentCount = this.visitedPartitions.get(partition) || 0;
      this.visitedPartitions.set(partition, currentCount + 1);
      
      // Keep track of samples for potential subdivision
      if (this.partitionSubdivider) {
        if (!this.partitionSamples.has(partition)) {
          this.partitionSamples.set(partition, []);
        }
        this.partitionSamples.get(partition)!.push(sample);
        
        // Check if we should subdivide this partition
        if (currentCount + 1 >= this.samplesPerPartition) {
          this.checkForSubdivision(partition);
        }
      }
    }
    
    this.updateCoverageMetrics();
  }
  
  /**
   * Check if a partition should be subdivided based on accumulated samples
   */
  private checkForSubdivision(partition: string): void {
    if (!this.partitionSubdivider) return;
    
    const samples = this.partitionSamples.get(partition);
    if (!samples || samples.length < 2) return;
    
    // Get the new partitions
    const newPartitions = this.partitionSubdivider(partition, samples);
    
    // If subdivision occurred, update our tracking
    if (newPartitions.length > 1) {
      // Recategorize existing samples
      const currentCount = this.visitedPartitions.get(partition) || 0;
      this.visitedPartitions.delete(partition);
      this.partitionSamples.delete(partition);
      
      // For real implementation, would need to re-partition all samples
      // This is simplified for demonstration
      console.log(`Subdivided partition ${partition} into ${newPartitions.length} new partitions`);
      
      // Update total partitions if known
      if (this.totalPartitions) {
        this.totalPartitions = this.totalPartitions - 1 + newPartitions.length;
      }
    }
  }
  
  /**
   * Calculate current exploration ratio
   */
  getExplorationRatio(): number {
    if (this.partitionFunction) {
      // If using equivalence classes
      return this.getPartitionCoverage();
    } else if (this.domainSize) {
      // If domain size is known
      return this.visitedValues.size / this.domainSize;
    }
    // Otherwise, return NaN (not available)
    return NaN;
  }
  
  /**
   * Calculate partition-based coverage 
   */
  private getPartitionCoverage(): number {
    if (!this.totalPartitions) {
      // If total partitions unknown, just return the count
      return this.visitedPartitions.size;
    }
    
    // Standard coverage (at least one sample per partition)
    const oneHitCoverage = this.visitedPartitions.size / this.totalPartitions;
    
    // K-sample coverage (requiring samplesPerPartition in each partition)
    const kSampleCoverage = Array.from(this.visitedPartitions.entries())
      .filter(([_, count]) => count >= this.samplesPerPartition)
      .length / this.totalPartitions;
      
    // Confidence-weighted coverage (smoother transition)
    const confidenceWeightedCoverage = Array.from(this.visitedPartitions.entries())
      .reduce((sum, [_, count]) => sum + Math.min(1, count / this.samplesPerPartition), 0) 
      / this.totalPartitions;
    
    // Return the appropriate measure based on configuration
    // For this implementation, we return the k-sample coverage
    return kSampleCoverage;
  }
  
  /**
   * Get the standard 1-hit coverage ratio (original method)
   */
  getStandardCoverageRatio(): number {
    if (!this.partitionFunction || !this.totalPartitions) return NaN;
    return this.visitedPartitions.size / this.totalPartitions;
  }
  
  /**
   * Get the k-sample coverage ratio (requiring multiple samples per partition)
   */
  getKSampleCoverageRatio(): number {
    if (!this.partitionFunction || !this.totalPartitions) return NaN;
    
    return Array.from(this.visitedPartitions.entries())
      .filter(([_, count]) => count >= this.samplesPerPartition)
      .length / this.totalPartitions;
  }
  
  /**
   * Get confidence-weighted coverage (smoother metric)
   */
  getConfidenceWeightedCoverage(): number {
    if (!this.partitionFunction || !this.totalPartitions) return NaN;
    
    return Array.from(this.visitedPartitions.entries())
      .reduce((sum, [_, count]) => sum + Math.min(1, count / this.samplesPerPartition), 0) 
      / this.totalPartitions;
  }
  
  /**
   * Update internal coverage metrics
   */
  private updateCoverageMetrics(): void {
    const currentCoverage = this.getExplorationRatio();
    this.coverageHistory.push(currentCoverage);
  }
  
  /**
   * Calculate coverage rate of change (derivative)
   */
  getCoverageRateOfChange(windowSize: number = 10): number {
    if (this.coverageHistory.length < windowSize + 1) {
      return 1; // Not enough data, return high rate
    }
    
    const recentValues = this.coverageHistory.slice(-windowSize);
    const olderValues = this.coverageHistory.slice(-windowSize * 2, -windowSize);
    
    const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const olderAvg = olderValues.reduce((sum, val) => sum + val, 0) / olderValues.length;
    
    return (recentAvg - olderAvg) / windowSize;
  }
  
  /**
   * Calculate entropy of the visited values
   */
  getEntropyBasedCoverage(): number {
    if (this.partitionFunction && this.visitedPartitions.size > 0) {
      const totalSamples = Array.from(this.visitedPartitions.values())
        .reduce((sum, count) => sum + count, 0);
      
      // Calculate entropy
      let entropy = 0;
      for (const count of this.visitedPartitions.values()) {
        const p = count / totalSamples;
        entropy -= p * Math.log(p);
      }
      
      // Return normalized entropy
      return entropy / Math.log(this.visitedPartitions.size);
    }
    return NaN;
  }
}
```

### 2. Bayesian Confidence Calculator

```typescript
/**
 * Calculates Bayesian confidence intervals for property testing
 */
class BayesianConfidenceCalculator {
  // Prior alpha parameter (successes)
  private alpha: number;
  // Prior beta parameter (failures)
  private beta: number;
  // Sampling distribution information
  private samplingDistribution: 'uniform' | 'adaptive' | 'unknown';
  // Effective sample size adjustment (for non-uniform sampling)
  private effectiveSampleSize: number = 0;
  // Track samples for possible importance weighting
  private samples: Array<{value: any, weight: number, result: boolean}> = [];
  
  constructor(options: {
    priorAlpha?: number, 
    priorBeta?: number,
    samplingDistribution?: 'uniform' | 'adaptive' | 'unknown'
  }) {
    this.alpha = options.priorAlpha || 1;
    this.beta = options.priorBeta || 1;
    this.samplingDistribution = options.samplingDistribution || 'uniform';
  }
  
  /**
   * Update the model with a new test result
   * @param success - Whether the test passed
   * @param sampleInfo - Information about the sample for adaptive/non-uniform sampling
   */
  update(success: boolean, sampleInfo?: {value: any, weight?: number}): void {
    // Track sample with its weight
    if (sampleInfo) {
      const weight = sampleInfo.weight || 1;
      this.samples.push({
        value: sampleInfo.value,
        weight,
        result: success
      });
      
      // For non-uniform sampling, use importance weighting
      if (this.samplingDistribution === 'adaptive') {
        if (success) {
          this.alpha += weight;
        } else {
          this.beta += weight;
        }
        this.effectiveSampleSize += weight;
      } else {
        // For uniform sampling, standard update
        if (success) {
          this.alpha += 1;
        } else {
          this.beta += 1;
        }
        this.effectiveSampleSize += 1;
      }
    } else {
      // If no sample info, assume uniform sampling
      if (success) {
        this.alpha += 1;
      } else {
        this.beta += 1;
      }
      this.effectiveSampleSize += 1;
    }
  }
  
  /**
   * Get the posterior mean
   */
  getPosteriorMean(): number {
    return this.alpha / (this.alpha + this.beta);
  }
  
  /**
   * Get the effective sample size (adjusted for non-uniform sampling)
   */
  getEffectiveSampleSize(): number {
    return this.effectiveSampleSize;
  }
  
  /**
   * Get the lower bound of the credible interval
   * @param credibilityLevel - The credibility level (e.g., 0.95)
   */
  getCredibleIntervalLowerBound(credibilityLevel: number): number {
    const p = (1 - credibilityLevel) / 2;
    // This would be implemented using a proper beta inverse CDF
    // For example using jStat library: jstat.beta.inv(p, this.alpha, this.beta)
    
    // For demonstration, we'll use a simplified approximation
    // Note: This is not accurate! Use a proper statistical library in practice
    const mean = this.getPosteriorMean();
    const variance = (this.alpha * this.beta) / 
      (Math.pow(this.alpha + this.beta, 2) * (this.alpha + this.beta + 1));
    
    // Simplified using normal approximation (not accurate for small samples)
    const z = 1.96; // Approximately 95% credibility
    return Math.max(0, mean - z * Math.sqrt(variance));
  }
  
  /**
   * Calculate probability of missing a specific region of the domain
   * @param regionSize - The relative size of the region in the domain
   * @param samplingDensity - The sampling density over this region (default: uniform)
   * @param numSamples - Override for the number of samples to use in calculation
   */
  getProbabilityOfMissingRegion(
    regionSize: number, 
    samplingDensity: number = regionSize, 
    numSamples?: number
  ): number {
    const t = numSamples || this.effectiveSampleSize;
    
    // For uniform sampling, use the classic formula
    if (this.samplingDistribution === 'uniform' || samplingDensity === regionSize) {
      return Math.pow(1 - regionSize, t);
    }
    
    // For non-uniform sampling, adjust based on the true sampling density
    return Math.pow(1 - samplingDensity, t);
  }
  
  /**
   * Calculate expected information gain from next sample
   */
  getExpectedInformationGain(): number {
    // Full calculation would involve integrating KL divergence over possible outcomes
    // For simplification, we use an approximation based on effective sample size
    const totalEffectiveCount = this.alpha + this.beta;
    
    // Information gain typically decreases as 1/n with sample size
    if (totalEffectiveCount <= 1) return 1;
    return 1 / totalEffectiveCount;
  }
  
  /**
   * Get additional statistics for reporting
   */
  getStatistics() {
    return {
      mean: this.getPosteriorMean(),
      variance: (this.alpha * this.beta) / 
        (Math.pow(this.alpha + this.beta, 2) * (this.alpha + this.beta + 1)),
      effectiveSampleSize: this.effectiveSampleSize,
      successCount: this.alpha - 1, // Subtract prior
      failureCount: this.beta - 1,  // Subtract prior
      totalCount: this.effectiveSampleSize
    };
  }
}
```

### 3. Early Stopping Strategy Mixin

```typescript
/**
 * Early stopping strategy mixin for FluentCheck
 */
export function EarlyStopping<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {
    // Tracking coverage for each arbitrary
    private coverageTrackers: Record<string, DomainCoverageTracker<any>> = {};
    // Tracking confidence for test results
    private confidenceCalculator: BayesianConfidenceCalculator;
    // Track stopping decisions for metrics
    private stoppingReasons: Array<{
      criterion: string,
      arbitraryName: string,
      iteration: number,
      metrics: Record<string, number>
    }> = [];
    // Configuration for early stopping
    private earlyStoppingConfig = {
      // Confidence threshold
      confidenceThreshold: 0.95,
      // Coverage threshold
      coverageThreshold: 0.8,
      // Coverage rate of change threshold
      coverageRateThreshold: 0.001,
      // Information gain threshold
      informationGainThreshold: 0.001,
      // Sampling distribution type
      samplingDistribution: 'uniform' as 'uniform' | 'adaptive' | 'unknown',
      // Number of samples required per partition for k-sample coverage
      samplesPerPartition: 1,
      // Enable/disable different stopping criteria
      enableConfidenceBased: true,
      enableCoverageBased: true,
      enableRateOfChangeBased: true,
      enableInformationGainBased: true,
      // Strategy for combining criteria
      stoppingStrategy: 'any' as 'any' | 'all' | 'weighted',
      // Weights for different criteria (if using weighted strategy)
      criteriaWeights: {
        confidence: 1.0,
        coverage: 1.0,
        rateOfChange: 0.5,
        informationGain: 0.5
      },
      // Minimum samples before considering early stopping
      minimumSamples: 10
    };
    
    constructor(...args: any[]) {
      super(...args);
      this.confidenceCalculator = new BayesianConfidenceCalculator({
        samplingDistribution: this.earlyStoppingConfig.samplingDistribution
      });
    }
    
    /**
     * Configure early stopping parameters
     */
    configureEarlyStopping(config: Partial<typeof this.earlyStoppingConfig>) {
      this.earlyStoppingConfig = {...this.earlyStoppingConfig, ...config};
      
      // Re-initialize confidence calculator if sampling distribution changed
      if (config.samplingDistribution) {
        this.confidenceCalculator = new BayesianConfidenceCalculator({
          samplingDistribution: config.samplingDistribution
        });
      }
      
      return this;
    }
    
    /**
     * Override to initialize coverage tracking
     */
    addArbitrary<K extends string, A>(arbitraryName: K, a: Arbitrary<A>) {
      super.addArbitrary(arbitraryName, a);
      
      // Create coverage tracker for this arbitrary
      // For finite domains, we can estimate size
      const domainSize = a.estimateSize?.() ?? undefined;
      
      // Use arbitrary's partitioning if available
      const partitionFunction = a.partition?.bind(a);
      
      // Get total partitions from arbitrary if available
      const totalPartitions = a.getTotalPartitions?.() ?? undefined;
      
      this.coverageTrackers[arbitraryName] = new DomainCoverageTracker<A>({
        domainSize,
        totalPartitions,
        partitionFunction,
        samplesPerPartition: this.earlyStoppingConfig.samplesPerPartition,
        partitionSubdivider: a.subdividePartition?.bind(a)
      });
    }
    
    /**
     * Override hasInput to implement early stopping logic
     */
    hasInput<K extends string>(arbitraryName: K): boolean {
      // First check if the parent would return false
      if (!super.hasInput(arbitraryName)) {
        return false;
      }
      
      // Enforce minimum samples before early stopping
      const totalSamples = this.confidenceCalculator.getEffectiveSampleSize();
      if (totalSamples < this.earlyStoppingConfig.minimumSamples) {
        return true;
      }
      
      // Check if we should stop early
      if (this.shouldStopEarly(arbitraryName)) {
        return false;
      }
      
      return true;
    }
    
    /**
     * Override getInput to track coverage
     */
    getInput<K extends string, A>(arbitraryName: K): FluentPick<A> {
      const pick = super.getInput<K, A>(arbitraryName);
      
      // Record this sample for coverage tracking
      this.coverageTrackers[arbitraryName].recordSample(pick.value);
      
      return pick;
    }
    
    /**
     * Override handleResult to update confidence
     */
    handleResult(result: boolean) {
      // For current implementation, we don't have access to the actual sample
      // in handleResult, but in a real implementation, we'd pass the sample info
      this.confidenceCalculator.update(result);
      
      // Call super if it exists
      if (super.handleResult) {
        super.handleResult(result);
      }
    }
    
    /**
     * Get the stopping metrics for the current state
     */
    getStoppingMetrics<K extends string>(arbitraryName: K): Record<string, number> {
      const tracker = this.coverageTrackers[arbitraryName];
      
      // Coverage metrics
      const explorationRatio = tracker.getExplorationRatio();
      const kSampleCoverage = tracker.getKSampleCoverageRatio();
      const confidenceWeightedCoverage = tracker.getConfidenceWeightedCoverage();
      const coverageRateOfChange = tracker.getCoverageRateOfChange();
      const entropyCoverage = tracker.getEntropyBasedCoverage();
      
      // Confidence metrics
      const confidenceLowerBound = 
        this.confidenceCalculator.getCredibleIntervalLowerBound(0.95);
      const expectedInfoGain = 
        this.confidenceCalculator.getExpectedInformationGain();
        
      // Sample count
      const sampleCount = this.confidenceCalculator.getEffectiveSampleSize();
      
      return {
        explorationRatio,
        kSampleCoverage,
        confidenceWeightedCoverage,
        coverageRateOfChange,
        entropyCoverage,
        confidenceLowerBound,
        expectedInfoGain,
        sampleCount
      };
    }
    
    /**
     * Determine if we should stop early based on configured criteria
     */
    private shouldStopEarly<K extends string>(arbitraryName: K): boolean {
      const metrics = this.getStoppingMetrics(arbitraryName);
      const iteration = this.confidenceCalculator.getEffectiveSampleSize();
      
      // Track whether each criterion suggests stopping
      const criteriaResults = {
        confidence: false,
        coverage: false,
        rateOfChange: false,
        informationGain: false
      };
      
      // Check confidence-based stopping
      if (this.earlyStoppingConfig.enableConfidenceBased && 
          metrics.confidenceLowerBound > this.earlyStoppingConfig.confidenceThreshold) {
        criteriaResults.confidence = true;
      }
      
      // Check coverage-based stopping
      if (this.earlyStoppingConfig.enableCoverageBased && 
          !isNaN(metrics.kSampleCoverage) && 
          metrics.kSampleCoverage > this.earlyStoppingConfig.coverageThreshold) {
        criteriaResults.coverage = true;
      }
      
      // Check coverage rate of change
      if (this.earlyStoppingConfig.enableRateOfChangeBased && 
          !isNaN(metrics.coverageRateOfChange) && 
          metrics.coverageRateOfChange < this.earlyStoppingConfig.coverageRateThreshold) {
        criteriaResults.rateOfChange = true;
      }
      
      // Check information gain
      if (this.earlyStoppingConfig.enableInformationGainBased && 
          metrics.expectedInfoGain < this.earlyStoppingConfig.informationGainThreshold) {
        criteriaResults.informationGain = true;
      }
      
      // Apply the configured stopping strategy
      let shouldStop = false;
      let stoppingReason = '';
      
      if (this.earlyStoppingConfig.stoppingStrategy === 'any') {
        // Stop if any criterion is met
        if (criteriaResults.confidence) {
          shouldStop = true;
          stoppingReason = 'confidence';
        } else if (criteriaResults.coverage) {
          shouldStop = true;
          stoppingReason = 'coverage';
        } else if (criteriaResults.rateOfChange) {
          shouldStop = true;
          stoppingReason = 'rateOfChange';
        } else if (criteriaResults.informationGain) {
          shouldStop = true;
          stoppingReason = 'informationGain';
        }
      } else if (this.earlyStoppingConfig.stoppingStrategy === 'all') {
        // Stop only if all enabled criteria are met
        shouldStop = 
          (!this.earlyStoppingConfig.enableConfidenceBased || criteriaResults.confidence) &&
          (!this.earlyStoppingConfig.enableCoverageBased || criteriaResults.coverage) &&
          (!this.earlyStoppingConfig.enableRateOfChangeBased || criteriaResults.rateOfChange) &&
          (!this.earlyStoppingConfig.enableInformationGainBased || criteriaResults.informationGain);
        
        if (shouldStop) {
          stoppingReason = 'all-criteria';
        }
      } else if (this.earlyStoppingConfig.stoppingStrategy === 'weighted') {
        // Calculate weighted score
        const weights = this.earlyStoppingConfig.criteriaWeights;
        const enabledWeightSum = 
          (this.earlyStoppingConfig.enableConfidenceBased ? weights.confidence : 0) +
          (this.earlyStoppingConfig.enableCoverageBased ? weights.coverage : 0) +
          (this.earlyStoppingConfig.enableRateOfChangeBased ? weights.rateOfChange : 0) +
          (this.earlyStoppingConfig.enableInformationGainBased ? weights.informationGain : 0);
          
        const weightedScore = 
          (criteriaResults.confidence ? weights.confidence : 0) +
          (criteriaResults.coverage ? weights.coverage : 0) +
          (criteriaResults.rateOfChange ? weights.rateOfChange : 0) +
          (criteriaResults.informationGain ? weights.informationGain : 0);
          
        // Stop if weighted score is at least half the possible total
        shouldStop = weightedScore >= enabledWeightSum / 2;
        
        if (shouldStop) {
          stoppingReason = 'weighted';
        }
      }
      
      // If stopping, log the reason and metrics
      if (shouldStop) {
        this.stoppingReasons.push({
          criterion: stoppingReason,
          arbitraryName,
          iteration,
          metrics
        });
        
        console.log(`Early stopping (${stoppingReason}) at iteration ${iteration} with metrics:`, metrics);
      }
      
      return shouldStop;
    }
    
    /**
     * Get report of early stopping decisions
     */
    getEarlyStoppingReport() {
      return {
        stoppingReasons: this.stoppingReasons,
        config: this.earlyStoppingConfig,
        confidenceStatistics: this.confidenceCalculator.getStatistics(),
        totalSamples: this.confidenceCalculator.getEffectiveSampleSize()
      };
    }
  }
}
```

### 4. Strategy Factory Integration

```typescript
// Enhanced FluentStrategyFactory
export class FluentStrategyFactory {
  // ... existing code ...
  
  /**
   * Enable early stopping based on domain exploration metrics
   */
  withEarlyStopping(config?: Partial<EarlyStoppingConfig>) {
    this.strategy = EarlyStopping(this.strategy);
    // Store configuration to apply when strategy is built
    this.earlyStoppingConfig = config;
    return this;
  }
  
  /**
   * Builds and returns the FluentStrategy with specified configuration
   */
  build(): FluentStrategy {
    const strategy = new this.strategy(this.configuration);
    
    // Apply early stopping configuration if it exists
    if (this.earlyStoppingConfig && 'configureEarlyStopping' in strategy) {
      (strategy as any).configureEarlyStopping(this.earlyStoppingConfig);
    }
    
    return strategy;
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import {fc} from 'fluent-check';

// Use early stopping with default parameters
const result = fc
  .config(fc.strategyFactory().withEarlyStopping())
  .forall('n', fc.integer({min: 1, max: 100}))
  .then(({n}) => n + n === 2 * n)
  .check();

console.log(result.satisfiable); // true if property holds
```

### Advanced Configuration with Multiple Criteria

```typescript
import {fc} from 'fluent-check';

// Configure early stopping with multiple criteria and weighted strategy
const result = fc
  .config(fc.strategyFactory().withEarlyStopping({
    // Higher confidence threshold for more certainty
    confidenceThreshold: 0.99,
    // Higher coverage requirement
    coverageThreshold: 0.9,
    // More sensitive to coverage saturation
    coverageRateThreshold: 0.0005,
    // Multiple samples required per partition
    samplesPerPartition: 3,
    // Use weighted strategy for balanced approach
    stoppingStrategy: 'weighted',
    // Customize weights to prioritize coverage and confidence
    criteriaWeights: {
      confidence: 2.0,  // High priority
      coverage: 1.5,    // Medium-high priority
      rateOfChange: 1.0, // Medium priority
      informationGain: 0.5 // Lower priority
    }
  }))
  .forall('n', fc.integer({min: 1, max: 1000}))
  .forall('m', fc.integer({min: 1, max: 1000}))
  .then(({n, m}) => {
    // Property: GCD(n,m) ≤ min(n,m)
    const gcd = (a: number, b: number): number => 
      b === 0 ? a : gcd(b, a % b);
    return gcd(n, m) <= Math.min(n, m);
  })
  .check();

// Get detailed report of stopping decisions
const report = result.getEarlyStoppingReport();
console.log(`Testing stopped after ${report.totalSamples} samples`);
console.log(`Reason: ${report.stoppingReasons[0]?.criterion}`);
```

### Non-Uniform Sampling with Statistical Guarantees

```typescript
import {fc} from 'fluent-check';

// Configure early stopping with adaptive sampling
const result = fc
  .config(fc.strategyFactory()
    .withBias() // Use biased sampling for corner cases
    .withEarlyStopping({
      // Tell the early stopping about the non-uniform sampling
      samplingDistribution: 'adaptive',
      // Require high confidence despite non-uniform sampling
      confidenceThreshold: 0.98,
      // Use "all" strategy to ensure all criteria are met
      stoppingStrategy: 'all'
    })
  )
  .forall('arr', fc.array(fc.integer(), {minLength: 0, maxLength: 20}))
  .forall('elem', fc.integer())
  .then(({arr, elem}) => {
    // Property: After pushing an element, the array length increases by 1
    const oldLength = arr.length;
    arr.push(elem);
    return arr.length === oldLength + 1;
  })
  .check();

// Examine detailed statistics
const stats = result.getEarlyStoppingReport().confidenceStatistics;
console.log(`Effective sample size: ${stats.effectiveSampleSize}`);
console.log(`Posterior mean: ${stats.mean}`);
```

### Handling Complex Equivalence Classes

```typescript
import {fc} from 'fluent-check';

// Custom integer arbitrary with adaptive partitioning
class AdaptiveIntegerArbitrary extends fc.Arbitrary<number> {
  constructor(private min: number, private max: number) {
    super();
  }
  
  // Generate a random integer
  generate() {
    return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
  }
  
  // Estimate domain size
  estimateSize() {
    return this.max - this.min + 1;
  }
  
  // Get total number of initial partitions
  getTotalPartitions() {
    return 6; // Sign (pos/neg/zero) × Magnitude (small/medium/large)
  }
  
  // Partition into sign-magnitude classes
  partition(n: number): string {
    const sign = n < 0 ? 'negative' : n > 0 ? 'positive' : 'zero';
    const magnitude = 
      Math.abs(n) < 10 ? 'small' : 
      Math.abs(n) < 100 ? 'medium' : 'large';
    return `${sign}-${magnitude}`;
  }
  
  // Subdivide a partition if needed
  subdividePartition(partition: string, samples: number[]): string[] {
    // If we find varied behavior within a partition, subdivide it
    const [sign, magnitude] = partition.split('-');
    
    // For demonstration, we'll subdivide "medium" magnitude into finer ranges
    if (magnitude === 'medium') {
      return [
        `${sign}-medium-low`,  // 10-40
        `${sign}-medium-mid`,  // 41-70
        `${sign}-medium-high`  // 71-99
      ];
    }
    
    // No subdivision for other partitions
    return [partition];
  }
}

// Use the adaptive arbitrary with early stopping
const result = fc
  .config(fc.strategyFactory().withEarlyStopping({
    samplesPerPartition: 5, // Require 5 samples per partition
    coverageThreshold: 0.9  // Require 90% coverage
  }))
  .forall('n', new AdaptiveIntegerArbitrary(-200, 200))
  .then(({n}) => {
    // Property: abs(-n) = abs(n)
    return Math.abs(-n) === Math.abs(n);
  })
  .check();

// Examine coverage metrics
const report = result.getEarlyStoppingReport();
console.log(`Standard coverage: ${report.metrics.standardCoverage}`);
console.log(`k-sample coverage: ${report.metrics.kSampleCoverage}`);
console.log(`Confidence-weighted coverage: ${report.metrics.confidenceWeightedCoverage}`);
```

### Visualizing Trade-offs Between Stopping Criteria

```typescript
import {fc} from 'fluent-check';

// Function to test multiple stopping strategies and compare results
function compareStoppingStrategies(property, minSamples = 10, maxSamples = 1000) {
  const strategies = [
    { name: 'Confidence-only', config: { enableCoverageBased: false, enableRateOfChangeBased: false, enableInformationGainBased: false } },
    { name: 'Coverage-only', config: { enableConfidenceBased: false, enableRateOfChangeBased: false, enableInformationGainBased: false } },
    { name: 'Any-criterion', config: { stoppingStrategy: 'any' } },
    { name: 'All-criteria', config: { stoppingStrategy: 'all' } },
    { name: 'Weighted', config: { stoppingStrategy: 'weighted' } }
  ];
  
  return strategies.map(strategy => {
    const startTime = performance.now();
    
    const result = fc
      .config(fc.strategyFactory().withEarlyStopping({
        minimumSamples: minSamples,
        ...strategy.config
      }))
      .forall('args', fc.tuple(fc.integer({min: -100, max: 100}), fc.integer({min: -100, max: 100})))
      .then(({args}) => property(...args))
      .check();
      
    const endTime = performance.now();
    const report = result.getEarlyStoppingReport();
    
    return {
      strategy: strategy.name,
      samples: report.totalSamples,
      runtime: endTime - startTime,
      stoppingReason: report.stoppingReasons[0]?.criterion || 'reached-max-samples',
      confidenceBound: report.confidenceStatistics.credibleIntervalLowerBound,
      coverage: report.metrics.kSampleCoverage
    };
  });
}

// Test a property with multiple stopping strategies
const comparisonResults = compareStoppingStrategies(
  // Property: a + b = b + a (commutativity of addition)
  (a, b) => a + b === b + a
);

// Print the comparison table
console.table(comparisonResults);
// This would output a table comparing:
// - Strategy name
// - Samples required
// - Runtime
// - Stopping reason
// - Final confidence bound
// - Final coverage
```

## Implementation Considerations

### 1. Arbitrary Size Estimation and Partitioning

For early stopping to work effectively, arbitraries should provide information about their domain size and partitioning:

```typescript
interface Arbitrary<A> {
  // ... existing methods ...
  
  /**
   * Estimate the size of the domain
   * Returns undefined if domain size cannot be estimated
   */
  estimateSize?(): number | undefined;
  
  /**
   * Map a value to an equivalence class identifier
   * For use with domain partitioning
   */
  partition?(value: A): string;
  
  /**
   * Get the total number of partitions (equivalence classes)
   */
  getTotalPartitions?(): number | undefined;
  
  /**
   * Subdivide a partition if needed
   * Returns new partition identifiers
   */
  subdividePartition?(partition: string, samples: A[]): string[];
}
```

### 2. Handling Non-Uniform Sampling

When adaptive or biased sampling is used, statistical guarantees must be adjusted. The framework should:

```typescript
/**
 * Calculate probability of missing a region under non-uniform sampling
 */
function calculateMissProbability(
  regionSize: number,
  samplingDensity: number,
  sampleCount: number
): number {
  // For uniform sampling
  if (samplingDensity === regionSize) {
    return Math.pow(1 - regionSize, sampleCount);
  }
  
  // For non-uniform sampling, adjust for actual density
  return Math.pow(1 - samplingDensity, sampleCount);
}

/**
 * Estimate minimum sampling density for a given region
 */
function estimateMinimumSamplingDensity(
  samplingStrategy: Function,
  region: Region
): number {
  // For kernel-based methods:
  // Evaluate p(x) at various points in the region
  // Return the minimum value
  
  // Simplified example:
  const samplePoints = generateSamplePointsInRegion(region);
  const densities = samplePoints.map(samplingStrategy);
  return Math.min(...densities);
}
```

### 3. Multiple Samples Per Equivalence Class

Requiring multiple samples per class ensures more reliable detection of violations:

```typescript
/**
 * Calculate k-sample coverage ratio
 */
function calculateKSampleCoverage(
  partitionCounts: Map<string, number>,
  totalPartitions: number,
  k: number
): number {
  const adequatelySampledCount = Array.from(partitionCounts.values())
    .filter(count => count >= k)
    .length;
    
  return adequatelySampledCount / totalPartitions;
}

/**
 * Calculate confidence-weighted coverage
 */
function calculateConfidenceWeightedCoverage(
  partitionCounts: Map<string, number>,
  totalPartitions: number,
  k: number
): number {
  const coverageSum = Array.from(partitionCounts.values())
    .reduce((sum, count) => sum + Math.min(1, count / k), 0);
    
  return coverageSum / totalPartitions;
}
```

### 4. Trade-offs Between Stopping Criteria

The framework provides several ways to combine stopping criteria:

1. **Any-criterion stopping**: Stop when any criterion is met. Provides faster testing but may sacrifice thoroughness.

2. **All-criteria stopping**: Stop only when all criteria are met. Provides highest certainty but requires more test cases.

3. **Weighted stopping**: Combines criteria using weights to balance between confidence, coverage, and efficiency.

4. **Context-dependent stopping**: Adjust criteria based on the testing context:
   ```typescript
   function getContextBasedStoppingConfig(context: TestContext): StoppingConfig {
     if (context.phase === 'development') {
       return {
         stoppingStrategy: 'any',
         minimumSamples: 20,
         confidenceThreshold: 0.9
       };
     } else if (context.phase === 'release') {
       return {
         stoppingStrategy: 'all',
         minimumSamples: 100,
         confidenceThreshold: 0.99,
         coverageThreshold: 0.95,
         samplesPerPartition: 5
       };
     } 
     // Additional contexts...
   }
   ```

### 5. Reporting and Visualization

A comprehensive report helps understand why testing stopped and how thorough it was:

```typescript
interface EarlyStoppingReport {
  stoppingDecision: {
    criterion: string,
    iteration: number,
    metrics: Record<string, number>
  };
  confidenceMetrics: {
    mean: number,
    credibleIntervalLowerBound: number,
    effectiveSampleSize: number
  };
  coverageMetrics: {
    standardCoverage: number,
    kSampleCoverage: number,
    confidenceWeightedCoverage: number,
    entropyBasedCoverage: number
  };
  efficiencyMetrics: {
    testCasesVsFixed: number, // % reduction compared to fixed sample approach
    timeToDecision: number    // ms until stopping
  };
  visualizations?: {
    rateOfChangeOverTime: [number, number][],  // [iteration, rate]
    confidenceOverTime: [number, number][],     // [iteration, confidence]
    coverageOverTime: [number, number][]        // [iteration, coverage]
  };
}
```

## Conclusion

Implementing early stopping based on domain exploration metrics requires:

1. Enhanced arbitraries that provide domain information and partition capabilities
2. Robust statistical foundations that handle non-uniform sampling
3. Sophisticated coverage metrics that address granularity limitations
4. Flexible frameworks for combining stopping criteria
5. Comprehensive reporting for understanding test adequacy

By implementing these components, the framework can significantly reduce testing overhead while maintaining or improving the reliability of property verification. The pseudo-code provided here complements the mathematical treatise in `early-stopping.md` by showing how these concepts can be implemented in practice. 