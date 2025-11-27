declare module 'jstat' {
  export const beta: {
    mean(alpha: number, beta: number): number
    mode(alpha: number, beta: number): number
    pdf(x: number, alpha: number, beta: number): number
    cdf(x: number, alpha: number, beta: number): number
    inv(p: number, alpha: number, beta: number): number
  }

  export const binomial: {
    pdf(k: number, n: number, p: number): number
    cdf(k: number, n: number, p: number): number
  }

  export function gammaln(x: number): number

  const jstat: {
    beta: typeof beta
    binomial: typeof binomial
    gammaln: typeof gammaln
  }

  export default jstat
}
