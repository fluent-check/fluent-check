# Change: Modernize to Node.js 24 LTS and ES2025

## Why
Node.js 24 entered LTS on October 28, 2025 and will be maintained until April 2028. The project currently targets ES2022 and tests on Node.js 18/20, missing out on significant JavaScript improvements. Upgrading to Node.js 24 LTS with ES2025 brings cleaner syntax, better performance, and modern features that improve code quality and developer experience.

**Node.js 18 reaches end-of-life in April 2025** - this is an ideal time to upgrade the minimum version.

## What Changes

### 1. Update Node.js Requirements

**Minimum version:** Node.js 22.x (for broader compatibility)  
**CI matrix:** Node.js 22.x and 24.x (current LTS)

**`.github/workflows/node.js.yml`:**
```yaml
# Before
node-version: [18.x, 20.x]

# After
node-version: [22.x, 24.x]
```

### 2. Update TypeScript Target to ES2024

Update `tsconfig.json` to target ES2024, enabling native support for all features below.

```json
// Before
"target": "ES2022"

// After  
"target": "ES2024"
```

> Note: TypeScript 5.x supports ES2024 as a target. ES2025 target may require TypeScript 5.7+.

---

## ES2022 Features to Adopt

### 3. `Array.at()` for Negative Indexing
Replace `array[array.length - 1]` with `array.at(-1)` for cleaner last-element access.

**Locations:** `src/arbitraries/ArbitraryComposite.ts` (2 instances)

```typescript
// Before
acc[acc.length - 1]
weights[weights.length - 1]

// After
acc.at(-1)
weights.at(-1)
```

### 4. Error `cause` for Error Chaining
Add `cause` option when throwing errors to improve debugging with meaningful error chains.

**Locations:**
- `src/strategies/FluentStrategy.ts` (3 instances)
- `src/strategies/FluentStrategyMixins.ts` (2 instances)
- `src/arbitraries/regex.ts` (1 instance)

```typescript
// Before
throw new Error('Method <hasInput> not implemented.')

// After
throw new Error('Method <hasInput> not implemented.', { 
  cause: 'FluentStrategy is abstract - subclasses must implement this method'
})
```

---

## ES2023 Features to Adopt

### 5. `Array.prototype.toSorted()` for Immutable Sorting
Replace mutating `.sort()` with `.toSorted()` for safer functional code.

**Locations:**
- `src/arbitraries/ArbitrarySet.ts` (line 30)
- `src/arbitraries/ArbitraryInteger.ts` (lines 22-24)

```typescript
// Before
const value = Array.from(pick).sort()
const ccs = [... new Set(...)].sort((a,b) => Math.abs(a) - Math.abs(b))

// After
const value = Array.from(pick).toSorted()
const ccs = [... new Set(...)].toSorted((a,b) => Math.abs(a) - Math.abs(b))
```

---

## ES2024 Features to Adopt

### 6. `Object.groupBy()` for Grouping Operations
Use native grouping instead of manual reduce patterns (if applicable patterns exist).

```typescript
// Example usage for future code
const grouped = Object.groupBy(testResults, result => result.status)
```

### 7. `Promise.withResolvers()` for Cleaner Async Patterns
Create promise with exposed resolve/reject without constructor boilerplate (if applicable).

```typescript
// Before
let resolve, reject
const promise = new Promise((res, rej) => { resolve = res; reject = rej })

// After
const { promise, resolve, reject } = Promise.withResolvers()
```

---

## ES2025 Features to Consider (Node.js 24+)

### 8. Set Methods for Set Operations
Native `Set.prototype.union()`, `intersection()`, `difference()`, `symmetricDifference()`, `isSubsetOf()`, `isSupersetOf()`, `isDisjointFrom()`.

**Potential use in:** `src/arbitraries/ArbitrarySet.ts` for set-based arbitrary operations.

```typescript
// Example: checking if generated set is subset of allowed elements
const isValid = generatedSet.isSubsetOf(allowedElements)

// Example: combining arbitraries
const combined = setA.union(setB)
```

### 9. RegExp `/v` Flag (unicodeSets)
Enhanced regex capabilities with set notation and properties of strings.

**Potential use in:** `src/arbitraries/regex.ts` for more expressive character class definitions.

```typescript
// Match emoji sequences
const emojiRegex = /[\p{Emoji}--\p{ASCII}]/v

// Set operations in character classes
const letterOrDigit = /[[a-z][0-9]]/v
```

---

## Benefits Summary

| Change | Benefit |
|--------|---------|
| Node.js 24 LTS | Latest LTS with support until 2028; V8 13.6 engine |
| ES2024 target | Smaller output; no downlevel transforms |
| `Array.at(-1)` | Eliminates verbose `arr[arr.length - 1]` |
| `toSorted()` | Prevents accidental mutation; safer code |
| Error `cause` | Better stack traces; easier debugging |
| `Object.groupBy()` | Native grouping; no lodash/manual reduce |
| Set methods | Native set operations; cleaner arbitrary composition |
| RegExp `/v` flag | More expressive regex patterns |

## Impact

- **Affected specs:** None (implementation detail)
- **Affected code:** Various files throughout `src/`, CI workflows
- **Breaking:** **Yes** - Drops Node.js 18/20 support
- **Runtime requirements:** Node.js ≥22
- **Migration path:** Users on Node.js 18/20 must upgrade (18 is EOL April 2025)

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add `"engines": { "node": ">=22" }` |
| `tsconfig.json` | Update target to `ES2024` |
| `.github/workflows/node.js.yml` | Update matrix to `[22.x, 24.x]` |
| `src/arbitraries/ArbitraryComposite.ts` | `Array.at()` |
| `src/arbitraries/ArbitrarySet.ts` | `toSorted()` |
| `src/arbitraries/ArbitraryInteger.ts` | `toSorted()` |
| `src/strategies/FluentStrategy.ts` | Error `cause` |
| `src/strategies/FluentStrategyMixins.ts` | Error `cause` |
| `src/arbitraries/regex.ts` | Error `cause` |
| `README.md` | Update Node.js requirements |

## Non-Goals

- **`Object.hasOwn()`** - No `hasOwnProperty` calls exist in the codebase
- **Temporal API** - Still Stage 3; not ready for production
- **Decorators** - Would require significant refactoring; separate proposal if desired

## Rollout Strategy

1. **Phase 1:** Update CI, tsconfig, and package.json (this proposal)
2. **Phase 2:** Adopt ES2022/ES2023 features (Array.at, toSorted, error cause)
3. **Phase 3:** Evaluate ES2024/ES2025 features for future adoption (Set methods, groupBy)
