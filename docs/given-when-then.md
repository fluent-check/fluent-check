# Given-When-Then Pattern Support

FluentCheck implements the Given-When-Then pattern, a behavior-driven development approach that makes tests more expressive and closely aligned with business requirements.

## Design Philosophy

The Given-When-Then pattern structures tests into three distinct phases:

1. **Given**: Set up the test context or preconditions
2. **When**: Execute the action or operation being tested
3. **Then**: Verify expected outcomes or assertions

This pattern improves test readability and organization, especially for complex scenarios. FluentCheck integrates this pattern directly into its fluent API, making it natural to express test setup, actions, and expectations.

```typescript
fc.scenario()
  .forall('x', fc.integer(1, 100))
  .forall('y', fc.integer(1, 100))
  .given('sum', ({x, y}) => x + y)            // Compute preconditions
  .when(({x, y, sum}) => {                    // Perform actions
    console.log(`Testing with x=${x}, y=${y}`);
    // Side effects or system state changes happen here
  })
  .then(({sum}) => sum > 0)                   // Assert properties
  .check()
```

## Implementation Details

The implementation uses specialized classes to handle each phase of the pattern:

```typescript
class FluentCheckGiven<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  // ...
  and<NK extends string, V>(name: NK, f: ((args: Rec) => V) | V) {
    return super.given(name, f)
  }
}

class FluentCheckWhen<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  // ...
  and(f: (givens: Rec) => void) { return this.when(f) }
}

class FluentCheckAssert<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  // ...
  and(assertion: (args: Rec) => boolean) {
    return this.then(assertion)
  }
  // ...
}
```

The `given` method can handle both computed values (functions) and constants:

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