## 1. Proposal
- [x] 1.1 Create GitHub issue from `proposal.md` and update header link
- [x] 1.2 Validate change metadata with `openspec validate update-fluentresult-outcomes --strict`

## 2. Specification
- [x] 2.1 Add reporting spec deltas for FluentResult completion/outcome metadata and reporter/expect semantics on exhaustion
- [x] 2.2 Add fluent-api spec deltas for `.check()` exhaustion handling and FluentResult assertion behaviors

## 3. Implementation
- [ ] 3.1 Extend `FluentResult` with completion metadata (complete vs exhausted, reason, tests run, skipped)
- [ ] 3.2 Map explorer outcomes to new result states in `FluentCheck` (forall vs exists vs counterexample)
- [ ] 3.3 Update `expect`/`FluentReporter` and FluentResult assertions to surface incomplete/exhausted runs appropriately
- [ ] 3.4 Add tests covering budget exhaustion for universal and existential scenarios, assertion/reporting messages, and backward compatibility

## 4. Validation
- [ ] 4.1 Re-run `openspec validate update-fluentresult-outcomes --strict`
- [ ] 4.2 Run `npm test`
