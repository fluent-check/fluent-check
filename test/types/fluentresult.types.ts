/**
 * Type-level tests for FluentResult<Rec> generic type parameter.
 *
 * These tests verify that result.example preserves type information
 * after calling .check().
 *
 * Run with: npm run test:types
 *
 * If any type assertion fails, TypeScript will produce a compile error.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {FluentCheck, type FluentResult} from '../../src/FluentCheck.js'
import * as fc from '../../src/arbitraries/index.js'
import {type Expect, type Equal} from './test-utils.types.js'

// ============================================================================
// Test: FluentResult generic type parameter
// ============================================================================

// FluentResult with default type parameter should have example typed as {}
type _T1 = Expect<Equal<FluentResult['example'], {}>>

// FluentResult with specific type should have example typed correctly
type _T2 = Expect<Equal<FluentResult<{email: string}>['example'], {email: string}>>

// ============================================================================
// Test: forall + check preserves type in result.example
// ============================================================================

const forallResult = new FluentCheck()
  .forall('email', fc.string())
  .then(({email}) => email.includes('@'))
  .check()

type ForallResultType = typeof forallResult
type _T3 = Expect<Equal<ForallResultType, FluentResult<{email: string}>>>
type _T4 = Expect<Equal<typeof forallResult.example.email, string>>

// ============================================================================
// Test: exists + check preserves type in result.example
// ============================================================================

const existsResult = new FluentCheck()
  .exists('n', fc.integer(0, 100))
  .then(({n}) => n % 7 === 0)
  .check()

type ExistsResultType = typeof existsResult
type _T5 = Expect<Equal<ExistsResultType, FluentResult<{n: number}>>>
type _T6 = Expect<Equal<typeof existsResult.example.n, number>>

// ============================================================================
// Test: multiple forall + check preserves all types
// ============================================================================

const multiForallResult = new FluentCheck()
  .forall('a', fc.integer(-10, 10))
  .forall('b', fc.string())
  .then(({a, b}) => a.toString() === b || true)
  .check()

type MultiForallResultType = typeof multiForallResult
type _T7 = Expect<Equal<MultiForallResultType, FluentResult<{a: number} & {b: string}>>>
type _T8 = Expect<Equal<typeof multiForallResult.example.a, number>>
type _T9 = Expect<Equal<typeof multiForallResult.example.b, string>>

// ============================================================================
// Test: given + forall + check preserves all types
// ============================================================================

const givenForallResult = new FluentCheck()
  .given('multiplier', () => 2)
  .forall('n', fc.integer(0, 10))
  .then(({multiplier, n}) => n * multiplier >= 0)
  .check()

type GivenForallResultType = typeof givenForallResult
type _T10 = Expect<Equal<typeof givenForallResult.example.multiplier, number>>
type _T11 = Expect<Equal<typeof givenForallResult.example.n, number>>

// ============================================================================
// Test: complex scenario preserves types
// ============================================================================

const complexResult = new FluentCheck()
  .forall('str', fc.string(1, 10))
  .given('len', ({str}) => str.length)
  .forall('idx', fc.integer(0, 100))
  .then(({str, len, idx}) => idx < len ? str[idx] !== undefined : true)
  .check()

type _T12 = Expect<Equal<typeof complexResult.example.str, string>>
type _T13 = Expect<Equal<typeof complexResult.example.len, number>>
type _T14 = Expect<Equal<typeof complexResult.example.idx, number>>

// ============================================================================
// Test: result.example can be destructured with correct types
// ============================================================================

const {example} = new FluentCheck()
  .forall('value', fc.boolean())
  .then(({value}) => value === true || value === false)
  .check()

type _T15 = Expect<Equal<typeof example.value, boolean>>

// ============================================================================
// Test: array arbitrary preserves element type
// ============================================================================

const arrayResult = new FluentCheck()
  .forall('arr', fc.array(fc.integer(0, 10), 0, 5))
  .then(({arr}) => arr.every(n => n >= 0))
  .check()

type _T16 = Expect<Equal<typeof arrayResult.example.arr, number[]>>
