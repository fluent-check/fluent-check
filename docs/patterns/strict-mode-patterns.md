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
// These are defined in src/arbitraries/types.ts
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

## 2. Use Non-Null Assertions After Validation

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

## 3. Use Nullish Coalescing with Defaults

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

## 4. Use `at()` for Safe Array Access

The `at()` method is designed for this:

```typescript
// ❌ Noisy
const lastWeight = weights.at(-1)
const picked = Math.floor(generator() * (lastWeight ?? 0))

// ✅ Clean - at() already returns T | undefined, use ?? directly
const picked = Math.floor(generator() * (weights.at(-1) ?? 0))
```

## 5. Early Returns Reduce Nesting

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

## 6. Type Guard Helpers (When Runtime Validation Required)

Use assertion functions when runtime validation is necessary (e.g., user input, external data):

```typescript
// Helper function with assertion - use when validation must happen at runtime
function assertDefined<T>(value: T | undefined, message: string): asserts value is T {
  if (value === undefined) {
    throw new Error(message)
  }
}

// Usage - only when type-level solution not possible
const arbitrary = this.arbitraries[index]
assertDefined(arbitrary, `Invalid index ${index}`)
// Now TypeScript knows arbitrary is defined
return arbitrary.pick(generator)
```

**Note:** Prefer type-level solutions (utility types, mapped types) over assertion functions when the structure is known at compile time.

## 7. Use `for...of` with `entries()` Instead of `for...in`

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

## 8. Record Access with Known Keys

When you control the keys (like in `ArbitraryRecord`), validate once:

```typescript
// ❌ Noisy - check every access
for (const key of this.#keys) {
  const arbitrary = this.schema[key]
  if (arbitrary === undefined) return undefined
  // ...
}

// ✅ Clean - validate schema at construction, then use assertions
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

// Later, safe to use ! since we validated
for (const key of this.#keys) {
  const arbitrary = this.schema[key]! // Safe: validated in constructor
  // ...
}
```

## 9. Optional Chaining for Nested Access

```typescript
// ❌ Noisy
const charClassMap = getCharClassMap()
const dotArbitrary = charClassMap['.']
if (dotArbitrary !== undefined) {
  charClasses.push(createCharClass(dotArbitrary, quantifier))
}

// ✅ Clean - use optional chaining or nullish coalescing
const dotArbitrary = getCharClassMap()['.'] ?? parseCustomCharClass('.')
charClasses.push(createCharClass(dotArbitrary, quantifier))
```

## 10. Extract Validation Logic

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

Key principles (in priority order):

1. **Type-level solutions first** - Use `NonNullable<T>`, `Required<T>`, `Exclude<T, undefined>`, mapped types, and conditional types to express constraints at the type level. Zero runtime overhead.

2. **Assertion functions for runtime validation** - Use `asserts x is T` when validation must happen at runtime (user input, external data). Validate once, type narrows automatically.

3. **Validate once, assert safely** - When runtime validation is necessary, check bounds/validity upfront, then use `!` operator or assertion functions.

4. **Use array methods** - `every()`, `some()`, `filter()`, `slice()` handle undefined naturally and work well with type guards.

5. **Nullish coalescing** - Use `??` for defaults instead of explicit undefined checks.

6. **Known bounds** - When you control the data structure, validate at construction and use type-level transformations to express the validated state.

**Remember:** Type-level solutions eliminate runtime checks entirely. Only use runtime validation when type-level solutions are not feasible.
