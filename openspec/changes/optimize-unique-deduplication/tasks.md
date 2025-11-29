## 1. Implementation

- [ ] 1.1 Add hash-based lookup using `Set<string>` with JSON.stringify
- [ ] 1.2 Add fallback to array-based O(n²) for non-serializable types
- [ ] 1.3 Handle edge cases: circular references, functions, symbols
- [ ] 1.4 Consider using faster serialization (e.g., stable-stringify for consistent key order)

## 2. Testing

- [ ] 2.1 Verify uniqueness correctness for primitives
- [ ] 2.2 Verify uniqueness correctness for objects and arrays
- [ ] 2.3 Verify fallback works for non-serializable types
- [ ] 2.4 Add benchmark comparing old vs new implementation
- [ ] 2.5 Test with large sample sizes (>10000)

## 3. Documentation

- [ ] 3.1 Document performance characteristics in API docs
