# TypeScript Strict Mode Patterns

This document outlines cleaner patterns for handling `noUncheckedIndexedAccess` while maintaining strict type safety.

## Core Principle: Prefer Types Over Runtime Checks

**ALWAYS prefer type-level solutions over runtime validation when possible.** Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks should only be used when type-level solutions are not feasible.

**Priority Order:**
1. **Type-level solutions first** - Use utility types, mapped types, conditional types
2. **Type guards with assertions** - Use assertion functions for validation that must happen at runtime
3. **Runtime checks last** - Only when type-level solutions are not possible

## 1. Type-Level Utility Types (PREFERRED)

**Use TypeScript utility types to express non-nullable types at the type level - zero runtime overhead.**

### Pattern: `NonNullable<T>`, `Required<T>`, `Exclude<T, undefined>`

```typescript
// ❌ Noisy - runtime check needed
function processItems(items: (string | undefined)[]): string[] {
  const result: string[] = []
  for (const item of items) {
    if (item !== undefined) {  // Runtime check
      result.push(item)
    }
  }
  return result
}

// ✅ Clean - TypeScript 5.5 automatically infers NonNullable from filter predicate
function processItems(items: (string | undefined)[]): NonNullable<typeof items[number]>[] {
  // TypeScript 5.5+ automatically infers type predicate - no explicit type guard needed!
  return items.filter(item => item !== undefined)
}

// ✅ Or use explicit type guard when TypeScript cannot infer (rare cases)
type DefinedString = Exclude<string | undefined, undefined>
function processItemsExplicit(items: (string | undefined)[]): DefinedString[] {
  return items.filter((item): item is DefinedString => item !== undefined)
}
```

### Required for Validated Structures

```typescript
// ❌ Noisy - runtime checks needed throughout
interface Schema {
  name?: string
  age?: number
}

function processSchema(schema: Schema) {
  if (schema.name === undefined || schema.age === undefined) {
    throw new Error('Missing required fields')
  }
  // Still need checks later because type is still Schema
  return schema.name.length + schema.age
}

// ✅ Clean - use Required type after validation
function validateSchema(schema: Schema): Required<Schema> {
  if (schema.name === undefined || schema.age === undefined) {
    throw new Error('Missing required fields')
  }
  return schema as Required<Schema>
}

function processSchema(schema: Schema) {
  const validated = validateSchema(schema)
  // Type is now Required<Schema>, no more checks needed
  return validated.name.length + validated.age  // Type-safe, no runtime checks
}
```

### Custom Utility Types

```typescript
// Create custom utility types for common patterns
type Defined<T> = Exclude<T, undefined>
type Validated<T extends Record<string, unknown>> = Required<T>
type NonEmptyArray<T> = [T, ...T[]]  // Ensures at least one element

// Usage
type ValidatedSchema = Validated<{ name?: string; age?: number }>
// Result: { name: string; age: number }
```

### TypeScript 5.5 Automatic Type Predicate Inference

**Important:** TypeScript 5.5+ automatically infers type predicates for common filter patterns:

```typescript
// TypeScript 5.5+ automatically infers NonNullable<T>[] from filter
const filtered = items.filter(item => item !== undefined)
// Type: NonNullable<typeof items[number]>[] - no explicit type guard needed!

// TypeScript 5.5+ automatically infers Exclude<T, null>[] from filter
const noNulls = items.filter(item => item !== null)
// Type: Exclude<typeof items[number], null>[]

// Only use explicit type guards when TypeScript cannot infer the predicate
const explicit = items.filter((item): item is NonNullable<typeof items[number]> => 
  item !== undefined
)
```

**Best Practice:** Prefer inferred type predicates over explicit type guards when TypeScript can infer them. This reduces code noise while maintaining type safety.

## 2. Mapped Types for Validated Structures (PREFERRED)

Transform types at the type level to reflect validation state:

```typescript
// ❌ Noisy - runtime checks
type OptionalSchema = Record<string, Arbitrary<unknown> | undefined>

function processSchema(schema: OptionalSchema) {
  for (const key in schema) {
    const arbitrary = schema[key]
    if (arbitrary === undefined) continue  // Runtime check
    // ...
  }
}

// ✅ Clean - use mapped type to express validated state
type ValidatedSchema<T extends Record<string, Arbitrary<unknown> | undefined>> = {
  [K in keyof T]-?: NonNullable<T[K]>
}

function validateSchema<T extends Record<string, Arbitrary<unknown> | undefined>>(
  schema: T
): ValidatedSchema<T> {
  // Validate once
  for (const key in schema) {
    if (schema[key] === undefined) {
      throw new Error(`Schema missing key: ${String(key)}`)
    }
  }
  return schema as ValidatedSchema<T>
}

function processSchema<T extends Record<string, Arbitrary<unknown> | undefined>>(
  schema: T
) {
  const validated = validateSchema(schema)
  // Type is ValidatedSchema<T>, all values are NonNullable
  for (const key in validated) {
    const arbitrary = validated[key]  // Type is NonNullable, no check needed
    // ...
  }
}
```

## 3. Assertion Functions for Type Narrowing (PREFERRED)

Use assertion functions to narrow types with minimal runtime overhead:

```typescript
// ❌ Noisy - manual checks
function processItem(item: string | undefined) {
  if (item === undefined) {
    throw new Error('Item required')
  }
  // Type narrowed, but check still runs
  return item.length
}

// ✅ Clean - assertion function narrows type
function assertDefined<T>(value: T | undefined, message: string): asserts value is T {
  if (value === undefined) {
    throw new Error(message)
  }
}

function processItem(item: string | undefined) {
  assertDefined(item, 'Item required')
  // Type is now string, no further checks needed
  return item.length
}
```

## 4. Use Array Methods That Handle Undefined Naturally

### Pattern: `every()`, `some()`, `find()`, `filter()`

These methods naturally handle undefined and are more idiomatic:

```typescript
// ❌ Noisy
for (const i in value) {
  const index = Number(i)
  const arbitrary = this.arbitraries[index]
  const val = value[index]
  if (arbitrary === undefined || val === undefined) {
    return false
  }
  if (!arbitrary.canGenerate({value: val, original: orig}))
    return false
}

// ✅ Clean - use every() with proper indexing
override canGenerate(pick: FluentPick<A>): boolean {
  const value = pick.value as unknown[]
  const original = pick.original as unknown[]
  return this.arbitraries.every((arbitrary, i) => {
    const val = value[i]
    const orig = original[i]
    return val !== undefined && arbitrary.canGenerate({value: val, original: orig})
  })
}
```

## 5. Use Non-Null Assertions After Validation

When you've validated bounds, use `!` operator:

```typescript
// ❌ Noisy
const index = Math.floor(generator() * this.elements.length)
const element = this.elements[index]
if (element !== undefined) {
  pick.add(element)
}

// ✅ Clean - validate bounds, then assert
const index = Math.floor(generator() * this.elements.length)
if (index >= 0 && index < this.elements.length) {
  pick.add(this.elements[index]!) // Safe: we validated bounds
}
```

## 6. Use Nullish Coalescing with Defaults

For optional values with sensible defaults:

```typescript
// ❌ Noisy
const part = rangeParts[0]
if (part === undefined) {
  return {min: 1, max: 1, nextIndex: closeBrace + 1}
}
const count = parseInt(part, 10)

// ✅ Clean - use nullish coalescing
const part = rangeParts[0] ?? ''
if (part === '') {
  return {min: 1, max: 1, nextIndex: closeBrace + 1}
}
const count = parseInt(part, 10)
```

## 7. Use `at()` for Safe Array Access

The `at()` method is designed for this:

```typescript
// ❌ Noisy
const lastWeight = weights.at(-1)
const picked = Math.floor(generator() * (lastWeight ?? 0))

// ✅ Clean - at() already returns T | undefined, use ?? directly
const picked = Math.floor(generator() * (weights.at(-1) ?? 0))
```

## 8. Early Returns Reduce Nesting

Structure code to return early:

```typescript
// ❌ Noisy
for (const key of this.#keys) {
  const arbitrary = this.schema[key]
  if (arbitrary === undefined) continue
  const size = arbitrary.size()
  // ...
}

// ✅ Clean - filter first, then process
const validKeys = this.#keys.filter(key => this.schema[key] !== undefined)
for (const key of validKeys) {
  const arbitrary = this.schema[key]! // Safe: we filtered
  const size = arbitrary.size()
  // ...
}
```

## 9. Use `for...of` with `entries()` Instead of `for...in`

```typescript
// ❌ Noisy - for...in with Number conversion
for (const i in value) {
  const index = Number(i)
  const arbitrary = this.arbitraries[index]
  // ...
}

// ✅ Clean - use entries() or direct iteration
for (let i = 0; i < value.length; i++) {
  const arbitrary = this.arbitraries[i]
  if (arbitrary === undefined) continue // Only check if needed
  // ...
}
```

## 10. Method Wrappers for Validated Access (PREFERRED)

When you control the keys and validate at construction, create a type-safe accessor method:

```typescript
// ❌ Noisy - check every access
for (const key of this.#keys) {
  const arbitrary = this.schema[key]
  if (arbitrary === undefined) return undefined
  // ...
}

// ❌ Better but repetitive - direct assertions
for (const key of this.#keys) {
  const arbitrary = this.schema[key]! // Safe: validated in constructor
  // ... but repeated everywhere
}

// ✅ Best - method wrapper with proper typing (src/arbitraries/ArbitraryRecord.ts:22-25)
class ArbitraryRecord<S extends RecordSchema> {
  readonly #keys: (keyof S)[]

  constructor(public readonly schema: S) {
    super()
    this.#keys = Object.keys(schema) as (keyof S)[]
    // Validate all keys exist
    for (const key of this.#keys) {
      if (schema[key] === undefined) {
        throw new Error(`Schema missing key: ${String(key)}`)
      }
    }
  }

  /**
   * Gets an arbitrary for a key that is guaranteed to exist.
   * Returns NonNullable type since keys in #keys are validated at construction.
   */
  private getArbitrary<K extends keyof S>(key: K): NonNullable<S[K]> {
    return this.schema[key] as NonNullable<S[K]>
  }

  // Usage throughout class - no ! assertions needed
  size(): ArbitrarySize {
    for (const key of this.#keys) {
      const arbitrary = this.getArbitrary(key) // Type-safe, no assertion
      const size = arbitrary.size()
      // ...
    }
  }
}
```

**Benefits:**
- Single source of truth for type assertion logic
- Type system enforces NonNullable return type
- No scattered `!` operators throughout code
- Self-documenting with JSDoc comment explaining safety

## 11. Property Existence Checking with `in` Operator

For union types with optional properties, use `in` operator to narrow types:

```typescript
// ❌ Noisy - checking undefined repeatedly
function getHours(time: {hours?: number} | {hour?: number}) {
  const hours = time.hours
  if (hours !== undefined) return hours
  const hour = time.hour
  if (hour !== undefined) return hour
  return 0
}

// ✅ Clean - use `in` operator with nullish coalescing (src/arbitraries/datetime.ts:91)
function getHours(time: {hours?: number} | {hour?: number}) {
  return 'hours' in time ? (time.hours ?? 0)
       : 'hour' in time ? (time.hour ?? 0)
       : 0
}
```

**Benefits:**
- `in` operator narrows union types automatically
- Combine with `??` for default values
- Single expression instead of multiple if statements
- Type-safe property access after narrowing

## 12. Optional Chaining for Nested Access

Use `?.` for safe nested property access and `??` for defaults:

### Pattern: Optional Property Access (`?.`)

```typescript
// ❌ Noisy - nested if checks
if (user !== undefined && user.profile !== undefined) {
  return user.profile.name
}
return 'Anonymous'

// ✅ Clean - use optional chaining with nullish coalescing
return user?.profile?.name ?? 'Anonymous'
```

### Pattern: Optional Method Calls (`?.()`)

```typescript
// ❌ Noisy - check before call
if (config !== undefined && config.onInit !== undefined) {
  config.onInit()
}

// ✅ Clean - use optional chaining for method calls
config?.onInit?.()
```

### Pattern: Optional Indexing (`?.[]`)

```typescript
// ❌ Noisy - nested checks for dynamic property access
if (obj !== undefined && obj[key] !== undefined) {
  return obj[key].value
}

// ✅ Clean - use optional chaining for dynamic access
return obj?.[key]?.value
```

### When NOT to Use Optional Chaining

**Don't use for array index access or map lookups where the check is intentional:**

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

**These patterns are correct because:**
- Array index access already returns `undefined` for out-of-bounds
- Map/record lookups checking key existence before using value is the right pattern
- The `if` check communicates intent: "only process if element exists"

**Use optional chaining for:**
- Nested object property access (`obj?.prop?.nested`)
- Optional method calls (`obj?.method?.()`)
- Dynamic property access on optional objects (`obj?.[key]`)

### Combining with Nullish Coalescing

```typescript
// Pattern: Optional access with fallback
const charClassMap = getCharClassMap()
const dotArbitrary = charClassMap['.']
if (dotArbitrary !== undefined) {
  charClasses.push(createCharClass(dotArbitrary, quantifier))
} else {
  charClasses.push(createCharClass(parseCustomCharClass('.'), quantifier))
}

// ✅ Clean - combine optional access with ?? for default
const dotArbitrary = getCharClassMap()['.'] ?? parseCustomCharClass('.')
charClasses.push(createCharClass(dotArbitrary, quantifier))
```

## 13. Extract Validation Logic

Move validation to the top of functions:

```typescript
// ❌ Noisy - checks scattered
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
  // ...
}

// ✅ Clean - validate upfront
override pick(generator: () => number) {
  if (this.arbitraries.length === 0) {
    throw new Error('Cannot pick from empty composite arbitrary')
  }
  
  const weights = this.arbitraries.reduce(...)
  const lastWeight = weights.at(-1) ?? 0
  const picked = Math.floor(generator() * lastWeight)
  const index = weights.findIndex(s => s > picked)
  
  // Safe: we validated length > 0, and findIndex returns valid index or -1
  const selectedIndex = index >= 0 ? index : this.arbitraries.length - 1
  return this.arbitraries[selectedIndex]!.pick(generator) // Safe: validated bounds
}
```

## Summary

The 13 patterns are organized by priority:

**Type-Level Solutions (Patterns 1-3):**
1. **Type-Level Utility Types** - Use `NonNullable<T>`, `Required<T>`, `Exclude<T, undefined>` for zero runtime overhead
2. **Mapped Types for Validated Structures** - Transform types to reflect validation state
3. **Assertion Functions for Type Narrowing** - Use `asserts x is T` when runtime validation is required

**Array and Collection Patterns (Patterns 4-9):**
4. **Array Methods** - `every()`, `some()`, `filter()`, `slice()` handle undefined naturally
5. **Non-Null Assertions After Validation** - Use `!` operator after validating bounds
6. **Nullish Coalescing with Defaults** - Use `??` for optional values with sensible defaults
7. **Use `at()` for Safe Array Access** - Designed for safe negative indexing
8. **Early Returns Reduce Nesting** - Structure code to return early and filter upfront
9. **Use `for...of` with `entries()`** - Avoid `for...in` with Number conversion

**Object and Record Patterns (Patterns 10-13):**
10. **Method Wrappers for Validated Access** - Create type-safe accessor methods with NonNullable returns
11. **Property Existence with `in` Operator** - Narrow union types and combine with `??` for defaults
12. **Optional Chaining for Nested Access** - Use `?.` and `??` for nested structures
13. **Extract Validation Logic** - Move validation to the top of functions

**Key Principles:**
- **Type-level solutions first** - Zero runtime overhead, compile-time guarantees
- **Validate once, assert safely** - Check bounds/validity upfront, then use type assertions
- **Prefer built-in methods** - Array methods and operators designed for these patterns

**Remember:** Type-level solutions eliminate runtime checks entirely. Only use runtime validation when type-level solutions are not feasible.
