import { scenario, integer, strategy } from './src/index.js'

console.log('Testing shrinking strategies...\n')

// Test 1: Sequential Exhaustive with abc order
const result1 = scenario()
  .config(strategy()
    .withShrinking(500)
    .withShrinkingStrategy('sequential-exhaustive'))
  .forall('a', integer(0, 100))
  .forall('b', integer(0, 100))
  .forall('c', integer(0, 100))
  .then(({a, b, c}) => a + b + c <= 150)
  .check({ seed: 12345 })

console.log('Sequential Exhaustive (abc):', result1.example)

// Test 2: Round-Robin with abc order
const result2 = scenario()
  .config(strategy()
    .withShrinking(500)
    .withShrinkingStrategy('round-robin'))
  .forall('a', integer(0, 100))
  .forall('b', integer(0, 100))
  .forall('c', integer(0, 100))
  .then(({a, b, c}) => a + b + c <= 150)
  .check({ seed: 12345 })

console.log('Round-Robin (abc):', result2.example)

// Test 3: Sequential with bac order
const result3 = scenario()
  .config(strategy()
    .withShrinking(500)
    .withShrinkingStrategy('sequential-exhaustive'))
  .forall('b', integer(0, 100))
  .forall('a', integer(0, 100))
  .forall('c', integer(0, 100))
  .then(({a, b, c}) => a + b + c <= 150)
  .check({ seed: 12345 })

console.log('Sequential Exhaustive (bac):', result3.example)

// Test 4: Round-Robin with bac order
const result4 = scenario()
  .config(strategy()
    .withShrinking(500)
    .withShrinkingStrategy('round-robin'))
  .forall('b', integer(0, 100))
  .forall('a', integer(0, 100))
  .forall('c', integer(0, 100))
  .then(({a, b, c}) => a + b + c <= 150)
  .check({ seed: 12345 })

console.log('Round-Robin (bac):', result4.example)
