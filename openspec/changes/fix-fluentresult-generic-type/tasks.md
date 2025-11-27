# Tasks: Add Generic Type Parameter to FluentResult

## 1. Core Type Changes

- [ ] 1.1 Add generic type parameter `Rec extends {} = {}` to `FluentResult` class
- [ ] 1.2 Change `example` property type from `PickResult<any>` to `Rec`
- [ ] 1.3 Update `addExample()` method signature to work with generic type

## 2. Method Return Types

- [ ] 2.1 Update `FluentCheck.check()` to return `FluentResult<Rec>`
- [ ] 2.2 Update `FluentCheckAssert.check()` to return `FluentResult<Rec>`
- [ ] 2.3 Update any other methods that return `FluentResult`

## 3. Internal Type Adjustments

- [ ] 3.1 Update `unwrapFluentPick()` to preserve type information
- [ ] 3.2 Ensure `run()` method chain preserves `Rec` type
- [ ] 3.3 Fix any type errors introduced by the changes

## 4. Test Updates

- [ ] 4.1 Remove type assertions from test files that are no longer needed
- [ ] 4.2 Add type-level tests to verify inference works correctly
- [ ] 4.3 Ensure all existing tests pass

## 5. Validation

- [ ] 5.1 Run `npm run lint` and verify zero errors
- [ ] 5.2 Run `npm test` and verify all tests pass
- [ ] 5.3 Run `openspec validate fix-fluentresult-generic-type --strict`
