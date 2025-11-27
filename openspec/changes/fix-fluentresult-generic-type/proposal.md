# Change: Add Generic Type Parameter to FluentResult

> **GitHub Issue:** [#398](https://github.com/fluent-check/fluent-check/issues/398)

## Why

**Note:** This proposal addresses type-safety when accessing `result.example` **after** `.check()` returns. It is unrelated to type inference inside `.then()` callbacks, which works correctly.

The `FluentResult` class loses all type information because `example` is hardcoded as `PickResult<any>`:

```typescript
export class FluentResult {
  constructor(
    public readonly satisfiable = false,
    public example: PickResult<any> = {},  // ← Type information lost here
    public readonly seed?: number) { }
}
```

This causes the accumulated type from the fluent chain to be discarded when `.check()` returns:

```typescript
const result = fc.scenario()
  .forall('email', fc.patterns.email())    // FluentCheck<{email: string}, {}>
  .then(({email}) => email.includes('@'))  // email is `string` here ✓ (inside .then)
  .check()                                  // Returns FluentResult with example: any ✗

// The problem: accessing the result AFTER .check()
result.example.email  // TypeScript infers `any`, not `string` ✗
result.example.email.toUpperCase()  // No autocomplete, no type checking ✗
```

When accessing `result.example.email` after the test completes, TypeScript infers `any` instead of `string`, forcing users to add type assertions for type-safe result inspection.

## What Changes

### Make `FluentResult` Generic

```typescript
// Before
export class FluentResult {
  public example: PickResult<any> = {}
}

// After
export class FluentResult<Rec extends {} = {}> {
  public example: Rec = {} as Rec
}
```

### Update `.check()` Return Type

The `check()` method and related methods need to return `FluentResult<Rec>` to preserve type information through the chain.

### Type Flow

After the fix:
```typescript
const result = fc.scenario()
  .forall('email', fc.patterns.email())
  .then(({email}) => email.includes('@'))
  .check()

result.example.email  // TypeScript knows this is `string` ✓
```

## Impact

- **Affected specs**: `fluent-api`
- **Affected code**: `src/FluentCheck.ts`
- **Breaking**: Potentially breaking for users who:
  - Explicitly type `FluentResult` without generics
  - Rely on `example` being `any` for dynamic access
- **Mitigation**: Default type parameter `Rec = {}` maintains backwards compatibility for most cases
