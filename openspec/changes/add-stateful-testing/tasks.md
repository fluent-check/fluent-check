# Tasks: Add Stateful Model-Based Testing

## 1. FSM Refactor

- [x] 1.1 Refactor `ArbitraryFSM` to delegate graph generation to `ArbitraryGraph`
- [x] 1.2 Keep FSM-specific logic (initial state, accepting states selection)
- [x] 1.3 Preserve utility functions (`isDeadlockFree`, `hasLiveness`, `simulate`, etc.)
- [x] 1.4 Ensure all existing FSM tests pass

## 2. Type Definitions

- [x] 2.1 Create `src/stateful/types.ts` with core interfaces
- [x] 2.2 Define `Command<M, S, Args>` interface
- [x] 2.3 Define `StatefulConfig<M, S>` interface
- [x] 2.4 Define `CommandResult` and execution types

## 3. StatefulBuilder API

- [x] 3.1 Create `src/stateful/StatefulBuilder.ts`
- [x] 3.2 Implement `.model()` method for model factory
- [x] 3.3 Implement `.sut()` method for system-under-test factory
- [x] 3.4 Implement `.command()` fluent sub-builder
- [x] 3.5 Implement `.forall()` for command arguments
- [x] 3.6 Implement `.pre()` for preconditions
- [x] 3.7 Implement `.run()` for command execution
- [x] 3.8 Implement `.post()` for postconditions
- [x] 3.9 Implement `.invariant()` for system invariants

## 4. Command Sequence Generation

- [x] 4.1 Create `src/stateful/CommandSequence.ts` (integrated into StatefulBuilder.ts)
- [x] 4.2 Implement precondition-aware command selection
- [x] 4.3 Generate random argument values per command
- [x] 4.4 Create sequence arbitrary for length variation

## 5. Execution Engine

- [x] 5.1 Implement sequence runner with model/SUT synchronization
- [x] 5.2 Run invariants after each command
- [x] 5.3 Capture command results for postcondition checking
- [x] 5.4 Report failures with full command history

## 6. Shrinking

- [x] 6.1 Implement sequence length shrinking (binary search)
- [x] 6.2 Implement individual command removal
- [ ] 6.3 Implement command argument shrinking (future enhancement)
- [x] 6.4 Preserve precondition validity during shrinking

## 7. Integration

- [x] 7.1 Create `fc.stateful()` factory function
- [x] 7.2 Export from `src/index.ts`
- [x] 7.3 Implement `.check()` integration with existing check infrastructure

## 8. Tests

- [x] 8.1 Create `test/stateful/Counter.test.ts` - simple counter example
- [x] 8.2 Create `test/stateful/Stack.test.ts` - stack with push/pop/peek
- [x] 8.3 Test shrinking produces minimal failing sequences
- [x] 8.4 Test precondition filtering
- [x] 8.5 Test invariant checking
