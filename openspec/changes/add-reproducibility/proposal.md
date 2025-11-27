# Change: Add Reproducibility Features

> **GitHub Issue:** [#431](https://github.com/fluent-check/fluent-check/issues/431)

## Why

When a property-based test fails, developers need to:
1. **Reproduce** the exact failure reliably (beyond just seed)
2. **Add regression tests** to prevent the bug from recurring
3. **Debug** complex test scenarios by understanding the generation path

Currently, FluentCheck captures the seed in results and error messages, but this is insufficient for full reproducibility. As noted in GitHub issue #430, we are missing:
- The concept of a **path** (like fast-check) to navigate to specific test cases in the generation tree
- The ability to add known **counterexamples as regression tests** that always run
- A way to **replay** exact test sequences for debugging

## What Changes

- Add `path` tracking to capture the sequence of choices during value generation
- Add `replay({ seed, path? })` method to reproduce exact test cases
- Add `withExample(example)` and `withExamples(examples[])` methods for regression testing
- Enhance `FluentResult` to include `path` alongside `seed`
- Add verbose/debug mode for tracing test execution

## Code Examples

### Example 1: Capturing and Replaying a Failure

```typescript
// Original failing test
const result = fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.integer())
  .then(({ x, y }) => x + y === y + x + 1)  // Bug: always fails
  .check()

// Result includes reproducibility info:
// result.satisfiable === false
// result.seed === 1234567890
// result.path === "42:7"  // x was sample 42, y was sample 7
// result.example === { x: -5, y: 3 }

// Error message includes replay hint:
// "Expected property to be satisfiable, but found counterexample: {"x":-5,"y":3}
//  (seed: 1234567890, path: "42:7")
//  Replay with: .replay({ seed: 1234567890, path: "42:7" })"
```

### Example 2: Replay for Debugging

```typescript
// Replay exact failure for debugging
fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.integer())
  .replay({ seed: 1234567890, path: '42:7' })  // Reproduce exact case
  .then(({ x, y }) => {
    console.log(`Testing x=${x}, y=${y}`)  // x=-5, y=3
    return x + y === y + x + 1
  })
  .check()
```

### Example 3: Regression Examples (Fluent Composition)

```typescript
// Add specific examples that always get tested
// Type inference ensures examples match the bound variables
fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.integer())
  .withExample({ x: 0, y: 0 })           // Edge case: zeros
  .withExample({ x: -1, y: 1 })          // Edge case: opposite signs
  .withExample({ x: Number.MAX_SAFE_INTEGER, y: 1 })  // Boundary
  .then(({ x, y }) => x + y === y + x)
  .check()
  .assertSatisfiable()

// Or batch add with withExamples()
fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.integer())
  .withExamples([
    { x: 0, y: 0 },
    { x: -1, y: 1 },
    { x: Number.MAX_SAFE_INTEGER, y: 1 }
  ])
  .then(({ x, y }) => x + y === y + x)
  .check()
```

### Example 4: Partial Examples

```typescript
// Provide only some variables, others are randomly generated
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.integer())
  .forall('c', fc.integer())
  .withExample({ a: 0 })  // Only fix 'a', 'b' and 'c' are random
  .then(({ a, b, c }) => a * (b + c) === a * b + a * c)
  .check()
```

### Example 5: Verbose Mode for Debugging

```typescript
fc.scenario()
  .forall('x', fc.integer(-10, 10))
  .forall('y', fc.integer(-10, 10))
  .verbose()  // Enable debug output
  .then(({ x, y }) => x * y >= 0)  // Fails for mixed signs
  .check()

// Console output:
// [fluent-check] Test case 1: { x: 5, y: 3 } (path: "0:0") ✓
// [fluent-check] Test case 2: { x: -2, y: 7 } (path: "1:1") ✗
// [fluent-check] Shrinking from { x: -2, y: 7 }...
// [fluent-check] Shrink step 1: { x: -1, y: 7 } (path: "1:1;s1") ✗
// [fluent-check] Shrink step 2: { x: -1, y: 1 } (path: "1:1;s2") ✗
// [fluent-check] Minimal counterexample: { x: -1, y: 1 }
```

## Path Format Design

In FluentCheck, the generation path tracks the sample index for each quantified variable:

```
path = "<index1>:<index2>:...[:s<shrinkDepth>]"
```

**Components:**
- `<indexN>` - The sample index used for the Nth quantifier (in declaration order)
- `:s<depth>` - Optional suffix indicating shrinking depth

**Examples:**
| Scenario | Path | Meaning |
|----------|------|---------|
| Single variable, first sample | `"0"` | First sample for the only quantifier |
| Two variables | `"42:7"` | 42nd sample for first var, 7th for second |
| After 3 shrink steps | `"42:7:s3"` | Original at 42:7, shrunk 3 times |
| Three variables | `"10:20:30"` | Indices for x, y, z in order |

**How it works internally:**

```typescript
// During generation, track pickNum for each arbitrary
// arbitraries['x'].pickNum = 42  -> path starts with "42"
// arbitraries['y'].pickNum = 7   -> path becomes "42:7"

// During shrinking, increment depth counter
// shrinkDepth = 3 -> path becomes "42:7:s3"
```

**Replay follows the path:**

```typescript
// When replay({ seed: 1234, path: "42:7" }) is called:
// 1. Initialize RNG with seed 1234
// 2. Generate samples as normal
// 3. Instead of iterating, jump directly to:
//    - arbitraries['x'].collection[42]
//    - arbitraries['y'].collection[7]
// 4. Execute the test with those specific values
```

## Impact

- Affected specs: `fluent-api`, `random-generation`, `reporting`
- Affected code: `FluentCheck.ts`, `FluentStrategy.ts`, `FluentResult`, `FluentRandomGenerator`
- No breaking changes - all features are additive
