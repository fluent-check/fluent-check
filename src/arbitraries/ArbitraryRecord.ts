import { FluentPick, ArbitrarySize } from './types.js'
import { mapArbitrarySize } from './util.js'
import { Arbitrary, NoArbitrary } from './internal.js'

/**
 * Arbitrary implementation for generating Record objects (plain JS objects)
 */
export class ArbitraryRecord<V> extends Arbitrary<Record<string, V>> {
  constructor(
    public keyArbitrary: Arbitrary<string>,
    public valueArbitrary: Arbitrary<V>,
    public minSize = 0,
    public maxSize = 10
  ) {
    super()
  }

  /**
   * Calculate the size of the generated arbitrary
   */
  size(): ArbitrarySize {
    // Simple estimation of size
    const keySize = this.keyArbitrary.size().value
    const valueSize = this.valueArbitrary.size().value
    const sizeRange = this.maxSize - this.minSize + 1
    
    // Cap to avoid overflow
    const combinedSize = Math.min(1000000, keySize * valueSize * sizeRange)
    
    const arbitrarySize: ArbitrarySize = {
      type: 'estimated', 
      value: combinedSize, 
      credibleInterval: [combinedSize / 2, combinedSize * 2]
    }
    
    return mapArbitrarySize(arbitrarySize, _ => arbitrarySize)
  }

  /**
   * Generate a random record
   */
  pick(generator: () => number): FluentPick<Record<string, V>> | undefined {
    // Determine the size of the record
    const targetSize = Math.floor(generator() * (this.maxSize - this.minSize + 1)) + this.minSize
    
    // Early return for empty records
    if (targetSize === 0) {
      return {
        value: {},
        original: {}
      }
    }
    
    // Generate unique keys
    const keys: string[] = []
    const keyOriginals: any[] = []
    const keySet = new Set<string>()
    
    let attempts = 0
    // Limit attempts to avoid infinite loops
    const maxAttempts = targetSize * 3
    
    while (keys.length < targetSize && attempts < maxAttempts) {
      const keyPick = this.keyArbitrary.pick(generator)
      attempts++
      
      if (!keyPick) continue
      
      if (!keySet.has(keyPick.value)) {
        keys.push(keyPick.value)
        keyOriginals.push(keyPick.original !== undefined ? keyPick.original : keyPick.value)
        keySet.add(keyPick.value)
      }
    }
    
    // If we couldn't generate any keys, return undefined
    if (keys.length === 0) {
      return undefined
    }
    
    // Generate values for each key
    const record: Record<string, V> = {}
    const original: Record<string, any> = {}
    
    for (let i = 0; i < keys.length; i++) {
      const valuePick = this.valueArbitrary.pick(generator)
      if (!valuePick) continue
      
      record[keys[i]] = valuePick.value
      original[keyOriginals[i]] = valuePick.original !== undefined ? valuePick.original : valuePick.value
    }
    
    return {
      value: record,
      original
    }
  }

  /**
   * Check if this arbitrary can generate a specific record
   */
  canGenerate(pick: FluentPick<Record<string, V>>): boolean {
    const recordEntries = Object.entries(pick.value)
    
    // Size constraints
    if (recordEntries.length < this.minSize || recordEntries.length > this.maxSize) {
      return false
    }
    
    // Check if all keys and values are generatable
    for (const [key, value] of recordEntries) {
      const keyPick: FluentPick<string> = { value: key }
      if (!this.keyArbitrary.canGenerate(keyPick)) {
        return false
      }
      
      const valuePick: FluentPick<V> = { value }
      if (!this.valueArbitrary.canGenerate(valuePick)) {
        return false
      }
    }
    
    return true
  }

  /**
   * Implement shrinking for records
   */
  shrink(initial: FluentPick<Record<string, V>>): Arbitrary<Record<string, V>> {
    const entries = Object.entries(initial.value)
    const size = entries.length
    
    // If already at minimum size, nothing to shrink
    if (size <= this.minSize) {
      return NoArbitrary
    }
    
    // Shrink by removing one entry
    return new ArbitraryRecord<V>(
      this.keyArbitrary,
      this.valueArbitrary,
      this.minSize,
      size - 1
    )
  }

  /**
   * Generate corner cases for testing
   */
  cornerCases(): FluentPick<Record<string, V>>[] {
    const result: FluentPick<Record<string, V>>[] = []
    
    // Empty record (if allowed)
    if (this.minSize === 0) {
      result.push({ value: {}, original: {} })
    }
    
    // Small record with corner case values
    const keyCases = this.keyArbitrary.cornerCases()
    const valueCases = this.valueArbitrary.cornerCases()
    
    if (keyCases.length > 0 && valueCases.length > 0) {
      const record: Record<string, V> = {}
      record[keyCases[0].value] = valueCases[0].value
      
      const original: Record<string, any> = {}
      original[keyCases[0].original !== undefined ? keyCases[0].original : keyCases[0].value] = 
        valueCases[0].original !== undefined ? valueCases[0].original : valueCases[0].value
      
      result.push({ value: record, original })
    }
    
    return result
  }

  /**
   * String representation for debugging
   */
  toString(depth = 0): string {
    return ' '.repeat(depth * 2) +
      `Record Arbitrary: minSize = ${this.minSize} maxSize = ${this.maxSize}\n` +
      `${' '.repeat((depth + 1) * 2)}Key: ${this.keyArbitrary.toString(depth + 2)}\n` +
      `${' '.repeat((depth + 1) * 2)}Value: ${this.valueArbitrary.toString(depth + 2)}`
  }
} 