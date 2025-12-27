# Proposal: Optimize Collection Lengths

**Goal**: Change the default length generation strategy for collection arbitraries (`array`, `string`, `set`, etc.) to "Edge-Biased".

**Context**:
- **Study 15 Finding**: An edge-biased length distribution (favoring min, min+1, small, max-1, max) finds boundary bugs (empty/full collections) ~3.5x faster than uniform distribution.
- **Current State**: Default appears to be uniform or simple random.
- **Solution**: Update `array`, `string`, and other collection arbitraries to use an edge-biased generator for their size/length.

**Scope**:
- Modify `Arbitrary.ts` or specific collection arbitrary implementations (`ArrayArbitrary`, `StringArbitrary`).
- Ensure it respects the `min` and `max` constraints provided by the user.
- Add configuration to override this if "Uniform" is desired (optional, but good practice).
