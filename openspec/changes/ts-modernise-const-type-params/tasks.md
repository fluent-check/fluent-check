## 1. Primary Implementation (`src/arbitraries/index.ts`)

- [x] 1.1 Update `oneof()` function with `const` type parameter
  - Change: `<A>(elements: A[])` → `<const A extends readonly unknown[]>(elements: A)`
  - Return type: `Arbitrary<A>` → `Arbitrary<A[number]>`
  - Verify: `oneof(['a', 'b', 'c'])` infers `Arbitrary<'a' | 'b' | 'c'>`

- [x] 1.2 Update `set()` function with `const` type parameter
  - Change: `<A>(elements: A[], ...)` → `<const A extends readonly unknown[]>(elements: A, ...)`
  - Return type: `Arbitrary<A[]>` → `Arbitrary<A[number][]>`
  - Update internal `Array.from(new Set(elements))` if needed for readonly compatibility
  - Verify: `set(['x', 'y'], 1, 2)` infers `Arbitrary<('x' | 'y')[]>`

- [x] 1.3 Update `tuple()` function with `const` type parameter
  - Change: `<U extends Arbitrary<any>[]>` → `<const U extends readonly Arbitrary<any>[]>`
  - Update `UnwrapFluentPick<U>` type helper if needed for readonly tuple support
  - Verify: Existing tuple usages continue to work

## 2. Secondary Implementation (`src/arbitraries/regex.ts`)

- [x] 2.1 Update local `oneof()` function for internal consistency
- [x] 2.2 Update local `tuple()` function for internal consistency
- [x] 2.3 Verify `patterns.uuid()`, `patterns.email()`, etc. still type-check correctly

## 3. Type Helper Updates

- [x] 3.1 Review `UnwrapFluentPick<T>` type helper for readonly tuple compatibility
- [x] 3.2 Ensure mapped types work correctly with readonly arrays

## 4. Verification

- [x] 4.1 Run TypeScript compiler to verify no type errors
- [x] 4.2 Run full test suite (`npm test`) to ensure no runtime regressions
- [x] 4.3 Manually verify improved type inference in IDE:
  - `oneof(['pending', 'active', 'done'])` shows `Arbitrary<'pending' | 'active' | 'done'>`
  - `set(['red', 'green', 'blue'], 1, 2)` shows `Arbitrary<('red' | 'green' | 'blue')[]>`
- [x] 4.4 Verify backward compatibility: existing code with explicit types still compiles
