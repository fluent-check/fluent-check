# Given-When-Then Pattern Support

FluentCheck implements the Given-When-Then pattern, a behavior-driven development approach that makes tests more expressive and closely aligned with business requirements.

## Design Philosophy

The Given-When-Then pattern structures tests into three distinct phases:

1. **Given**: Set up the test context or preconditions (using `.given()`)
2. **When**: Execute actions or operations (using `.when()`)
3. **Then**: Verify expected outcomes or assertions (using `.then()` and `.and()`)

This pattern improves test readability and organization, especially for complex scenarios. FluentCheck integrates this pattern directly into its fluent API:

```typescript
fc.scenario()
  .forall('x', fc.integer(1, 100))
  .forall('y', fc.integer(1, 100))
  .given('sum', ({x, y}) => x + y)            // Compute derived values
  .when(({x, y, sum}) => {                    // Perform side effects
    console.log(`Testing with x=${x}, y=${y}, sum=${sum}`);
  })
  .then(({sum}) => sum > 0)                   // Assert properties
  .and(({x, y, sum}) => sum === x + y)        // Chain multiple assertions
  .check()
```

## Implementation Details

The implementation uses specialized classes to handle each phase of the pattern:

```typescript
// Given phase - adds computed values to context
abstract class FluentCheckGiven<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  and<NK extends string, V>(name: NK, f: ((args: Rec) => V) | V) {
    return super.given(name, f)
  }
}

// Two implementations: mutable (function) and constant (value)
class FluentCheckGivenMutable<K extends string, V, ...> extends FluentCheckGiven<K, V, ...> {
  constructor(parent, name, factory: (args: ParentRec) => V, strategy) { ... }
}

class FluentCheckGivenConstant<K extends string, V, ...> extends FluentCheckGiven<K, V, ...> {
  constructor(parent, name, value: V, strategy) { ... }
}

// When phase - executes side effects
class FluentCheckWhen<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(parent, f: (givens: Rec) => void, strategy) { ... }
  and(f: (givens: Rec) => void) { return this.when(f) }
}

// Then phase - property assertions
class FluentCheckAssert<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(parent, assertion: (args: Rec) => boolean, strategy) { ... }
  and(assertion: (args: Rec) => boolean) { return this.then(assertion) }
}
```

The `given` method accepts both computed values (functions) and constants:

```typescript
given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec> {
  return v instanceof Function ?
    new FluentCheckGivenMutable(this, name, v, this.strategy) :
    new FluentCheckGivenConstant<K, V, Rec & Record<K, V>, Rec>(this, name, v, this.strategy)
}
```

## Practical Applications

The Given-When-Then pattern is particularly useful for testing:

1. **Business rules**: Aligning with acceptance criteria and requirements
2. **State mutations**: Tracking complex changes to system state
3. **Side effects**: Documenting and verifying expected side effects
4. **Integration tests**: Testing interactions between components

## Advanced Usage

FluentCheck's implementation allows for chaining multiple givens, whens, and assertions:

```typescript
fc.scenario()
  .forall('username', fc.string(5, 20))
  .forall('password', fc.string(8, 30))
  .given('user', ({username, password}) => ({ username, password }))
  .given('hashedPassword', ({password}) => hashPassword(password))
  .when(({user, hashedPassword}) => {
    user.password = hashedPassword;
    saveUserToDatabase(user);
  })
  .then(({username}) => userExistsInDatabase(username))
  .and(({username, password}) => canLoginWithCredentials(username, password))
  .check()
```

## Comparison with Other Frameworks

While other testing frameworks might support a form of Given-When-Then through custom test structures, FluentCheck integrates this pattern natively into its API. This integration ensures that the pattern is type-safe and maintains the context through the entire test chain, which is particularly valuable for complex test scenarios. 