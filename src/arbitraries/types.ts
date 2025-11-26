export type FluentPick<V> = {
  value: V
  original?: any
}

export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval: [number, number]
}

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
export type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U

export class FluentRandomGenerator {
  generator!: () => number

  constructor(
    public readonly builder: (seed: number) => () => number = (_: number) => Math.random,
    public readonly seed: number = Math.floor(Math.random() * 0x100000000)) {

    this.initialize()
  }

  initialize() { this.generator = this.builder(this.seed) }
}

// Template literal types for pattern validation

/** Escape sequences: \d, \w, \s, \D, \W, \S */
export type EscapeSequence = `\\${'d' | 'w' | 's' | 'D' | 'W' | 'S'}`

/** Character class brackets like [a-z], [0-9] */
export type CharClassBracket = `[${string}]`

/** Valid character class map keys */
export type CharClassKey = EscapeSequence | CharClassBracket | '.'

/** Hex digit characters for UUID and hex generation */
export type HexChar = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f'

/** IPv4 address pattern */
export type IPv4Address = `${number}.${number}.${number}.${number}`

/** HTTP protocol variants */
export type HttpProtocol = 'http' | 'https'

/** HTTP URL pattern */
export type HttpUrl = `${HttpProtocol}://${string}`
