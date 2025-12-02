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

### Decision 2: Hybrid of stratified categories with registry pattern

**What:** Organize laws into stratified categories, where each category is a registry of law-checking functions. This combines the organizational clarity of categories with the composability of the registry pattern.

```typescript
// Stratified categories with registry pattern within each
export const samplingLaws = {
  sampleValidity: <T>(arb: Arbitrary<T>) => LawResult,
  sampleSizeBound: <T>(arb: Arbitrary<T>) => LawResult,
  uniqueSampleUniqueness: <T>(arb: Arbitrary<T>) => LawResult,
  cornerCaseInclusion: <T>(arb: Arbitrary<T>) => LawResult,
  all: <T>(arb: Arbitrary<T>) => LawResult[]  // run all in category
}

export const shrinkingLaws = {
  shrinkProducesSmallerValues: <T>(arb: Arbitrary<T>, pick: FluentPick<T>) => LawResult,
  shrinkTermination: <T>(arb: Arbitrary<T>, pick: FluentPick<T>) => LawResult,
  all: <T>(arb: Arbitrary<T>, pick: FluentPick<T>) => LawResult[]
}

export const compositionLaws = {
  filterRespectsPredicate: <T>(arb: Arbitrary<T>, pred: (t: T) => boolean) => LawResult,
  noArbitraryMapIdentity: <T>(noArb: Arbitrary<T>) => LawResult,
  noArbitraryFilterIdentity: <T>(noArb: Arbitrary<T>) => LawResult,
  all: <T>(arb: Arbitrary<T>, pred: (t: T) => boolean) => LawResult[]
}

// Unified entry point
export const arbitraryLaws = {
  sampling: samplingLaws,
  shrinking: shrinkingLaws,
  composition: compositionLaws,
  check: <T>(arb: Arbitrary<T>, options?) => LawResult[],  // all applicable
  assert: <T>(arb: Arbitrary<T>, options?) => void         // throws on failure
}
```

**Why:**
- **Clear mental model** - "what aspect am I testing?"
- **Granular control** - run individual laws or entire categories
- **Extensible per category** - add shrinking laws without touching sampling
- **Maps to spec structure** - each category corresponds to a section in the spec
- Composable - run any subset of laws
- Self-documenting - each law is named and isolated

### Decision 3: Self-testing with arbitrary registry

**What:** Provide a registry of representative arbitraries for comprehensive law verification.

```typescript
const arbitraryRegistry = [
  { name: 'integer', arb: () => fc.integer(0, 100) },
  { name: 'boolean', arb: () => fc.boolean() },
  { name: 'string', arb: () => fc.string(1, 10) },
  { name: 'array', arb: () => fc.array(fc.integer(0, 10), 1, 5) },
  // ...
]
```

**Why:** Enables systematic verification of all arbitrary types while maintaining clear failure identification.

**Trade-offs:**
- Pro: Discovers edge cases across arbitrary types
- Pro: Clear identification of which arbitrary failed
- Con: Requires explicit enumeration
- Mitigation: Registry is comprehensive and easy to extend

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
