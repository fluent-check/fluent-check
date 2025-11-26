# Change: Research Fluent API Ergonomics Enhancements

> **GitHub Issue:** [#387](https://github.com/fluent-check/fluent-check/issues/387)

## Why

The fluent API is FluentCheck's defining feature, enabling expressive property-based tests through method chaining with full type safety. While the current API works well for basic scenarios, there are opportunities to improve developer experience through better ergonomics, reduced verbosity, and enhanced discoverability.

This research change explores systematic improvements to the fluent API without compromising type safety or breaking existing code. The goal is to identify concrete enhancements that make common testing patterns more intuitive and reduce friction in property test authoring.

## What Changes

This research initiative will investigate and document potential ergonomics improvements across several areas:

### 1. API Discoverability & Intuitiveness
- Survey common usage patterns in existing tests to identify friction points
- Investigate alternative naming conventions for better method discoverability
- Explore IDE autocomplete optimization through better type hints
- Research common property testing patterns from other frameworks (QuickCheck, Hypothesis, fast-check) for inspiration

### 2. Verbosity Reduction
- Analyze opportunities to reduce boilerplate in common scenarios
- Research shorthand methods for frequently-used patterns
- Investigate better defaults that require fewer configuration calls
- Explore fluent API sugar for common test structures

### 3. Error Messages & Developer Feedback
- Evaluate current TypeScript error messages in complex chains
- Research techniques to improve compile-time error clarity
- Investigate runtime error messages for better debugging
- Explore validation and early failure detection

### 4. Composability & Reusability
- Research patterns for reusable property definitions
- Investigate scenario composition and extension mechanisms
- Explore ways to share common test setups
- Study property combinator patterns

### 5. Advanced Chaining Patterns
- Investigate conditional assertions and branching in chains
- Research nested quantifier ergonomics (`forall` within `forall`)
- Explore better integration between `given`, `when`, `then` clauses
- Study alternatives to current accumulator pattern

### 6. Type System Enhancements
- Research improved type inference for complex scenarios
- Investigate better handling of optional/nullable values in chains
- Explore discriminated union support in property tests
- Study integration with modern TypeScript features (template literals, const generics)

## Impact

- Affected specs: `fluent-api`, potentially `strategies`, `arbitraries`
- Affected code: Research phase - no immediate code changes
- Breaking: None (research only; implementations will be separate proposals)
- Deliverables:
  - Research findings document with concrete recommendations
  - Example code demonstrating proposed improvements
  - Prioritized list of enhancement proposals
  - Prototype implementations (optional) for validation

## Research Methodology

1. **Internal Analysis**: Review existing codebase and test suite for patterns
2. **Comparative Study**: Analyze ergonomics in similar frameworks
3. **User Perspective**: Consider developer experience from multiple skill levels
4. **Prototype Validation**: Create proof-of-concept implementations where needed
5. **Documentation**: Produce comprehensive findings with actionable recommendations

## Success Criteria

Research is complete when:
- All investigation areas have documented findings
- At least 5 concrete enhancement proposals are identified and prioritized
- Each proposal includes example usage, benefits, and implementation complexity
- Trade-offs and potential breaking changes are clearly documented
- Follow-up change proposals are ready to be created for top priorities

## Next Steps

After research completion:
1. Create individual OpenSpec change proposals for each recommended enhancement
2. Prioritize implementations based on impact vs. complexity
3. Gather community feedback on proposed changes
4. Begin implementation of high-priority, low-risk improvements
