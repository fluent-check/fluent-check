import * as stats from 'jstat'

export abstract class Distribution {
  abstract mean(): number
  abstract mode(): number
  abstract pdf(x: number): number
  abstract cdf(x: number): number
  abstract inv(p: number): number
}

export abstract class IntegerDistribution extends Distribution {
  abstract supportMin(): number
  abstract supportMax(): number

  // Default implementation is O(n) on the support size
  mean(): number {
    const n = this.supportMax() - this.supportMin()
    return [...Array(n + 1)].reduce((acc, _, i) => acc + this.pdf(this.supportMin() + i) * i, 0)
  }

  // Default implementation is O(n) on the support size. Can be made better if distribution is
  // known to be unimodal
  mode(): number {
    const n = this.supportMax() - this.supportMin()
    return [...Array(n + 1)].reduce(([curr, currP], _, i) => {
      const p = this.pdf(this.supportMin() + i)
      return p > currP ? [this.supportMin() + i, p] : [curr, currP]
    },[NaN, 0])[0]
  }

  // Default implementation is O(n * pdf), where `pdf` is the time complexity of pdf(k)
  cdf(k: number): number {
    if (k < this.supportMin()) return 0.0
    if (k >= this.supportMax()) return 1.0
    return [...Array(k - this.supportMin() + 1)]
      .reduce((acc, _, i) => acc + this.pdf(this.supportMin() + i), 0)
  }

  // Default implementation is O(n * cdf), where `cdf` is the time complexity of cdf(k)
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

export class BetaDistribution extends Distribution {
  constructor(public alpha: number, public beta: number) {
    super()
  }

  mean(): number { return stats.beta.mean(this.alpha, this.beta) }
  mode(): number { return stats.beta.mode(this.alpha, this.beta) }
  pdf(x: number): number { return stats.beta.pdf(x, this.alpha, this.beta) }
  cdf(x: number): number { return stats.beta.cdf(x, this.alpha, this.beta) }
  inv(x: number): number { return stats.beta.inv(x, this.alpha, this.beta) }
}

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

  // TODO: implement efficient CDF calculation (currently O(trials))
  // cdf(k: number): number

  private logPdf(x: number) {
    return stats.combinationln(this.trials, x) +
      stats.betaln(x + this.alpha, this.trials - x + this.beta) -
      stats.betaln(this.alpha, this.beta)
  }
}
