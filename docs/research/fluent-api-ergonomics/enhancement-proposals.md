# Enhancement Proposals

Prioritized list of recommended FluentCheck ergonomics improvements based on research findings.

## Executive Summary

This document presents **7 concrete enhancement proposals** identified through comprehensive analysis of FluentCheck's fluent API, comparison with other property testing frameworks, and evaluation of common usage patterns.

## Priority Matrix

| # | Enhancement | Impact | Complexity | Breaking | Priority |
|---|-------------|--------|------------|----------|----------|
| 1 | `fc.prop()` shorthand | High | Low | No | 🔴 Critical |
| 2 | `fc.pre()` preconditions | High | Low | No | 🔴 Critical |
| 3 | `suchThat` filter alias | Medium | Low | No | 🟡 High |
| 4 | Common arbitrary presets | Medium | Low | No | 🟡 High |
| 5 | Fluent assertion terminals | Medium | Low | No | 🟡 High |
| 6 | Strategy presets | Medium | Low | No | 🟢 Medium |
| 7 | Property combinator library | Medium | Medium | No | 🟢 Medium |

---

## Proposal 1: `fc.prop()` Shorthand

### Summary
Add a simplified entry point for basic property tests that don't need the full BDD structure.

### Motivation
45% of tests in the suite are simple universal properties that don't benefit from given/when/then structure. Current syntax requires 4+ method calls for basic assertions.

### Current vs Proposed

**Current (5 LOC):**
```typescript
expect(fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 0 === x)
  .check()
).to.have.property('satisfiable', true);
```

**Proposed (1 LOC):**
```typescript
fc.prop(fc.integer(), x => x + 0 === x).assert();
```

### API Design

```typescript
// Single arbitrary
fc.prop<A>(arb: Arbitrary<A>, property: (a: A) => boolean): FluentProperty;

// Multiple arbitraries (up to 5)
fc.prop<A, B>(a: Arbitrary<A>, b: Arbitrary<B>, 
  property: (a: A, b: B) => boolean): FluentProperty;

fc.prop<A, B, C>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>,
  property: (a: A, b: B, c: C) => boolean): FluentProperty;

// FluentProperty interface
interface FluentProperty {
  check(): FluentResult;
  assert(): void;  // Throws on failure
  config(strategy: FluentStrategyFactory): FluentProperty;
}
```

### Implementation Sketch

```typescript
export function prop<A>(
  arb: Arbitrary<A>,
  property: (a: A) => boolean
): FluentProperty {
  return {
    check: () => scenario()
      .forall('a', arb)
      .then(({ a }) => property(a))
      .check(),
    assert: function() {
      const result = this.check();
      if (!result.satisfiable) {
        throw new Error(`Property failed with example: ${JSON.stringify(result.example)}`);
      }
    },
    config: function(strategy) {
      // Return new FluentProperty with strategy
      return this;
    }
  };
}
```

### Impact
- **Verbosity reduction**: 80% for simple properties
- **Learning curve**: Lower barrier to entry
- **Migration**: None required, additive change

---

## Proposal 2: `fc.pre()` Preconditions

### Summary
Add in-body precondition checking that skips test cases that don't meet criteria.

### Motivation
Currently, preconditions must be expressed via `filter()` or manual conditional logic. Other frameworks (fast-check, Hypothesis) provide cleaner precondition syntax.

### Current vs Proposed

**Current (manual conditional):**
```typescript
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.integer())
  .then(({ a, b }) => {
    if (b === 0) return true;  // Skip division by zero
    return a / b * b + a % b === a;
  })
  .check();
```

**Proposed:**
```typescript
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.integer())
  .then(({ a, b }) => {
    fc.pre(b !== 0);  // Skip if b is zero
    return a / b * b + a % b === a;
  })
  .check();
```

### API Design

```typescript
// Precondition check - throws special exception to skip
export function pre(condition: boolean): asserts condition;

// Example with message
export function pre(condition: boolean, message?: string): asserts condition;
```

### Implementation Sketch

```typescript
class PreconditionFailure extends Error {
  readonly isPreconditionFailure = true;
}

export function pre(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new PreconditionFailure(message ?? 'Precondition failed');
  }
}

// In FluentCheckAssert.run(), catch PreconditionFailure and count as skip
```

### Impact
- **Clarity**: Explicit preconditions vs hidden conditionals
- **Statistics**: Can track skip rate for preconditions
- **Compatibility**: Standard pattern in property testing

---

## Proposal 3: `suchThat` Filter Alias

### Summary
Add `suchThat` as an alias for `filter` to align with property testing conventions.

### Motivation
QuickCheck, ScalaCheck, and other frameworks use `suchThat` for filtered generation. This improves familiarity for developers coming from other property testing tools.

### Current vs Proposed

**Current:**
```typescript
fc.integer().filter(x => x > 0)
```

**Proposed (equivalent):**
```typescript
fc.integer().suchThat(x => x > 0)
```

### API Design

```typescript
// In Arbitrary class
suchThat(predicate: (value: A) => boolean): Arbitrary<A>;

// Implementation: just alias filter
suchThat = this.filter;
```

### Impact
- **Discoverability**: More intuitive for newcomers
- **Compatibility**: Familiar to QuickCheck/ScalaCheck users
- **Cost**: Near zero implementation effort

---

## Proposal 4: Common Arbitrary Presets

### Summary
Add shorthand factories for frequently-used arbitrary configurations.

### Motivation
Analysis shows common patterns like "positive integer" and "non-empty array" require verbose setup with filter or range specifications.

### Proposed API

```typescript
// Integer presets
fc.positiveInt()      // integer(1, MAX_SAFE_INTEGER)
fc.negativeInt()      // integer(MIN_SAFE_INTEGER, -1)
fc.nonZeroInt()       // union(negativeInt(), positiveInt())
fc.byte()             // integer(0, 255)
fc.percentage()       // real(0, 100)

// String presets
fc.nonEmptyString()   // string(1)
fc.word()             // string with alphanumeric chars
fc.identifier()       // string matching /^[a-z][a-z0-9]*$/i

// Collection presets
fc.nonEmptyArray<A>(arb: Arbitrary<A>)  // array(arb, 1)
fc.pair<A>(arb: Arbitrary<A>)            // tuple(arb, arb)

// Special values
fc.nullable<A>(arb: Arbitrary<A>)  // union(arb, constant(null))
fc.optional<A>(arb: Arbitrary<A>)  // union(arb, constant(undefined))
```

### Implementation Sketch

```typescript
export const positiveInt = () => integer(1, Number.MAX_SAFE_INTEGER);
export const negativeInt = () => integer(Number.MIN_SAFE_INTEGER, -1);
export const nonZeroInt = () => union(negativeInt(), positiveInt());
export const byte = () => integer(0, 255);

export const nonEmptyString = (maxLength = 100) => string(1, maxLength);
export const nonEmptyArray = <A>(arb: Arbitrary<A>, maxLength = 10) => 
  array(arb, 1, maxLength);

export const nullable = <A>(arb: Arbitrary<A>) => union(arb, constant(null));
export const optional = <A>(arb: Arbitrary<A>) => union(arb, constant(undefined));
```

### Impact
- **Verbosity reduction**: 30% for affected patterns
- **Discoverability**: IDE autocomplete shows common options
- **Documentation**: Self-documenting via names

---

## Proposal 5: Fluent Assertion Terminals

### Summary
Add fluent terminal methods that include assertion, eliminating Chai wrapper verbosity.

### Motivation
The Chai `expect().to.have.property()` wrapper obscures the fluent nature of the API and adds visual noise to every test.

### Current vs Proposed

**Current:**
```typescript
expect(fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 0 === x)
  .check()
).to.have.property('satisfiable', true);
```

**Proposed:**
```typescript
fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 0 === x)
  .shouldBeSatisfiable();  // Throws if not
```

### API Design

```typescript
// Terminal methods on FluentCheck
shouldBeSatisfiable(): void;
shouldNotBeSatisfiable(): void;
shouldFindExample(expected: Partial<Rec>): void;

// Or on FluentResult
interface FluentResult<Rec> {
  satisfiable: boolean;
  example: Rec;
  seed?: number;
  
  // New assertion methods
  assertSatisfiable(): void;
  assertNotSatisfiable(): void;
  assertExample(expected: Partial<Rec>): void;
}
```

### Implementation Sketch

```typescript
class FluentResult<Rec> {
  assertSatisfiable(): void {
    if (!this.satisfiable) {
      throw new Error(`Expected property to be satisfiable but got counterexample: ${JSON.stringify(this.example)}`);
    }
  }
  
  assertNotSatisfiable(): void {
    if (this.satisfiable) {
      throw new Error(`Expected property to be unsatisfiable but found example: ${JSON.stringify(this.example)}`);
    }
  }
  
  assertExample(expected: Partial<Rec>): void {
    this.assertSatisfiable();
    for (const [key, value] of Object.entries(expected)) {
      if (this.example[key] !== value) {
        throw new Error(`Expected example.${key} to be ${value} but got ${this.example[key]}`);
      }
    }
  }
}
```

### Impact
- **Verbosity reduction**: Removes Chai wrapper noise
- **Clarity**: Intent is explicit in method name
- **Integration**: Works alongside existing Chai usage

---

## Proposal 6: Strategy Presets

### Summary
Add pre-configured strategy combinations for common testing scenarios.

### Motivation
Strategy configuration is verbose (9 method calls for thorough testing). Most users want standard configurations without understanding all options.

### Current vs Proposed

**Current (9 LOC):**
```typescript
fc.scenario()
  .config(fc.strategy()
    .withRandomSampling()
    .usingCache()
    .withoutReplacement()
    .withShrinking()
  )
  .exists('a', fc.integer())
  .then(({ a }) => a + 1000 > a)
  .check();
```

**Proposed (3 LOC):**
```typescript
fc.scenario()
  .config(fc.strategies.thorough)
  .exists('a', fc.integer())
  .then(({ a }) => a + 1000 > a)
  .check();
```

### API Design

```typescript
export const strategies = {
  // Default - good balance of speed and coverage
  default: strategy().build(),
  
  // Fast - quick feedback, less thorough
  fast: strategy()
    .withRandomSampling()
    .build(),
  
  // Thorough - best coverage, slower
  thorough: strategy()
    .withRandomSampling()
    .usingCache()
    .withoutReplacement()
    .withShrinking()
    .build(),
  
  // Exhaustive - for small search spaces
  exhaustive: strategy()
    .withSystematicSampling()
    .build(),
    
  // Minimal - for debugging
  minimal: strategy()
    .withSampleCount(10)
    .build(),
};
```

### Impact
- **Verbosity reduction**: 45% for configured tests
- **Discoverability**: Clear preset names
- **Flexibility**: Custom config still available

---

## Proposal 7: Property Combinator Library

### Summary
Add a library of reusable property combinators for common patterns.

### Motivation
Common properties (idempotent, commutative, inverse) are reimplemented across tests. A combinator library reduces duplication and improves expressiveness.

### API Design

```typescript
export const props = {
  // Array properties
  sorted: <T>(arr: T[], cmp?: (a: T, b: T) => number) => boolean,
  unique: <T>(arr: T[]) => boolean,
  nonEmpty: <T>(arr: T[]) => boolean,
  allMatch: <T>(arr: T[], pred: (x: T) => boolean) => boolean,
  
  // Number properties
  inRange: (n: number, min: number, max: number) => boolean,
  isFinite: (n: number) => boolean,
  isInteger: (n: number) => boolean,
  
  // String properties
  nonEmptyString: (s: string) => boolean,
  matches: (s: string, pattern: RegExp) => boolean,
};

export const templates = {
  // f(f(x)) === f(x)
  idempotent: <T>(arb: Arbitrary<T>, fn: (x: T) => T) => FluentCheck,
  
  // f(a, b) === f(b, a)
  commutative: <T, R>(arb: Arbitrary<T>, fn: (a: T, b: T) => R) => FluentCheck,
  
  // f(a, f(b, c)) === f(f(a, b), c)
  associative: <T>(arb: Arbitrary<T>, fn: (a: T, b: T) => T) => FluentCheck,
  
  // f(a, identity) === a
  identity: <T>(arb: Arbitrary<T>, fn: (a: T, b: T) => T, id: T) => FluentCheck,
  
  // decode(encode(x)) === x
  roundtrip: <A, B>(arb: Arbitrary<A>, encode: (a: A) => B, decode: (b: B) => A) => FluentCheck,
};
```

### Usage Examples

```typescript
// Using props
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .given('sorted', ({ xs }) => [...xs].sort((a, b) => a - b))
  .then(({ sorted }) => props.sorted(sorted))
  .check();

// Using templates
templates.roundtrip(
  fc.array(fc.integer()),
  JSON.stringify,
  JSON.parse
).check();

templates.commutative(
  fc.integer(),
  (a, b) => a + b
).check();
```

### Impact
- **Reusability**: Common patterns encapsulated
- **Expressiveness**: Intent-revealing code
- **Documentation**: Templates serve as examples

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)

1. `suchThat` alias
2. `nullable` and `optional` helpers
3. Common arbitrary presets

### Phase 2: Core Improvements (3-5 days)

4. `fc.prop()` shorthand
5. `fc.pre()` preconditions
6. Fluent assertion terminals

### Phase 3: Enhanced Experience (1 week)

7. Strategy presets
8. Property combinator library
9. Documentation updates

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| LOC for simple property | 5 | 1 |
| Method calls for basic test | 4 | 2 |
| Strategy config LOC | 9 | 3 |
| New user time-to-first-test | 15 min | 5 min |

## Follow-Up Changes

Each proposal should be implemented as a separate OpenSpec change:

1. `add-prop-shorthand` - Proposal 1
2. `add-preconditions` - Proposal 2
3. `add-filter-alias` - Proposal 3
4. `add-arbitrary-presets` - Proposal 4
5. `add-assertion-terminals` - Proposal 5
6. `add-strategy-presets` - Proposal 6
7. `add-property-combinators` - Proposal 7

Each change will include:
- Detailed spec with scenarios
- Implementation tasks
- Test coverage
- Documentation updates
