# API Catalog

Complete catalog of FluentCheck's current API methods with usage assessment.

## Entry Points

| Method | Purpose | Assessment |
|--------|---------|------------|
| `scenario()` | Create new property test | ✅ Clear, fluent |
| `strategy()` | Create strategy builder | ✅ Appropriate |

## FluentCheck Chain Methods

### Quantifiers

| Method | Signature | Purpose | Assessment |
|--------|-----------|---------|------------|
| `forall` | `<K, A>(name: K, a: Arbitrary<A>)` | Universal quantification | ✅ Standard terminology |
| `exists` | `<K, A>(name: K, a: Arbitrary<A>)` | Existential quantification | ✅ Standard terminology |

### Setup Methods

| Method | Signature | Purpose | Assessment |
|--------|-----------|---------|------------|
| `given` | `<K, V>(name: K, v: V \| (() => V))` | Set up fixtures/constants | ✅ BDD-style, intuitive |
| `when` | `(f: (givens: Rec) => void)` | Perform actions | ✅ BDD-style, intuitive |
| `then` | `(f: (args: Rec) => boolean)` | Assert properties | ✅ BDD-style, intuitive |

### Chaining Extensions

| Method | Context | Purpose | Assessment |
|--------|---------|---------|------------|
| `and` | After `given` | Chain additional setups | ✅ Natural chaining |
| `and` | After `when` | Chain additional actions | ✅ Natural chaining |
| `and` | After `then` | Chain additional assertions | ✅ Natural chaining |

### Configuration

| Method | Signature | Purpose | Assessment |
|--------|-----------|---------|------------|
| `config` | `(strategy: FluentStrategyFactory)` | Configure test strategy | ⚠️ Verbose |
| `withGenerator` | `(gen, seed?)` | Set PRNG | ✅ Clear purpose |
| `check` | `()` | Execute property test | ✅ Terminal operation |

## Arbitraries - Primitives

| Factory | Signature | Purpose | Assessment |
|---------|-----------|---------|------------|
| `integer` | `(min?, max?)` | Integer arbitrary | ✅ Good defaults |
| `real` | `(min?, max?)` | Float arbitrary | ✅ Consistent with integer |
| `nat` | `(min?, max?)` | Natural number arbitrary | ✅ Useful shorthand |
| `boolean` | `()` | Boolean arbitrary | ✅ Simple |
| `constant` | `<A>(value: A)` | Single-value arbitrary | ✅ Clear purpose |
| `empty` | `()` | Empty arbitrary | ✅ Useful for edge cases |

## Arbitraries - Strings

| Factory | Signature | Purpose | Assessment |
|---------|-----------|---------|------------|
| `string` | `(min?, max?, charArb?)` | String arbitrary | ✅ Flexible |
| `char` | `(min?, max?)` | Character range | ✅ Building block |
| `hex` | `()` | Hex character | ✅ Useful preset |
| `base64` | `()` | Base64 character | ✅ Useful preset |
| `ascii` | `()` | ASCII character | ✅ Useful preset |
| `unicode` | `()` | Unicode character | ✅ Useful preset |

## Arbitraries - Collections

| Factory | Signature | Purpose | Assessment |
|---------|-----------|---------|------------|
| `array` | `<A>(arb, min?, max?)` | Array arbitrary | ✅ Standard |
| `set` | `<A>(elements, min?, max?)` | Set arbitrary | ✅ Clear semantics |
| `tuple` | `<U>(...arbitraries)` | Tuple arbitrary | ✅ Type-safe |
| `oneof` | `<A>(elements)` | Pick from array | ✅ Intuitive |
| `union` | `<A>(...arbitraries)` | Union of arbitraries | ✅ Powerful composition |

## Arbitraries - DateTime

| Factory | Signature | Purpose | Assessment |
|---------|-----------|---------|------------|
| `date` | `(min?, max?)` | Date arbitrary | ✅ Useful |
| `time` | `(min?, max?)` | Time arbitrary | ✅ Useful |
| `datetime` | `(min?, max?)` | DateTime arbitrary | ✅ Useful |
| `duration` | `(min?, max?)` | Duration arbitrary | ✅ Useful |

## Arbitraries - Special

| Factory | Signature | Purpose | Assessment |
|---------|-----------|---------|------------|
| `regex` | `(pattern)` | Regex-based string | ✅ Powerful |
| `patterns` | various | Common patterns | ✅ Useful presets |

## Arbitrary Instance Methods

### Transformation

| Method | Signature | Purpose | Assessment |
|--------|-----------|---------|------------|
| `map` | `<B>(f: A => B, opts?)` | Transform values | ✅ Functor-like |
| `filter` | `(pred: A => boolean)` | Filter values | ⚠️ Consider `suchThat` alias |
| `chain` | `<B>(f: A => Arbitrary<B>)` | Dependent generation | ✅ Monad-like |

### Sampling

| Method | Signature | Purpose | Assessment |
|--------|-----------|---------|------------|
| `sample` | `(n?, rng?)` | Generate n values | ✅ Clear |
| `sampleWithBias` | `(n?, rng?)` | Generate with corner cases | ✅ Useful |
| `sampleUnique` | `(n?, rng?)` | Generate unique values | ✅ Useful |
| `sampleUniqueWithBias` | `(n?, rng?)` | Unique with bias | ✅ Complete |

### Inspection

| Method | Signature | Purpose | Assessment |
|--------|-----------|---------|------------|
| `size` | `()` | Get search space size | ✅ Useful for analysis |
| `cornerCases` | `()` | Get edge cases | ✅ Debugging aid |
| `canGenerate` | `(pick)` | Check if value possible | ✅ Validation |
| `shrink` | `(pick)` | Get shrunk arbitrary | ✅ Core functionality |

## Strategy Builder Methods

| Method | Purpose | Assessment |
|--------|---------|------------|
| `withRandomSampling` | Enable random sampling | ✅ Clear |
| `usingCache` | Enable caching | ✅ Clear |
| `withoutReplacement` | Disable replacement | ✅ Clear |
| `withShrinking` | Enable shrinking | ✅ Clear |
| `build` | Create strategy | ✅ Builder pattern |

## Naming Consistency Analysis

### Positive Patterns

1. **BDD naming** (`given`/`when`/`then`) - Intuitive for test authors
2. **Standard quantifiers** (`forall`/`exists`) - Familiar to formal methods background
3. **Consistent factory pattern** - All arbitraries created via functions
4. **Method chaining** - Natural left-to-right reading

### Opportunities for Improvement

1. **`filter` vs `suchThat`**: `suchThat` is more common in property testing (QuickCheck, ScalaCheck)
2. **Missing `property` shorthand**: Other frameworks have simpler entry for basic properties
3. **Strategy configuration verbose**: Could benefit from presets
4. **`check()` vs `run()` vs `verify()`**: Consider aliases for different mental models
