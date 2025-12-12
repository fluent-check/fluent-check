declare module 'jstat' {
  // Vector Functionality
  export function sum(arr: number[]): number
  export function sumsqrd(arr: number[]): number
  export function sumsqerr(arr: number[]): number
  export function product(arr: number[]): number
  export function min(arr: number[]): number
  export function max(arr: number[]): number
  export function mean(arr: number[]): number
  export function meansqerr(arr: number[]): number
  export function geomean(arr: number[]): number
  export function median(arr: number[]): number
  export function cumsum(arr: number[]): number[]
  export function cumprod(arr: number[]): number[]
  export function diff(arr: number[]): number[]
  export function rank(arr: number[]): number[]
  export function mode(arr: number[]): number
  export function range(arr: number[]): number
  export function variance(arr: number[]): number
  export function deviation(arr: number[]): number[]
  export function stdev(arr: number[]): number
  export function meandev(arr: number[]): number
  export function meddev(arr: number[]): number
  export function skewness(arr: number[]): number
  export function kurtosis(arr: number[]): number
  export function coeffvar(arr: number[]): number
  export function quartiles(arr: number[]): [number, number, number]
  export function quantiles(arr: number[], quantiles: number[]): number[]
  export function percentile(arr: number[], k: number, exclusive?: boolean): number
  export function percentileOfScore(arr: number[], score: number, kind?: 'strict' | 'weak'): number
  export function histogram(arr: number[], bins?: number): number[]
  export function covariance(arr1: number[], arr2: number[]): number
  export function corrcoeff(arr1: number[], arr2: number[]): number

  // Distributions
  export const beta: Distribution
  export const centralF: Distribution
  export const cauchy: Distribution
  export const chisquare: Distribution
  export const exponential: Distribution
  export const gamma: Distribution
  export const invgamma: Distribution
  export const kumaraswamy: Distribution
  export const lognormal: Distribution
  export const normal: Distribution
  export const pareto: Distribution
  export const studentt: Distribution
  export const tukey: Distribution
  export const weibull: Distribution
  export const uniform: Distribution
  export const binomial: DiscreteDistribution
  export const negbin: DiscreteDistribution
  export const hypgeom: DiscreteDistribution
  export const poisson: DiscreteDistribution
  export const triangular: Distribution
  export const arcsine: Distribution

  // Special Functions
  export function betafn(x: number, y: number): number
  export function betaln(x: number, y: number): number
  export function gammafn(x: number): number
  export function gammaln(x: number): number
  export function factorial(n: number): number
  export function factorialln(n: number): number
  export function combination(n: number, m: number): number
  export function permutation(n: number, m: number): number
  export function erf(x: number): number
  export function erfc(x: number): number
  export function randn(n: number, m: number): number[][] | number[]
  export function randg(shape: number, n: number, m: number): number[][] | number[]

  interface Distribution {
    pdf(x: number, ...args: number[]): number
    cdf(x: number, ...args: number[]): number
    inv(p: number, ...args: number[]): number
    mean(...args: number[]): number
    median(...args: number[]): number
    mode(...args: number[]): number
    sample(...args: number[]): number
    variance(...args: number[]): number
  }

  interface DiscreteDistribution {
    pdf(k: number, ...args: number[]): number
    cdf(k: number, ...args: number[]): number
    sample?(...args: number[]): number
  }

  const jstat: {
    // Core
    sum: typeof sum
    min: typeof min
    max: typeof max
    mean: typeof mean
    median: typeof median
    mode: typeof mode
    variance: typeof variance
    stdev: typeof stdev
    skewness: typeof skewness
    kurtosis: typeof kurtosis
    percentile: typeof percentile
    
    // Distributions
    beta: typeof beta
    centralF: typeof centralF
    cauchy: typeof cauchy
    chisquare: typeof chisquare
    exponential: typeof exponential
    gamma: typeof gamma
    invgamma: typeof invgamma
    kumaraswamy: typeof kumaraswamy
    lognormal: typeof lognormal
    normal: typeof normal
    pareto: typeof pareto
    studentt: typeof studentt
    tukey: typeof tukey
    weibull: typeof weibull
    uniform: typeof uniform
    binomial: typeof binomial
    negbin: typeof negbin
    hypgeom: typeof hypgeom
    poisson: typeof poisson
    triangular: typeof triangular
    arcsine: typeof arcsine

    // Special
    gammaln: typeof gammaln
    factorial: typeof factorial
    combination: typeof combination
  }

  export default jstat
}
