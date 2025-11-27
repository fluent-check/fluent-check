# Implementation Tasks

## 1. Property Helpers (`fc.props`)
- [ ] 1.1 Create `src/props.ts` module
- [ ] 1.2 Implement `sorted(arr, comparator?)` helper
- [ ] 1.3 Implement `unique(arr)` helper
- [ ] 1.4 Implement `nonEmpty(arr)` helper
- [ ] 1.5 Implement `inRange(n, min, max)` helper
- [ ] 1.6 Implement `matches(s, pattern)` helper

## 2. Property Templates (`fc.templates`)
- [ ] 2.1 Create `src/templates.ts` module
- [ ] 2.2 Implement `roundtrip(arb, encode, decode)` template
- [ ] 2.3 Implement `idempotent(arb, fn)` template
- [ ] 2.4 Implement `commutative(arb, fn)` template
- [ ] 2.5 Implement `associative(arb, fn)` template
- [ ] 2.6 Implement `identity(arb, fn, identityValue)` template

## 3. Export & Integration
- [ ] 3.1 Export `props` namespace from `src/index.ts`
- [ ] 3.2 Export `templates` namespace from `src/index.ts`

## 4. Testing
- [ ] 4.1 Add tests for each property helper
- [ ] 4.2 Add tests for roundtrip template with JSON encode/decode
- [ ] 4.3 Add tests for idempotent template
- [ ] 4.4 Add tests for commutative template with addition
- [ ] 4.5 Add tests for associative template

## 5. Documentation
- [ ] 5.1 Add JSDoc comments with examples
- [ ] 5.2 Create usage guide for templates
- [ ] 5.3 Add examples to README
