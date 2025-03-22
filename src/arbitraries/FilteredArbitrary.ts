import {BetaDistribution, BetaBinomialDistribution} from '../statistics.js'
import {FluentPick, ArbitrarySize} from './types.js'
import {Arbitrary, NoArbitrary, WrappedArbitrary} from './internal.js'
import {lowerCredibleInterval, mapArbitrarySize, upperCredibleInterval} from './util.js'

export class FilteredArbitrary<A> extends WrappedArbitrary<A> {
  sizeEstimation: BetaDistribution
  // Track filter acceptance statistics
  private acceptCount = 0
  private rejectCount = 0

  constructor(readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => boolean) {
    super(baseArbitrary)
    // Start with a weak prior that favors 50% acceptance (Beta(1, 1))
    this.sizeEstimation = new BetaDistribution(1, 1)
  }

  size(): ArbitrarySize {
    // If we haven't sampled anything yet, try to get an initial estimate
    if (this.acceptCount === 0 && this.rejectCount === 0) {
      // Sample a small number of values to initialize our estimate
      const sampleSize = Math.min(30, this.baseArbitrary.size().value);
      const generator = () => Math.random(); // Use a fixed generator for repeatability
      const samples = this.baseArbitrary.sample(sampleSize, generator);
      
      for (const pick of samples) {
        if (this.f(pick.value)) {
          this.acceptCount++;
        } else {
          this.rejectCount++;
        }
      }
      
      // If we still haven't seen any accepted values, use a conservative estimate
      if (this.acceptCount === 0) {
        // Use Beta(0.5, samples.length + 0.5) for a conservative estimate
        this.sizeEstimation = new BetaDistribution(0.5, samples.length + 0.5);
      } else {
        // Update Beta distribution with our samples
        this.sizeEstimation = new BetaDistribution(
          this.acceptCount + 1, // +1 for prior
          this.rejectCount + 1  // +1 for prior
        );
      }
    }

    // For integer domains, use a beta-binomial distribution when base size is exact and reasonable
    const baseSize = this.baseArbitrary.size();
    if (baseSize.type === 'exact' && baseSize.value <= Number.MAX_SAFE_INTEGER) {
      // Use beta-binomial for more accurate interval estimation
      const bbDist = new BetaBinomialDistribution(
        baseSize.value,
        this.acceptCount + 1,  // +1 for prior
        this.rejectCount + 1   // +1 for prior
      );
      
      // Return credible interval based on beta-binomial distribution
      return {
        type: 'estimated' as const,
        value: Math.round(bbDist.mean()),
        credibleInterval: [
          bbDist.inv(lowerCredibleInterval),
          bbDist.inv(upperCredibleInterval)
        ]
      };
    }
    
    // Use beta distribution for large or estimated base sizes
    return mapArbitrarySize(baseSize, v => ({
      type: 'estimated' as const,
      value: Math.round(v * this.sizeEstimation.mean()),
      credibleInterval: [
        Math.ceil(v * this.sizeEstimation.inv(lowerCredibleInterval)),
        Math.floor(v * this.sizeEstimation.inv(upperCredibleInterval))
      ]
    }))
  }

  pick(generator: () => number): FluentPick<A> | undefined {
    let attempts = 0;
    const maxAttempts = 100; // Avoid infinite loops
    
    do {
      const pick = this.baseArbitrary.pick(generator)
      if (pick === undefined) break
      
      if (this.f(pick.value)) { 
        this.acceptCount += 1;
        // Update size estimation with new evidence
        this.sizeEstimation = new BetaDistribution(
          this.acceptCount + 1,  // +1 for prior 
          this.rejectCount + 1   // +1 for prior
        );
        return pick;
      }
      
      this.rejectCount += 1;
      attempts++;
      
      // Update size estimation with new evidence
      this.sizeEstimation = new BetaDistribution(
        this.acceptCount + 1,  // +1 for prior
        this.rejectCount + 1   // +1 for prior
      );
      
      // If we have a pretty good confidence that the size < 1, we stop trying
    } while (this.baseArbitrary.size().value * this.sizeEstimation.inv(upperCredibleInterval) >= 1 
             && attempts < maxAttempts);

    return undefined;
  }

  cornerCases() { return this.baseArbitrary.cornerCases().filter(a => this.f(a.value)) }

  shrink(initialValue: FluentPick<A>) {
    if (!this.f(initialValue.value)) return NoArbitrary
    return this.baseArbitrary.shrink(initialValue).filter(v => this.f(v))
  }

  canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick) && this.f(pick.value)
  }

  toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      `Filtered Arbitrary: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
