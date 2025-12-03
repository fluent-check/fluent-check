/**
 * Assertion helpers for runtime validation with type narrowing.
 *
 * These functions are intended for use in places where runtime checks are
 * unavoidable (e.g., user input, dynamic configuration, array bounds) but we
 * still want the TypeScript type system to understand the validated state.
 */

/**
 * Asserts that a value is defined (not `undefined`).
 *
 * Prefer this over manual `if (x === undefined)` checks when the intent is to
 * enforce a precondition and fail fast with a clear error message.
 */
export function assertDefined<T>(value: T | undefined, message = 'Expected value to be defined'):
asserts value is T {
  if (value === undefined) {
    throw new Error(message)
  }
}

/**
 * Asserts that an index is within the bounds of a collection of given length.
 *
 * This is primarily a documentation and intent helper: it clearly communicates
 * that the index must be valid before performing indexed access. Use together
 * with TypeScript 5.5 control-flow narrowing and non-null assertions when the
 * compiler cannot infer the narrowed type.
 */
export function assertInBounds(index: number, length: number, message?: string) {
  if (!Number.isInteger(index)) {
    throw new Error(message ?? `Index ${index} is not an integer`)
  }
  if (index < 0 || index >= length) {
    throw new Error(message ?? `Index ${index} out of bounds for length ${length}`)
  }
}

/**
 * Asserts that a record/schema has all required keys defined (non-undefined).
 *
 * This is a generic helper for "known structures" patterns where the codebase
 * controls the structure and validates it once at construction or
 * initialization time. After this assertion, the type of `schema` is narrowed
 * so that all properties are required and non-nullable.
 */
export function assertSchemaValid<T extends Record<string, unknown>>(
  schema: T,
  keys?: readonly (keyof T)[]
): asserts schema is { [K in keyof T]-?: NonNullable<T[K]> } {
  const requiredKeys = (keys ?? Object.keys(schema)) as (keyof T)[]
  for (const key of requiredKeys) {
    if (schema[key] === undefined) {
      throw new Error(`Schema missing required key: ${String(key)}`)
    }
  }
}

