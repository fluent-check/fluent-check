# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

#### BREAKING: Modernize to Node.js 24 LTS and ES2024

**Minimum Node.js version is now 22.x**. Node.js 18 reaches end-of-life in April 2025.

- **Infrastructure Updates:**
  - Updated minimum Node.js requirement to ≥22 in `package.json` engines field
  - Updated TypeScript compilation target from ES2022 to ES2024
  - Updated CI workflow to test on Node.js 22.x and 24.x (previously 18.x and 20.x)
  - Updated README with Node.js requirements

- **Adopted ES2022 Features:**
  - **Array.at()**: Replaced `array[array.length - 1]` with cleaner `array.at(-1)` for negative indexing
    - Updated `ArbitraryComposite.ts` for cleaner last-element access
  - **Error cause**: Added `cause` option to all thrown errors for better debugging with meaningful error chains
    - Updated `FluentStrategy.ts` (3 instances)
    - Updated `FluentStrategyMixins.ts` (2 instances)
    - Updated `regex.ts` (1 instance with pattern context)

- **Adopted ES2023 Features:**
  - **Array.prototype.toSorted()**: Replaced mutating `.sort()` with immutable `.toSorted()` for safer functional code
    - Updated `ArbitrarySet.ts` for immutable sorting of set elements
    - Updated `ArbitraryInteger.ts` for immutable sorting of corner cases

- **Removed Deprecated APIs:**
  - Replaced deprecated `String.prototype.substr()` with `slice()` in `regex.ts`

- **Modern Iteration Patterns:**
  - Replaced `for...in` on arrays with `for...of` in `Arbitrary.ts`
  - Replaced `for...in` on arrays with standard `for` loop in `ArbitraryTuple.ts`
  - Replaced `for...in` on objects with `Object.entries()` in `FluentCheck.ts`

- **Benefits:**
  - Latest Node.js LTS with support until 2028; V8 13.6 engine
  - Smaller compilation output; no downlevel transforms needed
  - Cleaner, more expressive code with modern JavaScript features
  - Better error debugging with error cause chains
  - Safer code with immutable operations

**Migration Guide:**
- Upgrade to Node.js 22 or later (Node.js 24 LTS recommended)
- No code changes required for users of the library
- All API surfaces remain unchanged
