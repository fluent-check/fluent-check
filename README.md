# Fluent Check

A type-safe fluent-based fast-check wrapper.

```typescript
export class Stack<T> {
    elements: Array<T> = []

    push = (e: T) => { this.elements.push(e) }
    pop = () => { return this.elements.pop() }
    size = () => { return this.elements.length }
}

/*
  Scenario: An empty stack becomes nonempty when we insert any number of elements
    Given an empty stack
    When we push an array of elements
    Then the stack is not empty
*/

new FluentCheck(() => new Stack())
  .arbitrary('elements', fc.array(fc.nat(), 1, 100))
  .property((s, as) => s.push(as.elements))
  .assert((s, _) => expect(s.size()).gt(0))
```