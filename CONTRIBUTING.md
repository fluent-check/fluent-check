# Contributing to FluentCheck

Thank you for your interest in contributing to FluentCheck! This document provides guidelines and instructions for contributing to this type-safe, fluent-based property testing framework for TypeScript.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Coding Guidelines](#coding-guidelines)
- [Testing Requirements](#testing-requirements)
- [Documentation Guidelines](#documentation-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Community](#community)

## Code of Conduct

This project adheres to a Code of Conduct that expects all participants to be respectful, inclusive, and considerate. We aim to foster an open and welcoming environment for everyone, regardless of background or identity.

Please report any unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Set up the development environment** (see next section)
4. **Create a branch** for your contribution
5. **Make your changes**, following our coding guidelines
6. **Write or update tests** to cover your changes
7. **Submit a pull request** against the main branch

## Development Environment

To set up your development environment:

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/fluent-check.git
cd fluent-check

# Install dependencies
npm install

# Build the project
npm run prepare

# Run tests to verify your setup
npm test
```

## Coding Guidelines

### General Principles

- **Type Safety First**: Maintain strong type safety; this is a type-focused project
- **Fluent API Pattern**: Follow the fluent API design pattern used throughout the codebase
- **Functional Approach**: Prefer immutable data structures and functional programming patterns
- **Descriptive Naming**: Use descriptive variable names that express intent
- **Clean Interfaces**: Keep complex implementations behind simple, intuitive interfaces
- **Composition Over Inheritance**: Prefer composition over inheritance where possible

### TypeScript-Specific Guidelines

- Use TypeScript's advanced type features when appropriate (conditional types, mapped types, etc.)
- Maintain chained type inference capabilities in all code
- Avoid type assertions (especially `as unknown as T`) unless absolutely necessary
- Document complex type operations with comments explaining the intent
- Ensure all public APIs have proper TypeScript interfaces and type definitions

### Component-Specific Guidelines

#### Arbitraries

- All new Arbitrary implementations must extend the base Arbitrary class or implement the Arbitrary interface
- Handle edge cases appropriately (empty arrays, min/max values, etc.)
- Implement proper shrinking behavior
- Maintain consistent statistical distribution characteristics
- Include appropriate type parameters and constraints
- Support method chaining for transformations (map, filter, etc.)
- Document the behavior of complex arbitraries with examples

#### Strategies

- Follow the fluent API design pattern consistently
- Ensure strategies properly compose and can be chained
- Maintain proper type inference through all transformation stages
- Include proper statistical analysis and confidence calculations
- Support customization of test parameters
- Prioritize edge cases in test case generation
- Make behavior predictable and consistent across runs with the same seed

## Testing Requirements

- All code contributions must include tests
- Tests should cover both positive cases and failure cases
- Include tests for edge cases and boundary values
- Follow the existing test patterns in the codebase
- Use the chai assertion library consistently
- Structure tests to be clear examples of how to use the library
- Tests must pass before a PR can be merged

Run tests with:

```bash
npm test
```

For test coverage:

```bash
npm run coverage
```

## Documentation Guidelines

- Keep documentation clear, concise, and provide examples
- Use proper Markdown formatting for code blocks, headings, and lists
- Include TypeScript examples demonstrating recommended usage
- Match documentation style with existing docs
- Explain complex concepts in simple terms with concrete examples
- Keep API documentation up-to-date with implementation
- Include both basic and advanced usage examples
- Ensure documentation is accessible to developers new to property-based testing

## Pull Request Process

1. Ensure your code adheres to the coding guidelines
2. Add or update tests to cover your changes
3. Update documentation as necessary
4. Ensure all tests pass locally
5. Create a pull request with a clear description of the changes
6. Respond to any feedback from code reviews
7. Once approved, your PR will be merged

## Project Structure

The project is organized as follows:

- `src/` - Source code
  - `arbitraries/` - Implementations of data generators
  - `strategies/` - Test execution strategies
- `test/` - Test files
- `docs/` - Documentation

Key concepts:

- **Arbitraries**: Data generators that handle shrinking to find minimal counterexamples
- **Strategies**: Control how tests are executed, validated, and reported
- **FluentCheck API**: The main user-facing interface for defining property-based tests

## Community

- Submit issues for bugs or feature requests
- Join discussions on existing issues
- Help answer questions from other users
- Contribute documentation improvements

---

Thank you for contributing to FluentCheck! Your efforts help make this library better for everyone. 