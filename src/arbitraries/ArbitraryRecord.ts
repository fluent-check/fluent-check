import {type ArbitrarySize, type FluentPick} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {Arbitrary} from './internal.js'
import {exactSize, estimatedSize, FNV_OFFSET_BASIS, mix, stringToHash} from './util.js'
import * as fc from './index.js'
import {assertSchemaValid} from '../util/assertions.js'

type RecordSchema = Record<string, Arbitrary<unknown> | undefined>
type ValidatedSchema<S extends RecordSchema> = { [K in keyof S]-?: NonNullable<S[K]> }
type UnwrapSchema<S extends RecordSchema> =
  { [K in keyof S]: ValidatedSchema<S>[K] extends Arbitrary<infer T> ? T : never }

export class ArbitraryRecord<S extends RecordSchema> extends Arbitrary<UnwrapSchema<S>> {
  readonly #keys: (keyof S)[]
  readonly #schema: ValidatedSchema<S>

  constructor(schema: S) {
    super()
    this.#keys = Object.keys(schema) as (keyof S)[]
    // Validate once at construction: all schema entries for known keys must be defined
    assertSchemaValid(schema, this.#keys)
    this.#schema = schema
  }

  /**
   * Gets an arbitrary for a key that is guaranteed to exist (validated at construction).
   * Returns NonNullable type since keys in #keys are validated.
   */
  private getArbitrary<K extends keyof S>(key: K): ValidatedSchema<S>[K] {
    return this.#schema[key]
  }

  override size(): ArbitrarySize {
    if (this.#keys.length === 0) return exactSize(1)

    let value = 1
    let isEstimated = false

    for (const key of this.#keys) {
      const arbitrary = this.getArbitrary(key)
      const size = arbitrary.size()
      if (size.type === 'estimated') isEstimated = true
      value *= size.value
    }

    return isEstimated ? estimatedSize(value, [value, value]) : exactSize(value)
  }

  override pick(generator: () => number): FluentPick<UnwrapSchema<S>> | undefined {
    const value: Record<string, unknown> = {}
    const original: Record<string, unknown> = {}

    for (const key of this.#keys) {
      const arbitrary = this.getArbitrary(key)
      const pick = arbitrary.pick(generator)
      if (pick === undefined) return undefined
      value[key as string] = pick.value
      original[key as string] = pick.original
    }

    return {value: value as UnwrapSchema<S>, original}
  }

  override cornerCases(): FluentPick<UnwrapSchema<S>>[] {
    if (this.#keys.length === 0) {
      return [{value: {} as UnwrapSchema<S>, original: {}}]
    }

    const cornerCasesPerKey = this.#keys.map(key => {
      const arbitrary = this.getArbitrary(key)
      return {
        key,
        cases: arbitrary.cornerCases()
      }
    })

    // Generate cartesian product of all corner cases
    let combinations: FluentPick<UnwrapSchema<S>>[] = [{
      value: {} as UnwrapSchema<S>,
      original: {}
    }]

    for (const {key, cases} of cornerCasesPerKey) {
      if (cases.length === 0) continue
      combinations = combinations.flatMap(combo =>
        cases.map(cc => ({
          value: {...combo.value, [key]: cc.value} as UnwrapSchema<S>,
          original: {...(combo.original as Record<string, unknown>), [key]: cc.original}
        }))
      )
    }

    return combinations
  }

  override shrink(initial: FluentPick<UnwrapSchema<S>>): Arbitrary<UnwrapSchema<S>> {
    if (this.#keys.length === 0) return fc.empty()

    const value = initial.value as Record<string, unknown>
    const original = (initial.original ?? value) as Record<string, unknown>

    // Create a union of records where one property is shrunk at a time
    const shrunkArbitraries = this.#keys.map(selectedKey => {
      const newSchema: Record<string, Arbitrary<unknown>> = {}

      for (const key of this.#keys) {
        const arbitrary = this.getArbitrary(key)
        if (key === selectedKey) {
          newSchema[key as string] = arbitrary.shrink({
            value: value[key as string],
            original: original[key as string]
          })
        } else {
          newSchema[key as string] = fc.constant(value[key as string])
        }
      }

      return fc.record(newSchema)
    })

    return fc.union(...shrunkArbitraries) as Arbitrary<UnwrapSchema<S>>
  }

  override canGenerate(pick: FluentPick<UnwrapSchema<S>>): boolean {
    const value = pick.value as Record<string, unknown>
    const original = (pick.original ?? value) as Record<string, unknown>

    for (const key of this.#keys) {
      const arbitrary = this.getArbitrary(key)
      if (!arbitrary.canGenerate({
        value: value[key as string],
        original: original[key as string]
      })) {
        return false
      }
    }

    return true
  }

  /** Composes property hashes to create record hash */
  override hashCode(): HashFunction {
    const propertyHashes = new Map<keyof S, HashFunction>()
    for (const key of this.#keys) {
      const arbitrary = this.getArbitrary(key)
      propertyHashes.set(key, arbitrary.hashCode())
    }
    return (record: unknown): number => {
      const obj = record as Record<string, unknown>
      let hash = FNV_OFFSET_BASIS
      // Mix in key count for differentiation
      hash = mix(hash, this.#keys.length)
      for (const key of this.#keys) {
        // Mix key name hash for order-independence within same key set
        hash = mix(hash, stringToHash(String(key)))
        const keyHash = propertyHashes.get(key)
        if (keyHash !== undefined) {
          hash = mix(hash, keyHash(obj[key as string]))
        }
      }
      return hash
    }
  }

  /** Composes property equality for record comparison */
  override equals(): EqualsFunction {
    const propertyEquals = new Map<keyof S, EqualsFunction>()
    for (const key of this.#keys) {
      const arbitrary = this.getArbitrary(key)
      propertyEquals.set(key, arbitrary.equals())
    }
    return (a: unknown, b: unknown): boolean => {
      const objA = a as Record<string, unknown>
      const objB = b as Record<string, unknown>
      for (const key of this.#keys) {
        const keyEquals = propertyEquals.get(key)
        if (keyEquals !== undefined && !keyEquals(objA[key as string], objB[key as string])) return false
      }
      return true
    }
  }

  override toString(depth = 0): string {
    const indent = ' '.repeat(2 * depth)
    const entries = this.#keys.map(key => {
      const arbitrary = this.getArbitrary(key)
      return `${indent}  ${String(key)}:\n${arbitrary.toString(depth + 2)}`
    }).join('\n')
    return `${indent}Record Arbitrary:\n${entries}`
  }
}
