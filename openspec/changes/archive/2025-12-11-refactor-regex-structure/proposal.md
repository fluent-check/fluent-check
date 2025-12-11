# Change: Refactor regex.ts for Better Structure and DRYness

> **GitHub Issue:** [#472](https://github.com/fluent-check/fluent-check/issues/472)

## Why

The `src/arbitraries/regex.ts` file had several quality issues:
- Reimplemented functions that already existed elsewhere (`integer`, `constant`, `array`, `tuple`, `union`, `oneof`)
- Duplicated character set definitions across email and URL patterns
- Incomplete and hardcoded character simplification mappings
- Poor code organization with mixed concerns
- Magic numbers scattered throughout
- Inconsistent circular dependency handling

This refactoring improves maintainability, reduces duplication, and follows established patterns in the codebase.

## What Changes

### Code Organization
- Organized code into logical sections with clear separators:
  - Types
  - Constants
  - Character Set Builders
  - Pattern Parsing
  - String Generation
  - Pattern Presets
  - Shrinking

### DRY Improvements
- Extracted common character sets into reusable functions:
  - `alphanumericChars()` - reused in multiple places
  - `wordChars()` - used for `\w` and email patterns
  - `domainChars()` - shared between email and URL patterns
- Created helper functions:
  - `stringFromChars()` - eliminates repeated `array().map(chars => chars.join(''))`
  - `domainName()` - reusable domain generation
  - `createCharClass()` - removes duplication in pattern parsing
  - `createPatternMatcher()` - centralized regex matching logic

### Code Quality
- Extracted magic numbers into named constants:
  - `DEFAULT_MAX_LENGTH`, `INFINITE_QUANTIFIER_MAX`, etc.
  - Character code constants (`CHAR_CODE_0`, `CHAR_CODE_A_UPPER`, etc.)
- Improved shrinking function structure:
  - Split into focused functions: `shrinkByRemoval()`, `shrinkByRepetition()`, `shrinkBySimplification()`
- Replaced incomplete hardcoded `simplifyMappings` with programmatic `getSimplerChars()` function

### Circular Dependency Handling
- Removed reimplemented functions, now imports from `index.js` (following pattern from `string.ts`, `presets.ts`, `datetime.ts`)
- Made `charClassMap` lazy (function instead of constant) to avoid circular dependency issues

## Impact

- **Affected specs**: None (refactoring only, no behavior changes)
- **Affected code**: `src/arbitraries/regex.ts`
- **Breaking change**: No - same behavior, better structure
- **Performance**: No change - same runtime behavior

## Examples

### Before: Duplicated Character Sets

```typescript
// In email()
const localPartChars = union(
  char('a', 'z'),
  char('A', 'Z'),
  integer(0, 9).map(String),
  oneof(['_', '.', '-'])
)

// In url() - duplicated!
const domainChars = union(
  char('a', 'z'),
  char('A', 'Z'),
  integer(0, 9).map(String),
  constant('-')
)
```

### After: Reusable Functions

```typescript
function alphanumericChars(): Arbitrary<string> {
  return union(
    char('a', 'z'),
    char('A', 'Z'),
    integer(0, 9).map(String)
  )
}

function domainChars(): Arbitrary<string> {
  return union(
    alphanumericChars(),
    constant('-')
  )
}

// Reused in both email() and url()
```

### Before: Incomplete Hardcoded Mappings

```typescript
const simplifyMappings: Record<string, string[]> = {
  '9': ['0', '1'],
  '8': ['0', '1'],
  // ... only 2-9 defined
  'Z': ['a'],
  'Y': ['a'],
  // ... other character simplifications (incomplete!)
}
```

### After: Programmatic and Complete

```typescript
function getSimplerChars(char: string): string[] {
  const code = char.charCodeAt(0)
  // Handles all digits, all uppercase, all lowercase programmatically
  if (code >= CHAR_CODE_0 && code <= CHAR_CODE_9) {
    if (code > CHAR_CODE_0) simplifications.push('0')
    if (code > CHAR_CODE_1) simplifications.push('1')
    return simplifications
  }
  // ... complete coverage
}
```

## Complexity Estimate

**Low Complexity** (few hours)

| Component | Effort | Notes |
|-----------|--------|-------|
| Extract character sets | Low | Simple function extraction |
| Organize into sections | Low | Reorganize existing code |
| Extract constants | Low | Find and replace magic numbers |
| Refactor shrinking | Low | Split into focused functions |
| Test verification | Low | Ensure no behavior changes |

## Success Criteria

1. All existing tests pass
2. No linting errors
3. Code follows same patterns as other arbitrary files (`string.ts`, `presets.ts`)
4. Reduced duplication (DRY principle)
5. Better code organization and readability
6. No circular dependency issues

## Related Issues

This is a code quality improvement with no related issues.

## Independence

This proposal is **fully independent**:
- No dependencies on other changes
- No breaking changes
- Pure refactoring
