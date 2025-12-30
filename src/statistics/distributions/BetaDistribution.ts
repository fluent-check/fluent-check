import jstat from 'jstat'
import {Distribution} from './Distribution.js'

/**
 * A beta distribution (https://en.wikipedia.org/wiki/Beta_distribution).
 */
export class BetaDistribution extends Distribution {
  constructor(public alpha: number, public beta: number) {
    super()
  }

  mean(): number { return jstat.beta.mean(this.alpha, this.beta) }
  mode(): number { return jstat.beta.mode(this.alpha, this.beta) }
  pdf(x: number): number { return jstat.beta.pdf(x, this.alpha, this.beta) }
  cdf(x: number): number { return jstat.beta.cdf(x, this.alpha, this.beta) }
  inv(x: number): number { return jstat.beta.inv(x, this.alpha, this.beta) }
}
