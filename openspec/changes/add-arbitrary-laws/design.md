# Design: Arbitrary Laws

## Context

FluentCheck provides a variety of `Arbitrary<T>` implementations. Each implementation must satisfy certain contracts (laws) to work correctly with the property-based testing framework. Currently, these laws are tested ad-hoc and inconsistently across different arbitrary types.

The challenge is that TypeScript lacks Higher-Kinded Types (HKTs), making it difficult to express "for any Arbitrary<T>, these properties should hold." We need a pragmatic approach that balances type safety with test reusability.

## Goals / Non-Goals

**Goals:**
- Define a canonical set of laws that any arbitrary should satisfy
- Provide a test utility that can verify laws against any arbitrary instance
- Reduce test duplication while maintaining comprehensive coverage
- Document expected arbitrary behavior as executable specifications

**Non-Goals:**
- Full HKT emulation in TypeScript (not practical)
- Replacing all arbitrary-specific tests (some behaviors are type-specific)
- Runtime law enforcement (laws are for testing, not production)

## Decisions

### Decision 1: Test-time law checking, not compile-time constraints

**What:** Laws are expressed as test functions, not type constraints.

**Why:** TypeScript cannot express "for all T, Arbitrary<T> must satisfy these properties" at the type level. Test-time checking is practical and sufficient.

**Alternatives considered:**
- Type-level encoding with conditional types: Too complex, poor error messages
- Interface with required law methods: Forces implementation burden on all arbitraries

### Decision 2: Law registry pattern

**What:** A collection of law-checking functions that accept any `Arbitrary<unknown>` and return test results.

```typescript
const arbitraryLaws = {
  sampleValidity: <T>(arb: Arbitrary<T>, sampleSize?: number) => { ... },
  cornerCaseInclusion: <T>(arb: Arbitrary<T>) => { ... },
  shrinkTermination: <T>(arb: Arbitrary<T>, pick: FluentPick<T>) => { ... },
  // ...
}
```

**Why:** 
- Composable - run any subset of laws
- Extensible - add new laws without changing existing code
- Self-documenting - each law is named and isolated

### Decision 3: Self-testing with arbitrary arbitraries

**What:** Use `fc.oneof([...])` or a custom "arbitrary of arbitraries" to randomly select which arbitrary implementations to test.

```typescript
const arbitraries = fc.oneof([
  () => fc.integer(),
  () => fc.integer(0, 100),
  () => fc.boolean(),
  () => fc.string(1, 10),
  () => fc.array(fc.integer(), 1, 5),
  // ...
])
```

**Why:** Property-based testing the property-based testing framework - dogfooding at its finest. Tests multiple arbitrary implementations in a single test run.

**Trade-offs:**
- Pro: Discovers edge cases across arbitrary types
- Pro: Reduces explicit enumeration of test cases
- Con: Harder to debug failures (which arbitrary failed?)
- Mitigation: Laws include the arbitrary description in failure messages

### Decision 4: Stratified law categories

**What:** Organize laws into categories by what they test:

1. **Sampling laws** - `sample`, `sampleUnique`, `sampleWithBias`
2. **Generation laws** - `pick`, `canGenerate`
3. **Size laws** - `size()` accuracy
4. **Shrinking laws** - `shrink` behavior
5. **Composition laws** - `map`, `filter`, `chain`

**Why:** Allows running focused subsets of laws (e.g., just sampling laws) and organizes documentation.

## Risks / Trade-offs

- **Risk:** Laws may be too strict for some edge-case arbitraries
  - Mitigation: Allow arbitraries to declare which laws they satisfy

- **Risk:** Test execution time increases with more law checks
  - Mitigation: Configurable sample sizes, run expensive laws only in CI

- **Trade-off:** Generality vs. specificity
  - Some behaviors are inherently type-specific (e.g., integer shrinking shrinks toward 0)
  - Laws capture universal properties; type-specific tests remain separate

## Open Questions

1. Should law failures include suggested fixes or just describe the violation?
2. Should we export `arbitraryLaws` for users to test their own custom arbitraries?
3. How do we handle parameterized laws (e.g., shrink laws need a starting pick)?
