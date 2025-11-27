# Change: Add ArbitraryRecord

> **GitHub Issue:** [#427](https://github.com/fluent-check/fluent-check/issues/427)

## Why

Property-based tests frequently need to generate structured objects with named properties. Currently, users must either:
1. Use `tuple()` and manually destructure positional values
2. Use `given()` chains to incrementally build objects
3. Manually compose arbitraries with `map()`

This creates verbose, error-prone code when testing domain objects, API payloads, or configuration structures. A `record()` combinator would provide a direct, type-safe way to generate objects from a schema of arbitraries.

## What Changes

- Add new `ArbitraryRecord<S>` class that generates objects from a schema
- Add `fc.record(schema)` factory function in arbitraries index
- Support full type inference from schema to output object type
- Implement proper shrinking (shrink each property independently)
- Implement corner cases as combinations of property corner cases
- Export new arbitrary from main index

## Impact

- Affected specs: `arbitraries`
- Affected code:
  - `src/arbitraries/ArbitraryRecord.ts` (new)
  - `src/arbitraries/index.ts` (add export)
  - `src/arbitraries/internal.ts` (add export)
  - `test/record.test.ts` (new)
