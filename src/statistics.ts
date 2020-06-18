import * as stats from "jstat"

export class BetaDistribution {
  constructor(public alpha: number, public beta: number) { }

  update(successes: number, failures: number): void {
    this.alpha += successes
    this.beta += failures
  }

  mean(): number { return stats.beta.mean(this.alpha, this.beta) }
  mode(): number { return stats.beta.mode(this.alpha, this.beta) }

  pdf(x: number): number { return stats.beta.pdf(x, this.alpha, this.beta) }
  cdf(x: number): number { return stats.beta.cdf(x, this.alpha, this.beta) }
  inv(x: number): number { return stats.beta.inv(x, this.alpha, this.beta) }
}
