# Tasks: Add Generic Type Parameter to FluentResult

## 1. Core Type Changes

- [x] 1.1 Add generic type parameter `Rec extends {} = {}` to `FluentResult` class
- [x] 1.2 Change `example` property type from `PickResult<any>` to `Rec`
- [x] 1.3 Update `addExample()` method signature to work with generic type

## 2. Method Return Types

- [x] 2.1 Update `FluentCheck.check()` to return `FluentResult<Rec>`
- [x] 2.2 Update `FluentCheckAssert.check()` to return `FluentResult<Rec>` (inherited from FluentCheck)
- [x] 2.3 Update any other methods that return `FluentResult` (FluentReporter, FluentStrategyMixins)

## 3. Internal Type Adjustments

- [x] 3.1 Update `unwrapFluentPick()` to preserve type information
- [x] 3.2 Ensure `run()` method chain preserves `Rec` type
- [x] 3.3 Fix any type errors introduced by the changes

## 4. Test Updates

- [x] 4.1 Remove type assertions from test files that are no longer needed (N/A - no test changes needed)
- [x] 4.2 Add type-level tests to verify inference works correctly
- [x] 4.3 Ensure all existing tests pass

## 5. Validation

- [x] 5.1 Run `npm run lint` and verify zero new errors (pre-existing errors remain)
- [x] 5.2 Run `npm test` and verify all tests pass
- [x] 5.3 Run `openspec validate fix-fluentresult-generic-type --strict`
