import {type ArbitrarySize, type FluentPick} from './types.js'
import {Arbitrary} from './internal.js'
import {exactSize, estimatedSize} from './util.js'
import * as fc from './index.js'

type RecordSchema = Record<string, Arbitrary<unknown>>
type UnwrapSchema<S extends RecordSchema> = { [K in keyof S]: S[K] extends Arbitrary<infer T> ? T : never }

export class ArbitraryRecord<S extends RecordSchema> extends Arbitrary<UnwrapSchema<S>> {
  private readonly keys: (keyof S)[]

  constructor(public readonly schema: S) {
    super()
    this.keys = Object.keys(schema) as (keyof S)[]
  }

  override size(): ArbitrarySize {
    if (this.keys.length === 0) return exactSize(1)

    let value = 1
    let isEstimated = false

    for (const key of this.keys) {
      const size = this.schema[key].size()
      if (size.type === 'estimated') isEstimated = true
      value *= size.value
    }

    return isEstimated ? estimatedSize(value, [value, value]) : exactSize(value)
  }

  override pick(generator: () => number): FluentPick<UnwrapSchema<S>> | undefined {
    const value: Record<string, unknown> = {}
    const original: Record<string, unknown> = {}

    for (const key of this.keys) {
      const pick = this.schema[key].pick(generator)
      if (pick === undefined) return undefined
      value[key as string] = pick.value
      original[key as string] = pick.original
    }

    return {value: value as UnwrapSchema<S>, original}
  }

  override cornerCases(): FluentPick<UnwrapSchema<S>>[] {
    if (this.keys.length === 0) {
      return [{value: {} as UnwrapSchema<S>, original: {}}]
    }

    const cornerCasesPerKey = this.keys.map(key => ({
      key,
      cases: this.schema[key].cornerCases()
    }))

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
    if (this.keys.length === 0) return fc.empty()

    const value = initial.value as Record<string, unknown>
    const original = (initial.original ?? value) as Record<string, unknown>

    // Create a union of records where one property is shrunk at a time
    const shrunkArbitraries = this.keys.map(selectedKey => {
      const newSchema: Record<string, Arbitrary<unknown>> = {}

      for (const key of this.keys) {
        if (key === selectedKey) {
          newSchema[key as string] = this.schema[key].shrink({
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

    for (const key of this.keys) {
      if (!this.schema[key].canGenerate({
        value: value[key as string],
        original: original[key as string]
      })) {
        return false
      }
    }

    return true
  }

  override toString(depth = 0): string {
    const indent = ' '.repeat(2 * depth)
    const entries = this.keys.map(key =>
      `${indent}  ${String(key)}:\n${this.schema[key].toString(depth + 2)}`
    ).join('\n')
    return `${indent}Record Arbitrary:\n${entries}`
  }
}
