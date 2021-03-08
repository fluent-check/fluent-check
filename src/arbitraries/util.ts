import {ArbitrarySize} from './types'

export function mapArbitrarySize(sz: ArbitrarySize, f: (v: number) => ArbitrarySize): ArbitrarySize {
  const result = f(sz.value)
  return {
    value : result.value,
    type : sz.type === 'exact' && result.type === 'exact' ? 'exact' : 'estimated',
    credibleInterval : result.credibleInterval
  }
}

export function stringify(object: any) {
  return (object instanceof Object || object instanceof Array) ? JSON.stringify(object) : object
}

//Splitmix64 code adapted from https://prng.di.unimi.it/splitmix64.c
export function splitmix64(x: {val: number}) {
  let z: number = (x.val += 0x9e3779b97f4a7c15)
  z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9
  z = (z ^ (z >> 27)) * 0x94d049bb133111eb
  return z ^ (z >> 31)
}

export const NilArbitrarySize: ArbitrarySize = {value: 0, type: 'exact'}
export const significance = 0.90
export const lowerCredibleInterval = (1 - significance) / 2
export const upperCredibleInterval = 1 - lowerCredibleInterval
