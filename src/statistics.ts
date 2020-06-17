export class BetaDistribution {
    constructor(public alpha: number, public beta: number) { }

    update(successes: number, failures: number) {
        this.alpha += successes
        this.beta += failures
    }

    mean() { return this.alpha / (this.alpha + this.beta) }
    mode() { return (this.alpha - 1) / (this.alpha + this.beta - 2)}
}