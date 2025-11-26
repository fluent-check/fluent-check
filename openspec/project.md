# Project Context

## Purpose
FluentCheck is a type-safe, fluent-based property testing framework for TypeScript. It enables developers to write property-based tests that automatically generate test cases and find counterexamples. The framework focuses on:

- **Native TypeScript support** with full type safety and chained type inference
- **Fluent API** for expressive, readable test definitions
- **Smart shrinking** to find minimal failing examples
- **Statistical confidence** calculations for test results
- **Composable arbitraries** for building complex test data generators

## Tech Stack
- **Language**: TypeScript 5.8+ (ES2022 target, NodeNext modules)
- **Runtime**: Node.js (ES modules)
- **Testing**: Mocha + Chai
- **Linting**: ESLint with @typescript-eslint
- **Coverage**: nyc (Istanbul)
- **Build**: tsc (TypeScript compiler)
- **Package Manager**: npm
- **CI/CD**: GitHub Actions

## Project Conventions

### Code Style
- **Indentation**: 2 spaces
- **Quotes**: Single quotes (`'single'`)
- **Semicolons**: None (no trailing semicolons)
- **Max line length**: 120 characters
- **Trailing newlines**: Required at end of file
- **Strict boolean expressions**: Enabled (no implicit coercion)
- **Variable declarations**: `const`/`let` only, no `var`
- **Equality**: Use `===`/`!==` (eqeqeq: smart)
- **Unused variables**: Allowed if prefixed with `_` (e.g., `_unused`)

### Naming Conventions
- **Classes**: PascalCase (e.g., `FluentCheck`, `Arbitrary`)
- **Functions/Methods**: camelCase (e.g., `forall`, `shrink`)
- **Type Parameters**: Single uppercase letters or descriptive PascalCase (e.g., `T`, `Rec`, `ParentRec`)
- **Files**: PascalCase for classes (e.g., `FluentCheck.ts`), lowercase for utilities (e.g., `index.ts`)

### Architecture Patterns

#### Fluent API Pattern
All user-facing APIs use method chaining to build test scenarios:
```typescript
fc.scenario()
  .forall('x', fc.integer())
  .given('double', ({x}) => x * 2)
  .then(({x, double}) => double === x * 2)
  .check()
```

#### Arbitrary Pattern
Data generators (`Arbitrary<T>`) are composable and support:
- `map()` - Transform generated values
- `filter()` - Constrain generated values
- `shrink()` - Find minimal counterexamples
- Corner case prioritization

#### Strategy Pattern
Test execution is controlled by `FluentStrategy` implementations that manage:
- Input generation and iteration
- Shrinking behavior
- Statistical analysis
- Random number generation

#### Type-Safe Chaining
The framework maintains full type inference through method chains using TypeScript's conditional types and mapped types. The `Rec` type parameter accumulates bound variables as tests are composed.

### Testing Strategy
- **Framework**: Mocha with Chai assertions
- **Test location**: `test/` directory with `*.test.ts` naming
- **Coverage tool**: nyc (Istanbul)
- **Timeout**: 4000ms per test
- **Requirements**:
  - All contributions must include tests
  - Cover both success and failure cases
  - Include edge cases and boundary values
  - Tests serve as documentation examples

Run tests:
```bash
npm test           # Run all tests
npm run coverage   # Run with coverage report
npm run lint       # Check code style
```

### Git Workflow
- **Main branch**: `master`
- **PR workflow**: Fork → Branch → PR against master
- **CI checks**: Lint, test, and build on all PRs
- **Automated**: Dependabot for dependency updates

## Domain Context

### Property-Based Testing Concepts
- **Property**: An invariant that should hold for all valid inputs
- **Arbitrary**: A generator that produces random test data of a specific type
- **Shrinking**: The process of reducing a failing input to find the minimal counterexample
- **Quantifiers**: `forall` (universal) and `exists` (existential) for expressing properties
- **Counterexample**: A specific input that violates a property

### Key Abstractions
- **FluentCheck**: Main entry point for building test scenarios
- **Arbitrary<T>**: Base class for all data generators
- **FluentPick<T>**: A generated value with its shrink tree
- **FluentStrategy**: Controls test execution behavior
- **FluentResult**: Captures test outcome with examples/counterexamples

### Built-in Arbitraries
- Primitives: `integer`, `real`, `nat`, `boolean`
- Strings: `string`, `char`, `ascii`, `unicode`, `base64`, `hex`
- Date/Time: `date`, `time`, `datetime`, `duration`
- Patterns: `regex`, `patterns.email`, `patterns.uuid`, `patterns.url`, `patterns.ipv4`
- Containers: `array`, `set`, `tuple`
- Combinators: `oneof`, `union`, `constant`

## Component Guidelines

### Core Files (`src/*.ts`)
- Maintain a clean and consistent API design
- Follow the fluent builder pattern consistently
- Ensure all public functions have appropriate TypeScript type definitions
- Keep complex implementations behind a simple, intuitive interface
- Use descriptive naming that aligns with property-based testing concepts
- Prefer composition over inheritance where possible

### Arbitraries (`src/arbitraries/*.ts`)
- All Arbitrary implementations must extend the base `Arbitrary` class or implement the `Arbitrary` interface
- Handle edge cases appropriately (empty arrays, min/max values, etc.)
- Implement proper shrinking behavior for each Arbitrary
- Maintain consistent statistical distribution characteristics
- Include appropriate type parameters and constraints
- Support method chaining for transformations (`map`, `filter`, etc.)
- Ensure type information flows correctly through all transformations
- Document the behavior of complex arbitraries with examples

### Strategies (`src/strategies/*.ts`)
- Follow the fluent API design pattern consistently
- Ensure all strategies properly compose and can be chained
- Maintain proper type inference through all transformation stages
- Include proper statistical analysis and confidence calculations
- Support customization of test parameters (number of samples, etc.)
- Prioritize edge cases in test case generation
- Make behavior predictable and consistent across runs when using the same seed
- Strategies should be composable with different types of arbitraries

### Tests (`test/*.ts`)
- Test files should demonstrate proper usage of the fluent-check API
- Cover both positive cases and failure cases
- Include tests for edge cases and boundary values
- Use the Chai assertion library consistently
- Maintain the structure of existing tests when adding new ones
- Structure tests to be clear examples of how to use the library
- Include comments explaining the purpose of complex test cases
- Prefer declarative test descriptions that explain what is being tested

### Documentation (`docs/*.md`, `README.md`)
- Documentation should be clear, concise, and provide examples
- Use proper Markdown formatting for code blocks, headings, and lists
- Include TypeScript examples demonstrating recommended usage
- Match documentation style with existing docs
- Explain complex concepts in simple terms with concrete examples
- Keep API documentation up-to-date with implementation
- Include both basic and advanced usage examples
- Documentation should be accessible to developers new to property-based testing

## Important Constraints

### Type Safety Requirements
- Maintain chained type inference through all transformations
- Avoid type assertions (`as`) unless absolutely necessary—especially the `as unknown as T` pattern
- All public APIs must have proper TypeScript interfaces
- No use of `any` in public-facing types (internal use acceptable)
- Use TypeScript's advanced type features when appropriate (conditional types, mapped types, etc.)
- Document complex type operations with comments explaining the intent

### Functional Programming Principles
- Prefer immutable data structures
- Use composition over inheritance
- Keep side effects isolated and explicit

### Performance Considerations
- Arbitraries should be lazy (generate on demand)
- Shrinking should converge efficiently
- Avoid unnecessary allocations in hot paths

## External Dependencies

### Runtime Dependencies
- **typescript**: Core language (also a dev dependency for compilation)

### Development Dependencies
- **mocha**: Test runner
- **chai**: Assertion library
- **eslint**: Code linting
- **@typescript-eslint/***: TypeScript ESLint integration
- **nyc**: Code coverage
- **ts-node**: TypeScript execution for tests
- **jstat**: Statistical functions for confidence calculations

### No External Runtime Dependencies
FluentCheck is designed to have minimal runtime dependencies. The only runtime dependency is TypeScript itself for type definitions. All other dependencies are development-only.
