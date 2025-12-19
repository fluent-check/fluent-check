# Stateful Testing (Model-Based Testing)

FluentCheck provides a powerful API for testing stateful systems using model-based testing. This approach allows you to test implementations against a simplified model, automatically generating random sequences of operations and finding minimal failing examples.

## Overview

Model-based testing (also called stateful testing) works by:

1. **Defining a model**: A simplified representation of expected behavior
2. **Defining commands**: Operations that can be performed on both model and system
3. **Generating sequences**: Random sequences of valid operations
4. **Checking invariants**: Properties that should hold after every operation
5. **Shrinking**: Automatically finding minimal failing sequences

## Basic Usage

```typescript
import * as fc from 'fluent-check';

// Define the system under test
class Counter {
  private count = 0;
  increment(): void { this.count++; }
  decrement(): void { this.count--; }
  value(): number { return this.count; }
}

// Test with stateful testing
const result = fc.stateful<{ count: number }, Counter>()
  .model(() => ({ count: 0 }))                    // Model factory
  .sut(() => new Counter())                        // System-under-test factory
  
  .command('increment')
    .run((_args, model, sut) => {
      model.count++;
      sut.increment();
    })
  
  .command('decrement')
    .pre(model => model.count > 0)                 // Precondition
    .run((_args, model, sut) => {
      model.count--;
      sut.decrement();
    })
  
  .invariant((model, sut) => sut.value() === model.count)  // System invariant
  .check({ numRuns: 100, maxCommands: 50 });

if (!result.success) {
  console.log('Bug found!', result.error);
  console.log('Shrunk sequence:', result.shrunkSequence);
}
```

## API Reference

### `fc.stateful<M, S>()`

Creates a new stateful test builder where:
- `M` - The model type (simplified representation)
- `S` - The system-under-test type (actual implementation)

### `.model(factory)`

Set the model factory function. Called at the start of each test run to create a fresh model.

```typescript
.model(() => ({ elements: [] }))
```

### `.sut(factory)`

Set the system-under-test factory function. Called at the start of each test run to create a fresh SUT.

```typescript
.sut(() => new Stack<number>())
```

### `.command(name)`

Begin defining a new command. Returns a command builder with the following methods:

#### `.forall(name, arbitrary)`

Add a randomly generated argument to the command.

```typescript
.command('push')
  .forall('value', fc.integer())
  .run(({ value }, model, sut) => {
    model.elements.push(value);
    sut.push(value);
  })
```

#### `.pre(predicate)`

Set a precondition. The command will only be selected when the predicate returns true for the current model state.

```typescript
.command('pop')
  .pre(model => model.elements.length > 0)
  .run(...)
```

#### `.run(fn)`

Set the execution logic. The function receives:
- `args` - Object with generated argument values (empty `{}` if no forall)
- `model` - The current model state
- `sut` - The system under test

```typescript
.run(({ value }, model, sut) => {
  model.elements.push(value);
  sut.push(value);
})
```

#### `.post(predicate)`

Set a postcondition checked after the command executes. Receives:
- `args` - The generated arguments
- `model` - Model after execution
- `sut` - SUT after execution
- `result` - Return value from `run()`

```typescript
.command('peek')
  .pre(model => model.elements.length > 0)
  .run((_args, model, sut) => ({
    expected: model.elements[model.elements.length - 1],
    actual: sut.peek()
  }))
  .post((_args, _model, _sut, result) => {
    const r = result as { expected: number; actual: number | undefined };
    return r.expected === r.actual;
  })
```

### `.invariant(predicate)`

Add a system-wide invariant that is checked after every command execution.

```typescript
.invariant((model, sut) => sut.size() === model.elements.length)
```

Multiple invariants can be added by calling `.invariant()` multiple times.

### `.check(config)`

Run the stateful tests with optional configuration:

```typescript
.check({
  numRuns: 100,      // Number of test runs (default: 100)
  maxCommands: 50,   // Maximum commands per sequence (default: 50)
  seed: 12345,       // Random seed for reproducibility
  verbose: true      // Enable verbose logging
})
```

Returns a `StatefulResult<M, S>` with:
- `success` - Whether all tests passed
- `numRuns` - Number of tests executed
- `failingSequence` - The original failing command sequence (if failed)
- `shrunkSequence` - Minimal failing sequence (if failed)
- `error` - Error message (if failed)
- `seed` - Random seed used

## Complete Example: Stack

```typescript
import * as fc from 'fluent-check';

class Stack<T> {
  private elements: T[] = [];
  
  push(value: T): void { this.elements.push(value); }
  pop(): T | undefined { return this.elements.pop(); }
  peek(): T | undefined { return this.elements[this.elements.length - 1]; }
  size(): number { return this.elements.length; }
  isEmpty(): boolean { return this.elements.length === 0; }
  clear(): void { this.elements = []; }
}

interface StackModel {
  elements: number[];
}

const result = fc.stateful<StackModel, Stack<number>>()
  .model(() => ({ elements: [] }))
  .sut(() => new Stack<number>())

  .command('push')
    .forall('value', fc.integer(-100, 100))
    .run(({ value }, model, sut) => {
      model.elements.push(value);
      sut.push(value);
    })

  .command('pop')
    .pre(model => model.elements.length > 0)
    .run((_args, model, sut) => {
      const expected = model.elements.pop();
      const actual = sut.pop();
      if (expected !== actual) {
        throw new Error(`Pop mismatch: expected ${expected}, got ${actual}`);
      }
    })

  .command('peek')
    .pre(model => model.elements.length > 0)
    .run((_args, model, sut) => {
      const expected = model.elements[model.elements.length - 1];
      const actual = sut.peek();
      return { expected, actual };
    })
    .post((_args, _model, _sut, result) => {
      const r = result as { expected: number; actual: number | undefined };
      return r.expected === r.actual;
    })

  .command('clear')
    .run((_args, model, sut) => {
      model.elements = [];
      sut.clear();
    })

  .invariant((model, sut) => sut.size() === model.elements.length)
  .invariant((model, sut) => sut.isEmpty() === (model.elements.length === 0))
  
  .check({ numRuns: 100, maxCommands: 50 });

console.log(result.success ? 'All tests passed!' : `Failed: ${result.error}`);
```

## Shrinking

When a failing sequence is found, FluentCheck automatically shrinks it to find a minimal reproduction:

1. **Binary search on length**: Find the shortest failing prefix
2. **Command removal**: Try removing individual commands while maintaining failure

The shrunk sequence is available in `result.shrunkSequence`.

## Best Practices

1. **Keep models simple**: Models should be easier to understand than the SUT
2. **Use preconditions**: Prevent invalid operation sequences
3. **Check invariants**: Properties that should always hold
4. **Start small**: Begin with a few commands and add more as confidence grows
5. **Use meaningful names**: Command names appear in failure reports

## Finding Bugs

Stateful testing excels at finding:

- Race conditions and state corruption
- Off-by-one errors in data structure implementations
- Missing edge case handling
- State that isn't properly reset
- Memory leaks (if tracked in model)

Example of a buggy implementation being caught:

```typescript
// Buggy Counter: forgets to reset internal counter on clear
class BuggyCounter {
  private count = 0;
  private totalOps = 0;  // Tracks total operations
  
  increment(): void { this.count++; this.totalOps++; }
  decrement(): void { this.count--; this.totalOps++; }
  value(): number { return this.totalOps; }  // Bug: returns wrong value
  clear(): void { this.count = 0; }  // Bug: doesn't reset totalOps
}

// The stateful test will find this bug
const result = fc.stateful<{ count: number }, BuggyCounter>()
  .model(() => ({ count: 0 }))
  .sut(() => new BuggyCounter())
  .command('increment').run((_args, m, s) => { m.count++; s.increment(); })
  .invariant((m, s) => s.value() === m.count)  // Will fail!
  .check();
```

## See Also

- [Composable Arbitraries](composable-arbitraries.md) - For generating complex command arguments
- [Smart Shrinking](smart-shrinking.md) - How shrinking works
- [Customizable Strategies](customizable-strategies.md) - Advanced test configuration
