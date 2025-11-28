# Implementation Tasks

## 1. Property Helpers (`fc.props`)
- [x] 1.1 Create `src/props.ts` module
- [x] 1.2 Implement `sorted(arr, comparator?)` helper
- [x] 1.3 Implement `unique(arr)` helper
- [x] 1.4 Implement `nonEmpty(arr)` helper
- [x] 1.5 Implement `inRange(n, min, max)` helper
- [x] 1.6 Implement `matches(s, pattern)` helper

## 2. Property Templates (`fc.templates`)
- [x] 2.1 Create `src/templates.ts` module
- [x] 2.2 Implement `roundtrip(arb, encode, decode)` template
- [x] 2.3 Implement `idempotent(arb, fn)` template
- [x] 2.4 Implement `commutative(arb, fn)` template
- [x] 2.5 Implement `associative(arb, fn)` template
- [x] 2.6 Implement `identity(arb, fn, identityValue)` template

## 3. Export & Integration
- [x] 3.1 Export `props` namespace from `src/index.ts`
- [x] 3.2 Export `templates` namespace from `src/index.ts`

## 4. Testing
- [x] 4.1 Add tests for each property helper
- [x] 4.2 Add tests for roundtrip template with JSON encode/decode
- [x] 4.3 Add tests for idempotent template
- [x] 4.4 Add tests for commutative template with addition
- [x] 4.5 Add tests for associative template

## 5. Documentation
- [x] 5.1 Add JSDoc comments with examples
- [x] 5.2 Create usage guide for templates
- [x] 5.3 Add examples to README
