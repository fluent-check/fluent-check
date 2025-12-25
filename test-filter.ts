import * as fc from './src/index.js'

function mulberry32(seed: number): () => number {
  return function () {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Test filter cascade
const baseArb = fc.integer(0, 999)
const modulus = 2 // For 50% pass rate
const filteredArb = baseArb.filter(x => x % modulus === 0)

const seen = new Set<number>()
const rng = mulberry32(12345)

for (let i = 0; i < 10000; i++) {
  const value = filteredArb.pick(rng)
  seen.add(value)
  if (i < 20) {
    console.log(`Sample ${i}: ${value}`)
  }
}

console.log(`\nTotal distinct values: ${seen.size}`)
console.log(`Expected: ~500 (every even number from 0-999)`)
const sorted = Array.from(seen).sort((a,b) => a-b)
console.log(`First 20 unique values: ${sorted.slice(0, 20).join(', ')}`)
