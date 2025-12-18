# Existential Quantifier Expressiveness

This document demonstrates FluentCheck's distinctive `.exists()` support, comparing it with alternative approaches and analyzing the expressiveness advantages.

## The Problem: Expressing Existential Properties

Most property-based testing frameworks only implement universal quantification (∀ — "for all"), leaving existential properties (∃ — "there exists") to be emulated through workarounds. FluentCheck provides native support for both.

### FluentCheck's Native Approach

```typescript
// Find the neutral element of addition
fc.scenario()
  .exists('a', fc.integer(-100, 100))
  .forall('b', fc.integer(-10, 10))
  .then(({a, b}) => a + b === b)
  .check()
// Result: { satisfiable: true, example: { a: 0 } }
```

### Without Native Exists (Workaround)

```typescript
// Must manually search and verify
let witness = null;
for (let candidate = -100; candidate <= 100; candidate++) {
  let holdsForAll = true;
  for (let trial = 0; trial < 100; trial++) {
    const b = randomInt(-10, 10);
    if (candidate + b !== b) {
      holdsForAll = false;
      break;
    }
  }
  if (holdsForAll) {
    witness = candidate;
    break;
  }
}
// This is O(candidates × trials), verbose, and loses PBT benefits
```

---

## Pattern Comparison

| Pattern | FluentCheck | Without Native Exists |
|---------|-------------|----------------------|
| Find witness | `.exists('x', arb).then(p)` | Manual loop over candidates |
| exists-forall | `.exists('a').forall('b').then(p)` | Nested loops with early exit |
| forall-exists | `.forall('a').exists('b').then(p)` | Witness function or search per 'a' |
| Witness shrinking | Automatic | Manual implementation |
| Statistical guarantees | Yes (with confidence) | None |

---

## Complexity Analysis

### Search Space Complexity

| Quantifier Pattern | FluentCheck Strategy | Manual Emulation |
|-------------------|---------------------|------------------|
| exists(x) | O(samples) early-exit | O(samples) |
| exists(a).forall(b) | O(a_samples × b_samples) | O(a_samples × b_samples) |
| forall(a).exists(b) | O(a_samples × b_samples) | O(a_samples × b_samples) |

The advantage is not asymptotic complexity but:

1. **Declarative expression** — intent is clear from the code
2. **Automatic shrinking** — minimal witnesses found
3. **Consistent semantics** — same API for forall and exists
4. **Composability** — mix quantifiers freely
5. **Statistical confidence** — know when to stop searching

---

## Real-World Examples

### Example 1: Prime Factorization

```typescript
// FluentCheck: Does n have a non-trivial factor?
const n = 100;
fc.scenario()
  .exists('factor', fc.integer(2, n - 1))
  .then(({factor}) => n % factor === 0)
  .check()
// Result: { satisfiable: true, example: { factor: 2 } }
```

**Manual approach:**
```typescript
let factor = null;
for (let i = 2; i < n; i++) {
  if (n % i === 0) {
    factor = i;
    break;
  }
}
// Works, but loses shrinking and composition
```

### Example 2: Graph Reachability

```typescript
// FluentCheck: Is there a valid path from start to goal?
// Using the graph and path arbitraries for automatic generation and shrinking
fc.scenario()
  .forall('graph', fc.directedGraph(10, {min: 5, max: 20}))
  .exists('path', ({graph}) => fc.path(graph, 0, 9))
  .then(({graph, path}) => {
    // Verify path is valid: starts at 0, ends at 9, all edges exist
    if (path[0] !== 0 || path[path.length - 1] !== 9) return false
    for (let i = 0; i < path.length - 1; i++) {
      const edges = graph.edges.get(path[i]) ?? []
      if (!edges.some(e => e.target === path[i + 1])) return false
    }
    return true
  })
  .check()
```

**Alternative with given:**
```typescript
// For a specific graph structure
fc.scenario()
  .given('graph', () => buildGraph())
  .exists('path', ({graph}) => fc.path(graph, 0, 9))
  .then(({path}) => path.length > 0)
  .check()
```

**Manual approach:**
```typescript
// Requires implementing BFS/DFS or random path sampling
// Then verifying path validity
// No automatic shrinking to find minimal path
```

### Example 3: Finding Neutral Elements

```typescript
// Additive identity: exists a such that a + b = b for all b
fc.scenario()
  .exists('a', fc.integer(-10, 10))
  .forall('b', fc.integer(-10, 10))
  .then(({a, b}) => a + b === b)
  .check()
// Result: { satisfiable: true, example: { a: 0 } }

// Multiplicative identity: exists a such that a * b = b for all b ≠ 0
fc.scenario()
  .exists('a', fc.integer(-10, 10))
  .forall('b', fc.integer(1, 10))
  .then(({a, b}) => a * b === b)
  .check()
// Result: { satisfiable: true, example: { a: 1 } }
```

### Example 4: Additive Inverse

```typescript
// For every integer a, there exists an integer b such that a + b = 0
fc.scenario()
  .forall('a', fc.integer(-10, 10))
  .exists('b', fc.integer(-10, 10))
  .then(({a, b}) => a + b === 0)
  .check()
// Result: { satisfiable: true } — finds b = -a for each a
```

---

## Advantages Over Manual Approaches

### 1. Declarative Intent

FluentCheck's syntax directly mirrors mathematical notation:

| Mathematical | FluentCheck |
|-------------|-------------|
| ∃a ∈ A. P(a) | `.exists('a', A).then(({a}) => P(a))` |
| ∀b ∈ B. P(b) | `.forall('b', B).then(({b}) => P(b))` |
| ∃a ∈ A. ∀b ∈ B. P(a,b) | `.exists('a', A).forall('b', B).then(...)` |
| ∀a ∈ A. ∃b ∈ B. P(a,b) | `.forall('a', A).exists('b', B).then(...)` |

### 2. Automatic Shrinking

When FluentCheck finds a witness, it automatically shrinks to find a minimal example:

```typescript
fc.scenario()
  .exists('n', fc.integer(0, 1000))
  .then(({n}) => n * n > 50000)
  .check()
// Found: n = 224 (minimal integer where n² > 50000)
```

Manual shrinking would require:
```typescript
// Found n = 847 works
// Binary search to find minimal n
// Handle edge cases, ensure termination
// Retest property at each step
```

### 3. Composability

FluentCheck allows mixing quantifiers naturally:

```typescript
// Complex nested property
fc.scenario()
  .forall('list', fc.array(fc.integer()))
  .exists('element', fc.integer())
  .then(({list, element}) => 
    list.includes(element) || list.length === 0
  )
  .check()
```

### 4. Statistical Guarantees

With confidence-based termination, FluentCheck provides statistical claims:

```typescript
const result = fc.scenario()
  .exists('x', fc.integer(1, 1000000))
  .then(({x}) => isPrime(x))
  .checkWithConfidence(0.99)

// If no witness found: "99% confident no witness exists in sampled space"
// If witness found: example provided
```

---

## When to Use Existential Quantifiers

### Good Use Cases

1. **Finding special values**: neutral elements, inverses, fixed points
2. **Verifying reachability**: paths, states, configurations
3. **Existence proofs**: "there exists at least one solution"
4. **Search problems**: finding valid configurations

### Less Suitable Cases

1. **Sparse witnesses** (< 0.01% density): May require many samples
2. **Complex witness conditions**: Where witness validity is expensive to check
3. **Deterministic problems**: Where enumeration is more efficient
4. **forall-exists patterns with sparse witnesses**: Requires finding witnesses for EVERY forall value, making it exponentially harder

### The forall-exists Challenge

The pattern `forall('a', A).exists('b', B).then(P)` is fundamentally harder than `exists('a', A).forall('b', B).then(P)`:

- **exists-forall**: Find ONE 'a' that works for all 'b' values (one good needle)
- **forall-exists**: Find a witness 'b' for EVERY 'a' value (many needles)

For forall-exists with sparse witnesses, consider:
- Increasing sample size significantly
- Restructuring to a construction-based approach where you compute b=f(a)
- Using domain knowledge to narrow the search space

---

## Evidence from the Study

See the [Existential Quantifier Evidence Study](README.md#4-existential-quantifier-study) for empirical data on:

- Detection rates across different witness densities
- Tests-to-witness efficiency
- Comparison of observed vs theoretical detection rates
- Performance metrics (time per test, time to witness)

### Key Findings

The study uses large ranges (1M values) with modular arithmetic predicates to avoid birthday paradox effects, ensuring statistically valid results.

1. **Dense witnesses** (50%+ density): Near 100% detection in 1-2 tests
2. **Moderate witnesses** (10% density): ~100% detection with 50 samples
3. **Rare witnesses** (1% density): ~48% detection with 50 samples, ~100% with 500
4. **Sparse witnesses** (0.01% density): ~5% detection with 500 samples (matches theory)
5. **exists-forall pattern**: Works efficiently (~99.5% detection)
6. **forall-exists pattern**: Inherently hard (requires witnesses for ALL forall values)

---

## Conclusion

FluentCheck's native `.exists()` support provides:

- **Clearer code** that directly expresses mathematical intent
- **Automatic optimizations** like early-exit and shrinking
- **Consistent API** for both universal and existential quantification
- **Statistical rigor** with confidence-based termination

For properties that naturally involve existence claims, FluentCheck offers a more expressive and maintainable approach than manual workarounds.
