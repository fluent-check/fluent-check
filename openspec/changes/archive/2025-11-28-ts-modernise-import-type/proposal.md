# Change: Use Explicit Type-Only Imports

> **GitHub Issue:** [#378](https://github.com/fluent-check/fluent-check/issues/378)

## Why
TypeScript supports `import type` syntax to explicitly mark imports that are only used for type information. This helps bundlers with tree-shaking, makes the code's intent clearer, and can prevent accidental runtime dependencies on type-only modules.

## What Changes
- Add `type` keyword to imports used only for type annotations
- Use inline `type` modifier for mixed imports: `import { type Foo, bar } from '...'`
- Apply consistently across all source files
- No runtime behavior changes

## Impact
- Affected specs: None (compile-time optimization)
- Affected code: All `src/**/*.ts` files with type-only imports
- Breaking: None (purely syntactic, generates identical JavaScript)

## Example

**Before:**
```typescript
import {ArbitrarySize, FluentPick} from './types.js'
import {Arbitrary} from './internal.js'

// ArbitrarySize and FluentPick are only used as types
```

**After:**
```typescript
import type {ArbitrarySize, FluentPick} from './types.js'
import {Arbitrary} from './internal.js'

// Clear: ArbitrarySize and FluentPick are type-only imports
```

**Mixed import example:**
```typescript
// Before
import {Arbitrary, FluentPick, FluentRandomGenerator} from './arbitraries/index.js'

// After (if FluentPick is type-only)
import {Arbitrary, type FluentPick, FluentRandomGenerator} from './arbitraries/index.js'
```

## Files to Review
- `src/FluentCheck.ts`
- `src/arbitraries/*.ts`
- `src/strategies/*.ts`
- `test/*.test.ts`

## Notes
This change can be automated with ESLint rule `@typescript-eslint/consistent-type-imports`.
