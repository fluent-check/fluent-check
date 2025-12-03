# Strict Mode Refactoring Examples

Concrete examples of refactoring defensive code to cleaner patterns.

## Priority: Type-Level Solutions First

**Always prefer type-level solutions over runtime checks.** These examples show the progression from runtime checks → type-level solutions.

## Example 1: ArbitraryTuple.canGenerate()

**Before (Noisy):**
```typescript
override canGenerate(pick: FluentPick<A>): boolean {
  const value = pick.value as unknown[]
  const original = pick.original as unknown[]
  for (const i in value) {
    const index = Number(i)
    const arbitrary = this.arbitraries[index]
    const val = value[index]
    if (arbitrary === undefined || val === undefined) {
      return false
    }
    const orig = original[index]
    if (!arbitrary.canGenerate({value: val, original: orig}))
      return false
  }
  return true
}
```

**After (Clean):**
```typescript
override canGenerate(pick: FluentPick<A>): boolean {
  const value = pick.value as unknown[]
  const original = pick.original as unknown[]
  
  // Use every() - handles undefined naturally, more idiomatic
  return this.arbitraries.every((arbitrary, i) => {
    const val = value[i]
    const orig = original[i]
    // Only check val since original can be undefined (it's optional)
    return val !== undefined && arbitrary.canGenerate({value: val, original: orig})
  })
}
```

**Benefits:**
- Eliminates `for...in` with `Number()` conversion
- Uses `every()` which is more declarative
- Single return statement
- Still type-safe

## Example 2: ArbitraryComposite.pick()

**Before (Noisy):**
```typescript
override pick(generator: () => number) {
  const weights = this.arbitraries.reduce(...)
  const lastWeight = weights.at(-1)
  const picked = Math.floor(generator() * (lastWeight ?? 0))
  const index = weights.findIndex(s => s > picked)
  if (index === -1 || this.arbitraries[index] === undefined) {
    const lastArbitrary = this.arbitraries[this.arbitraries.length - 1]
    if (lastArbitrary === undefined) {
      throw new Error('Cannot pick from empty composite arbitrary')
    }
    return lastArbitrary.pick(generator)
  }
  const selectedArbitrary = this.arbitraries[index]
  if (selectedArbitrary === undefined) {
    throw new Error('Invalid index in composite arbitrary')
  }
  return selectedArbitrary.pick(generator)
}
```

**After (Clean):**
```typescript
override pick(generator: () => number) {
  // Validate upfront - fail fast
  if (this.arbitraries.length === 0) {
    throw new Error('Cannot pick from empty composite arbitrary')
  }
  
  const weights = this.arbitraries.reduce(
    (acc, a) => { acc.push((acc.at(-1) ?? 0) + a.size().value); return acc },
    new Array<number>()
  )
  const lastWeight = weights.at(-1) ?? 0
  const picked = Math.floor(generator() * lastWeight)
  const index = weights.findIndex(s => s > picked)
  
  // Safe: we validated length > 0, findIndex returns valid index or -1
  const selectedIndex = index >= 0 ? index : this.arbitraries.length - 1
  return this.arbitraries[selectedIndex]!.pick(generator) // Safe: validated bounds
}
```

**Benefits:**
- Single validation at the top
- Eliminates redundant checks
- Uses non-null assertion after validation (safe)
- Clearer control flow

## Example 3: ArbitrarySet.pick() and cornerCases()

**Before (Noisy):**
```typescript
override pick(generator: () => number): FluentPick<A[]> | undefined {
  const size = Math.floor(generator() * (this.max - this.min + 1)) + this.min
  const pick = new Set<A>()

  while (pick.size !== size) {
    const index = Math.floor(generator() * this.elements.length)
    const element = this.elements[index]
    if (element !== undefined) {
      pick.add(element)
    }
  }
  // ...
}

override cornerCases(): FluentPick<A[]>[] {
  const min: A[] = []
  for (let i = 0; i < this.min; i++) {
    const element = this.elements[i]
    if (element !== undefined) {
      min.push(element)
    }
  }
  // ... similar for max
}
```

**After (Clean):**
```typescript
override pick(generator: () => number): FluentPick<A[]> | undefined {
  const size = Math.floor(generator() * (this.max - this.min + 1)) + this.min
  const pick = new Set<A>()

  while (pick.size !== size) {
    const index = Math.floor(generator() * this.elements.length)
    // Validate bounds, then assert - elements.length is known at construction
    if (index >= 0 && index < this.elements.length) {
      pick.add(this.elements[index]!) // Safe: validated bounds
    }
  }
  // ...
}

override cornerCases(): FluentPick<A[]>[] {
  // Use slice() - cleaner and handles bounds automatically
  const min = this.elements.slice(0, this.min)
  const max = this.elements.slice(0, this.max)
  return [{value: min, original: min}, {value: max, original: max}]
}
```

**Benefits:**
- `slice()` handles bounds automatically
- No need for explicit undefined checks when using `slice()`
- More concise

## Example 4: ArbitraryRecord with Known Keys

**Before (Noisy):**
```typescript
for (const key of this.#keys) {
  const arbitrary = this.schema[key]
  if (arbitrary === undefined) continue
  const size = arbitrary.size()
  // ...
}
```

**After (Clean):**
```typescript
// Option 1: Validate at construction
constructor(public readonly schema: S) {
  super()
  this.#keys = Object.keys(schema) as (keyof S)[]
  // Validate all keys exist (one-time check)
  for (const key of this.#keys) {
    if (schema[key] === undefined) {
      throw new Error(`Schema missing key: ${String(key)}`)
    }
  }
}

// Later, safe to use ! since we validated
for (const key of this.#keys) {
  const arbitrary = this.schema[key]! // Safe: validated in constructor
  const size = arbitrary.size()
  // ...
}

// Option 2: Filter once, then process
const validKeys = this.#keys.filter(key => this.schema[key] !== undefined)
for (const key of validKeys) {
  const arbitrary = this.schema[key]! // Safe: we filtered
  // ...
}
```

**Benefits:**
- Validate once (at construction or upfront)
- Use non-null assertion safely after validation
- Eliminates repeated checks

## Example 5: Regex Pattern Parsing

**Before (Noisy):**
```typescript
if (rangeParts.length === 1) {
  const part = rangeParts[0]
  if (part === undefined) {
    return {min: 1, max: 1, nextIndex: closeBrace + 1}
  }
  const count = parseInt(part, 10)
  return {min: count, max: count, nextIndex: closeBrace + 1}
} else if (rangeParts.length === 2) {
  const minPart = rangeParts[0]
  const maxPart = rangeParts[1]
  const min = minPart !== undefined && minPart !== '' ? parseInt(minPart, 10) : 0
  const max = maxPart !== undefined && maxPart !== '' ? parseInt(maxPart, 10) : Number.POSITIVE_INFINITY
  return {min, max, nextIndex: closeBrace + 1}
}
```

**After (Clean):**
```typescript
if (rangeParts.length === 1) {
  const part = rangeParts[0] ?? ''
  if (part === '') {
    return {min: 1, max: 1, nextIndex: closeBrace + 1}
  }
  const count = parseInt(part, 10)
  return {min: count, max: count, nextIndex: closeBrace + 1}
} else if (rangeParts.length === 2) {
  // Use nullish coalescing with defaults
  const min = rangeParts[0] && rangeParts[0] !== '' ? parseInt(rangeParts[0], 10) : 0
  const max = rangeParts[1] && rangeParts[1] !== '' ? parseInt(rangeParts[1], 10) : Number.POSITIVE_INFINITY
  return {min, max, nextIndex: closeBrace + 1}
}
```

**Benefits:**
- Uses nullish coalescing (`??`) for defaults
- More concise conditionals
- Still handles all edge cases

## Example 6: Type-Level Solution for Record Schema

**Before (Runtime Checks):**
```typescript
class ArbitraryRecord<S extends RecordSchema> {
  constructor(public readonly schema: S) {
    super()
    this.#keys = Object.keys(schema) as (keyof S)[]
  }

  size(): ArbitrarySize {
    for (const key of this.#keys) {
      const arbitrary = this.schema[key]
      if (arbitrary === undefined) continue  // Runtime check
      const size = arbitrary.size()
      // ...
    }
  }
}
```

**After (Type-Level Solution):**
```typescript
// Define validated schema type
type ValidatedSchema<T extends Record<string, Arbitrary<unknown> | undefined>> = {
  [K in keyof T]-?: NonNullable<T[K]>
}

class ArbitraryRecord<S extends RecordSchema> {
  readonly #keys: (keyof S)[]
  readonly #validatedSchema: ValidatedSchema<S>

  constructor(public readonly schema: S) {
    super()
    this.#keys = Object.keys(schema) as (keyof S)[]

    // Validate once at construction
    for (const key in schema) {
      if (schema[key] === undefined) {
        throw new Error(`Schema missing key: ${String(key)}`)
      }
    }
    // Type-level transformation - no runtime checks needed after this
    this.#validatedSchema = schema as ValidatedSchema<S>
  }

  size(): ArbitrarySize {
    // No runtime checks - type system guarantees all values are defined
    for (const key of this.#keys) {
      const arbitrary = this.#validatedSchema[key]  // Type: NonNullable, no check needed
      const size = arbitrary.size()
      // ...
    }
  }
}
```

**Benefits:**
- Zero runtime overhead after construction
- Type system enforces non-nullable values
- No scattered undefined checks
- Compile-time guarantees

## Example 7: Utility Types for Array Filtering

### Arbitrary.sample() Method

**Before:**
```typescript
sample(sampleSize = 10, generator: () => number = Math.random): FluentPick<A>[] {
  const result: FluentPick<A>[] = []

  for (let i = 0; i < sampleSize; i ++) {
    const pick = this.pick(generator)
    if (pick !== undefined) result.push(pick)  // Runtime check
    else break
  }

  return result
}
```

**After:**
```typescript
sample(sampleSize = 10, generator: () => number = Math.random): NonNullable<FluentPick<A>>[] {
  const picks: (FluentPick<A> | undefined)[] = []
  for (let i = 0; i < sampleSize; i++) {
    const pick = this.pick(generator)
    if (pick === undefined) break
    picks.push(pick)
  }
  // TypeScript 5.5 automatically infers NonNullable<FluentPick<A>>[] from filter
  return picks.filter((pick): pick is NonNullable<FluentPick<A>> => pick !== undefined)
}
```

**Benefits:**
- Return type accurately reflects that undefined values are filtered out
- TypeScript 5.5 can infer the type predicate automatically
- Zero runtime overhead - type-level only
- Consumers know the array contains no undefined values

### ArbitraryArray.cornerCases()

**Before:**
```typescript
override cornerCases(): FluentPick<A[]>[] {
  return this.arbitrary.cornerCases().flatMap(cc => [
    {value: Array(this.min).fill(cc.value), original: Array(this.min).fill(cc.original)},
    {value: Array(this.max).fill(cc.value), original: Array(this.max).fill(cc.original)}
  ]).filter(v => v !== undefined) as FluentPick<A[]>[]  // Type assertion needed
}
```

**After:**
```typescript
override cornerCases(): NonNullable<FluentPick<A[]>>[] {
  // TypeScript 5.5 automatically infers NonNullable from filter predicate
  return this.arbitrary.cornerCases().flatMap(cc => [
    {value: Array(this.min).fill(cc.value), original: Array(this.min).fill(cc.original)},
    {value: Array(this.max).fill(cc.value), original: Array(this.max).fill(cc.original)}
  ]).filter((v): v is NonNullable<FluentPick<A[]>> => v !== undefined)
}
```

**Benefits:**
- Proper type narrowing instead of type assertion
- Type-safe filtering with explicit type guard
- Return type accurately reflects filtered result

## Example 8: Utility Types for Validated Object Structures

### ArbitraryRecord Schema Access

**Before:**
```typescript
override size(): ArbitrarySize {
  // ...
  for (const key of this.#keys) {
    const arbitrary = this.schema[key]  // Type: Arbitrary<unknown> | undefined
    if (arbitrary === undefined) continue  // Runtime check needed
    const size = arbitrary.size()
    // ...
  }
}
```

**After:**
```typescript
// Helper method that returns NonNullable type for validated keys
private getArbitrary<K extends keyof S>(key: K): NonNullable<S[K]> {
  // Type assertion safe because key is in #keys which are validated at construction
  return this.schema[key] as NonNullable<S[K]>
}

override size(): ArbitrarySize {
  // ...
  for (const key of this.#keys) {
    const arbitrary = this.getArbitrary(key)  // Type: NonNullable<S[K]>
    const size = arbitrary.size()  // No undefined check needed
    // ...
  }
}
```

**Benefits:**
- Eliminates repeated undefined checks throughout the class
- Type system enforces that validated keys return non-nullable values
- Single source of truth for validated schema access
- Zero runtime overhead - type-level transformation

## Example 9: Assertion Function for Preconditions

Real-world example from src/FluentCheck.ts:45-48 showing assertion functions in practice.

**Pattern:**
```typescript
// Define custom error for failed preconditions
class PreconditionFailure extends Error {
  constructor(message?: string) {
    super(message ?? 'Precondition failed')
    this.name = 'PreconditionFailure'
  }
}

// Assertion function for property tests
export function pre(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new PreconditionFailure(message)
  }
}

// Usage in property tests
test('division property', () => {
  fc.check((a: number, b: number) => {
    pre(b !== 0, 'Divisor cannot be zero')  // Type narrows automatically
    const result = a / b
    return result * b === a
  })
})
```

**Benefits:**
- Custom error types for better error handling
- Type narrowing happens automatically after assertion
- Reusable across entire test suite
- Clear semantics for precondition checking

## Example 10: Property Existence with `in` Operator

Real-world example from src/arbitraries/datetime.ts:91-94 for handling union types.

**Before (Multiple undefined checks):**
```typescript
type TimeSpec = {hours?: number} | {hour?: number} | {h?: number}

function timeToMilliseconds(time: TimeSpec): number {
  const hours = time.hours
  if (hours !== undefined) return hours * 3600000

  const hour = time.hour
  if (hour !== undefined) return hour * 3600000

  const h = time.h
  if (h !== undefined) return h * 3600000

  return 0
}
```

**After (Using `in` operator with nullish coalescing):**
```typescript
type TimeSpec = {hours?: number} | {hour?: number} | {h?: number}

function timeToMilliseconds(time: TimeSpec): number {
  const h = 'hours' in time ? (time.hours ?? 0)
         : 'hour' in time ? (time.hour ?? 0)
         : 'h' in time ? (time.h ?? 0)
         : 0

  return h * 3600000
}
```

**Benefits:**
- `in` operator narrows union types automatically
- Single expression vs multiple if statements
- Combines property existence check with default value handling
- More functional, declarative style

## Example 11: Optional Chaining for Nested Access

**Before (Nested if checks):**
```typescript
function getUserName(data: {user?: {profile?: {name?: string}}}) {
  if (data !== undefined && data.user !== undefined) {
    if (data.user.profile !== undefined) {
      if (data.user.profile.name !== undefined) {
        return data.user.profile.name
      }
    }
  }
  return 'Anonymous'
}

// Or with &&:
function getUserName(data: {user?: {profile?: {name?: string}}}) {
  if (data && data.user && data.user.profile && data.user.profile.name) {
    return data.user.profile.name
  }
  return 'Anonymous'
}
```

**After (Optional chaining):**
```typescript
function getUserName(data: {user?: {profile?: {name?: string}}}) {
  return data?.user?.profile?.name ?? 'Anonymous'
}
```

**Benefits:**
- Eliminates nested if checks
- More concise and readable
- Type-safe property access
- Naturally handles undefined at any level

### Optional Method Calls

**Before:**
```typescript
function initializeConfig(config?: {onInit?: () => void}) {
  if (config !== undefined && config.onInit !== undefined) {
    config.onInit()
  }
}
```

**After:**
```typescript
function initializeConfig(config?: {onInit?: () => void}) {
  config?.onInit?.()
}
```

### When NOT to Use Optional Chaining

**Correct pattern - array index and map lookups:**
```typescript
// ✅ Correct - checking if array element exists is intentional
const element = this.elements[index]
if (element !== undefined) {
  pick.add(element)
}

// ✅ Correct - checking if key exists in map is intentional
const charClass = charClassMap[escapeSeq]
if (charClass !== undefined) {
  charClasses.push(createCharClass(charClass, quantifier))
}
```

These patterns communicate intent: "only process if element/key exists". Array index access already returns `undefined` for out-of-bounds, and map lookups checking key existence before using the value is the right pattern.

## Summary

Key refactoring principles (in priority order):

1. **Type-level solutions first** - Use utility types, mapped types to eliminate runtime checks
2. **Assertion functions** - Use `asserts` for runtime validation that must happen
3. **Validate once, assert safely** - Check bounds/validity upfront, use `!` after
4. **Use array methods** - `every()`, `slice()`, `filter()` handle undefined naturally
5. **Early validation** - Fail fast at function start
6. **Nullish coalescing** - Use `??` for defaults
7. **Property existence** - Use `in` operator to narrow union types
8. **Optional chaining** - Use `?.` for nested property access, `?.()` for optional method calls

**Remember:** Type-level solutions have zero runtime overhead. Always prefer them over runtime checks.

**TypeScript 5.5 Note:** TypeScript 5.5+ automatically infers type predicates for `filter(item => item !== undefined)`, so explicit type guards are only needed when TypeScript cannot infer the predicate.

## Real Codebase Examples

The patterns documented here are used throughout the fluent-check codebase:

- **Method Wrappers:** `src/arbitraries/ArbitraryRecord.ts:22-25` - `getArbitrary()` method
- **Type Guard Filtering:** `src/arbitraries/Arbitrary.ts:83-91` - `sample()` method
- **Assertion Functions:** `src/FluentCheck.ts:45-48` - `pre()` function
- **Property Existence:** `src/arbitraries/datetime.ts:91-94` - `timeToMilliseconds()`
- **Nullish Coalescing:** `src/arbitraries/ArbitraryComposite.ts:28-32` - weighted selection
- **Array Methods:** `src/arbitraries/ArbitraryArray.ts:48` - validation with `.every()`
