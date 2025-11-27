import jstat from 'jstat'

/**
 * A probability distribution (https://en.wikipedia.org/wiki/Probability_distribution).
 */
export abstract class Distribution {
  abstract mean(): number
  abstract mode(): number
  abstract pdf(x: number): number
  abstract cdf(x: number): number
  abstract inv(p: number): number
}

/**
 * A discrete probability distribution where the support is a contiguous set of integers.
 */
export abstract class IntegerDistribution extends Distribution {
  abstract supportMin(): number
  abstract supportMax(): number

  // Default implementation is O(n) on the support size
  mean(): number {
    let avg = 0
    for (let k = this.supportMin(); k <= this.supportMax(); k++) {
      avg += k * this.pdf(k)
    }
    return avg
  }

  // Default implementation is O(n) on the support size. Can be made better if distribution is
  // known to be unimodal
  mode(): number {
    let max = NaN, maxP = 0
    for (let k = this.supportMin(); k <= this.supportMax(); k++) {
      const p = this.pdf(k)
      if (p > maxP) { max = k; maxP = p }
    }
    return max
  }

  // Default implementation is O(n * pdf), where `pdf` is the time complexity of pdf(k)
  cdf(k: number): number {
    if (k < this.supportMin()) return 0.0
    if (k >= this.supportMax()) return 1.0
    let sum = 0
    for (let k2 = this.supportMin(); k2 <= k; k2++) {
      sum += this.pdf(k2)
    }
    return sum
  }

  // Default implementation is O(log(n) * cdf), where `cdf` is the time complexity of cdf(k)
  inv(p: number): number {
    let low = this.supportMin(), high = this.supportMax()
    while (low < high) {
      const mid = Math.floor((high + low) / 2)
      if (this.cdf(mid) >= p) high = mid
      else low = mid + 1
    }
    return low
  }
}

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

/**
 * A beta-binomial distribution (https://en.wikipedia.org/wiki/Beta-binomial_distribution).
 */
export class BetaBinomialDistribution extends IntegerDistribution {
  constructor(public trials: number, public alpha: number, public beta: number) { super() }

  pdf(x: number): number { return Math.exp(this.logPdf(x)) }
  supportMin(): number { return 0 }
  supportMax(): number { return this.trials }

  mean(): number { return this.trials * this.alpha / (this.alpha + this.beta) }

  mode(): number {
    if (this.alpha <= 1.0 || this.beta <= 1.0) {
      return this.beta >= this.alpha ? 0 : this.trials
    }
    // for alpha > 1 && beta > 1 this is an approximation
    return Math.round(this.trials * (this.alpha - 1.0) / (this.alpha + this.beta - 2.0))
  }

  // TODO: implement efficient calculation of CDF (currently O(trials))
  // cdf(k: number): number

  private logPdf(x: number) {
    return this.combinationln(this.trials, x) +
      this.betaln(x + this.alpha, this.trials - x + this.beta) -
      this.betaln(this.alpha, this.beta)
  }

  // Helper functions since jstat's API changed
  private combinationln(n: number, k: number): number {
    return this.factorialln(n) - this.factorialln(k) - this.factorialln(n - k)
  }

  private betaln(a: number, b: number): number {
    return jstat.gammaln(a) + jstat.gammaln(b) - jstat.gammaln(a + b)
  }

  private factorialln(n: number): number {
    return jstat.gammaln(n + 1)
  }
}

export const factorial = (n: number) => {
  let x = 1, f = 1
  while (x <= n) f *= x++
  return f
}
