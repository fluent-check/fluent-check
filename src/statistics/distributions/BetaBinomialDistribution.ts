import jstat from 'jstat'
import {IntegerDistribution} from './IntegerDistribution.js'

/**
 * A beta-binomial distribution (https://en.wikipedia.org/wiki/Beta-binomial_distribution).
 */
export class BetaBinomialDistribution extends IntegerDistribution {
  constructor(public trials: number, public alpha: number, public beta: number) { super() }

  pdf(x: number): number { return Math.exp(this.#logPdf(x)) }
  supportMin(): number { return 0 }
  supportMax(): number { return this.trials }

  override mean(): number { return this.trials * this.alpha / (this.alpha + this.beta) }

  override mode(): number {
    if (this.alpha <= 1.0 || this.beta <= 1.0) {
      return this.beta >= this.alpha ? 0 : this.trials
    }
    // for alpha > 1 && beta > 1 this is an approximation
    return Math.round(this.trials * (this.alpha - 1.0) / (this.alpha + this.beta - 2.0))
  }

  // TODO: implement efficient calculation of CDF (currently O(trials))
  // cdf(k: number): number

  #logPdf(x: number) {
    // Use gammaln for numerical stability with large trials (>170 would overflow factorial)
    const logCombination = jstat.gammaln(this.trials + 1) - jstat.gammaln(x + 1) - jstat.gammaln(this.trials - x + 1)
    return logCombination +
      this.#betaln(x + this.alpha, this.trials - x + this.beta) -
      this.#betaln(this.alpha, this.beta)
  }

  #betaln(a: number, b: number): number {
    return jstat.gammaln(a) + jstat.gammaln(b) - jstat.gammaln(a + b)
  }
}
