## 1. Implementation

- [ ] 1.1 Update `ArbitraryInteger.shrink()` to use binary search algorithm
- [ ] 1.2 Update `ArbitraryReal.shrink()` to use binary search algorithm
- [ ] 1.3 Ensure boundary values (0, min, max) are tested early in shrink sequence
- [ ] 1.4 Handle negative numbers (shrink toward 0 from both directions)

## 2. Testing

- [ ] 2.1 Add unit tests for binary search shrink behavior
- [ ] 2.2 Verify existing shrinking tests still pass
- [ ] 2.3 Add benchmark comparing linear vs binary shrink performance
- [ ] 2.4 Test edge cases: min=max, negative ranges, large values

## 3. Documentation

- [ ] 3.1 Update shrinking documentation with new algorithm description
