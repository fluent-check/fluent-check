# Fluent Check

Amazing description goes here... eventually.

## TODO List

Our currently todo list, prioritized by ICSE-readiness.

### Self-Test related Stuff
- [ ] Better separate tests into categories
- [ ] Improve the meta-PBT (i.e. some tests are not using PBT to test the framework)

### Estimations related Stuff
- [ ] Provide size estimations in arbitraries
  - [ ] Mapped Arbitraries
  - [x] Filtered Arbitraries
  - [ ] Unique Arbitraries
    - [ ] Mathematical treatment of Unique Arbitrary vs sampling without replacement 
  - [ ] Primitive Arbitraries
    - [x] Integer
    - [ ] Real
    - [x] Boolean
    - [x] String
    - [ ] Collection
    - [ ] Composite

### Arbitrary related stuff
- [ ] Primitive Arbitraries
    - [x] Integers
    - [x] Reals
    - [x] Strings
    - [x] Booleans       
- [ ] Composite Arbitraries
    - [ ] Unions
    - [ ] Arrays
    - [ ] Sets
- [ ] Fix Shrink
  - [ ] Collection
  - [ ] Composite
  - [ ] String
- [X] Unify arbitraries by deriving them
    - [X] Derive booleans from Integers
    - [X] Derive strings from Array of Integers
- [x] Corner cases
  - [ ] Are these _hints_? 
  - [ ] Provide API to receive custom corner cases
- [ ] Transformed Arbitraries
  - [x] Uniques
    - [ ] Optimise unique to use a decent underlying deduplicator 
    - [ ] Mathematical treatment of unique vs sampling without replacement
- [ ] Chains
- [ ] Exhaustive generation
- [ ] Lazy sampling (might be useful for existentials)
- [ ] Support more out-of-the-box arbitraries:
  - [ ] Dictionary
  - [ ] Tuples

### Checker related stuff
- [ ] Configurable runnables (exhaustive, numRuns, etc..)
- [ ] Estimate the confidence of the check
- [ ] Custom reporters

### Interoperability stuff
- [x] Support mocha

### Typescript related stuff
- [ ] Stronger Typing

### Feature parity stuff
- [ ] Become feature-par with fast-check
- [ ] Become feature-par with quick-check
- [ ] Become feature-par with scala-check
- [ ] Become feature-par with small-check
- [ ] Explore Alloy and become feature-par in terms of MBT

### NIER
- [ ] Unify mutation testing and APR
  - [ ] Support mutation testing as a variant
  - [ ] Support APR as a variant
- [ ] Treat check as an optimisation/search strategy, so we can:
  - [x] Currently we are checking for satisfiability
  - [ ] Support optimisation/search hints
  - [ ] Support other evaluation functions
    - [ ] Continous evaluation (fitness?)
