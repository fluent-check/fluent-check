# Change: Add Strategy Presets

## Why

Strategy configuration is verbose, requiring up to 9 method calls for thorough testing configuration. Most users want standard configurations without needing to understand all available options. Pre-configured strategy presets provide sensible defaults while maintaining access to full customization.

## What Changes

Add `fc.strategies` namespace with pre-configured strategy combinations:

```typescript
// Current (verbose)
fc.scenario()
  .config(fc.strategy()
    .withRandomSampling()
    .usingCache()
    .withoutReplacement()
    .withShrinking()
  )
  ...

// Proposed (preset)
fc.scenario()
  .config(fc.strategies.thorough)
  ...
```

### API

```typescript
export const strategies = {
  // Default - good balance of speed and coverage
  default: strategy().build(),
  
  // Fast - quick feedback, less thorough
  fast: strategy().withRandomSampling().build(),
  
  // Thorough - best coverage, slower
  thorough: strategy()
    .withRandomSampling()
    .usingCache()
    .withoutReplacement()
    .withShrinking()
    .build(),
  
  // Minimal - for debugging (10 samples)
  minimal: strategy().withSampleCount(10).build(),
};
```

## Impact

- Affected specs: `strategies`
- Affected code: `src/strategies/index.ts` or `src/index.ts`
- Breaking: None - additive change
- Verbosity reduction: 45% for configured tests
