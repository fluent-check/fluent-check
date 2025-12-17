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

The tests show how these quantifiers are used to express mathematical properties. For example, from math.test.ts:

```typescript
// Finding the neutral element of addition (exists 'a' such that a + b = b for all b)
it('finds the neutral element of addition', () => {
  expect(fc.scenario()
    .exists('a', fc.integer())
    .forall('b', fc.integer(-10, 10))
    .then(({a, b}) => a + b === b)
    .check()
  ).to.deep.include({satisfiable: true, example: {a: 0}})
})

// Testing if every integer has an additive inverse
it('finds if addition has an inverse', () => {
  expect(fc.scenario()
    .forall('a', fc.integer(-10, 10))
    .exists('b', fc.integer(-10, 10))
    .then(({a, b}) => a + b === 0)
    .check()
  ).to.have.property('satisfiable', true)
})
```

## Implementation Details

### Scenario AST

Quantifiers are represented as nodes in the Scenario AST:

```typescript
export interface ForallNode<A = unknown> {
  readonly type: 'forall'
  readonly name: string
  readonly arbitrary: Arbitrary<A>
}

export interface ExistsNode<A = unknown> {
  readonly type: 'exists'
  readonly name: string
  readonly arbitrary: Arbitrary<A>
}

export type QuantifierNode<A = unknown> = ForallNode<A> | ExistsNode<A>
```

### ExecutableQuantifier

When a Scenario is compiled into an ExecutableScenario, quantifiers become executable:

```typescript
export interface ExecutableQuantifier<A = unknown> {
  readonly name: string
  readonly type: 'forall' | 'exists'
  sample(sampler: Sampler, count: number): FluentPick<A>[]
  sampleWithBias(sampler: Sampler, count: number): FluentPick<A>[]
  shrink(pick: FluentPick<A>, sampler: Sampler, count: number): FluentPick<A>[]
  isShrunken(candidate: FluentPick<A>, current: FluentPick<A>): boolean
}
```

### Quantifier Semantics

The `Explorer` interprets quantifiers using the `QuantifierSemantics` pattern:

```typescript
interface QuantifierSemantics<Rec extends {}> {
  exists(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec>
  forall(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec>
}
```

For universal properties (`forall`):
- All samples must pass the property
- Stops when a counterexample is found

For existential properties (`exists`):
- At least one sample must pass the property
- Stops when a witness is found

## Result Reporting

When using existential quantifiers, FluentCheck not only reports if a property is satisfiable but also provides the example that satisfies it:

```typescript
// The test result contains the specific value (0) that satisfies the property
expect(result).to.deep.include({
  satisfiable: true, 
  example: {a: 0}
});
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