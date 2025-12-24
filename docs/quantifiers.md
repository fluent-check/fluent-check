# Universal and Existential Quantifiers

FluentCheck is distinctive in its explicit support for both universal ("forall") and existential ("exists") quantifiers, bringing mathematical rigor to property testing.

## Design Philosophy

In mathematical logic, quantifiers express the scope and validity of logical statements:
- **Universal quantifier (∀)**: A property must hold for all values in a domain
- **Existential quantifier (∃)**: A property must hold for at least one value in a domain

FluentCheck implements these concepts directly in its API, providing a way to express both types of properties:

```typescript
// Universal: For all integers x, x + 0 = x
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x + 0 === x)
  .check()

// Existential: There exists a string with length 5
fc.scenario()
  .exists('s', fc.string())
  .then(({s}) => s.length === 5)
  .check()
```

The test suite includes many examples of mixed quantifiers. For example (see `test/assertions.test.ts`):

```typescript
const result = fc.scenario()
  .exists('a', fc.integer())
  .forall('b', fc.integer(-10, 10))
  .then(({a, b}) => a + b === b)
  .check()

// Only the existential binding is reported as the witness.
result.assertExample({a: 0})
```

## Implementation Details

FluentCheck builds an immutable Scenario AST (see `.buildScenario()`) and executes it using an `Explorer` (search) plus an optional `Shrinker` (minimization).

At a high level:

- For pure `forall` scenarios, execution searches for a counterexample. Finding one makes the result unsatisfiable.
- For scenarios with at least one `exists`, execution searches for a witness. Finding one makes the result satisfiable; exhausting the budget without a witness makes the result unsatisfiable.

Shrinking behavior:

- Failing results (counterexamples) are shrunk toward a smaller failing input.
- Satisfiable `exists` results (witnesses) are shrunk toward a smaller witness, and `result.example` reports only the existential bindings.

## Result Reporting

When using existential quantifiers, FluentCheck reports the witness as the `example`:

```typescript
const result = fc.scenario()
  .exists('a', fc.integer())
  .forall('b', fc.integer(-10, 10))
  .then(({a, b}) => a + b === b)
  .check()

console.log(result.satisfiable) // true
console.log(result.example)     // { a: 0 }
```

## Practical Applications

### Universal Quantifiers
- Verifying mathematical properties: commutativity, associativity, distributivity
- Testing invariants: "all users should have unique IDs"
- Validating transformations: "parsing and then serializing should return the original value"

### Existential Quantifiers
- Verifying reachability: "there exists a path from start to goal"
- Testing search algorithms: "there exists an element in the array satisfying the predicate"
- Finding solutions: "there exists a valid configuration"
- Discovering values with special properties: "there exists a neutral element for addition"

## Combining Quantifiers

FluentCheck allows for mixing quantifiers to express complex properties that use both universal and existential quantification:

```typescript
// For every integer a, there exists an integer b such that a + b = 0
fc.scenario()
  .forall('a', fc.integer(-10, 10))
  .exists('b', fc.integer(-10, 10))
  .then(({a, b}) => a + b === 0)
  .check()
```

This ability to combine quantifiers enables expressing sophisticated mathematical and logical properties that would be difficult to articulate with traditional testing approaches.

## Comparison with Other Frameworks

Most property testing frameworks only implement universal quantification (forall) implicitly, without providing a way to express existential properties. FluentCheck's explicit support for both types of quantifiers makes it more expressive and flexible for different testing scenarios. This distinction is particularly valuable for:

1. Mathematical properties that naturally involve both kinds of quantifiers
2. Proving existence of elements with certain properties
3. Finding specific values that satisfy complex conditions

---

## Empirical Evidence

FluentCheck's existential quantifier support has been validated through empirical studies measuring:

- **Detection efficiency**: Witness detection rates across different densities
- **Performance**: Time to find witnesses, tests-to-witness distribution
- **Theoretical accuracy**: Observed vs expected detection rates

Key findings:
- Dense witnesses (50%+ density): Near 100% detection in 1-5 tests
- Moderate witnesses (10% density): ~99% detection with 50 samples
- Mixed quantifier patterns (exists-forall, forall-exists) work efficiently

For detailed results, see [Statistical Evidence: Existential Quantifier Study](evidence/README.md#4-existential-quantifier-study).

For expressiveness comparison, see [Existential Quantifier Expressiveness](evidence/exists-expressiveness.md).
