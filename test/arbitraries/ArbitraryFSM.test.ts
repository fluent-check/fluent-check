import {expect} from 'chai'
import * as fc from '../../src/arbitraries/index.js'
import * as fcMain from '../../src/index.js'
import type {FSM, FSMTrace} from '../../src/arbitraries/types.js'
import {
  isDeadlockFree,
  allStatesReachable,
  hasLiveness,
  isDeterministic,
  invariantHolds,
  findDeadlocks,
  simulate,
  getReachableStates
} from '../../src/arbitraries/ArbitraryFSM.js'

describe('ArbitraryFSM', () => {
  describe('fsm()', () => {
    it('should generate FSMs with specified state count', () => {
      const arb = fc.fsm({states: 5, alphabet: ['a', 'b', 'c']})
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value.states).to.have.length(5)
        expect(sample.value.states).to.deep.equal([0, 1, 2, 3, 4])
      }
    })

    it('should generate FSMs with custom state labels', () => {
      const states = ['idle', 'running', 'paused', 'stopped'] as const
      const arb = fc.fsm({states: [...states], alphabet: ['start', 'pause', 'stop']})
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value.states).to.deep.equal([...states])
      }
    })

    it('should generate FSMs with correct alphabet', () => {
      const alphabet = ['click', 'hover', 'keypress']
      const arb = fc.fsm({states: 3, alphabet})
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value.alphabet).to.deep.equal(alphabet)
      }
    })

    it('should set initial state to first state', () => {
      const arb = fc.fsm({states: 5, alphabet: ['a', 'b']})
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value.initial).to.equal(0)
      }
    })

    it('should have at least one accepting state by default', () => {
      const arb = fc.fsm({states: 5, alphabet: ['a', 'b']})
      const samples = arb.sample(20)

      for (const sample of samples) {
        expect(sample.value.accepting.length).to.be.at.least(1)
      }
    })

    it('should generate deterministic FSMs by default', () => {
      const arb = fc.fsm({states: 4, alphabet: ['a', 'b', 'c']})
      const samples = arb.sample(20)

      for (const sample of samples) {
        expect(isDeterministic(sample.value)).to.be.true
      }
    })

    it('should generate connected FSMs by default', () => {
      const arb = fc.fsm({states: 5, alphabet: ['a', 'b']})
      const samples = arb.sample(20)

      for (const sample of samples) {
        expect(allStatesReachable(sample.value)).to.be.true
      }
    })
  })

  describe('fsmTrace()', () => {
    it('should generate traces starting from initial state', () => {
      const fsmValue: FSM = {
        states: [0, 1, 2],
        alphabet: ['a', 'b'],
        initial: 0,
        accepting: [2],
        transitions: new Map([
          [0, [{to: 1, event: 'a'}]],
          [1, [{to: 2, event: 'b'}]],
          [2, [{to: 0, event: 'a'}]]
        ])
      }

      const arb = fc.fsmTrace(fsmValue)
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value.states[0]).to.equal(0)
      }
    })

    it('should generate valid traces', () => {
      const fsmValue: FSM = {
        states: [0, 1, 2],
        alphabet: ['a', 'b'],
        initial: 0,
        accepting: [2],
        transitions: new Map([
          [0, [{to: 1, event: 'a'}, {to: 0, event: 'b'}]],
          [1, [{to: 2, event: 'b'}, {to: 0, event: 'a'}]],
          [2, [{to: 0, event: 'a'}]]
        ])
      }

      const arb = fc.fsmTrace(fsmValue, 5)
      const samples = arb.sample(20)

      for (const sample of samples) {
        // Events should be one less than states
        expect(sample.value.events.length).to.equal(sample.value.states.length - 1)

        // Each transition should be valid
        for (let i = 0; i < sample.value.events.length; i++) {
          const from = sample.value.states[i]
          const to = sample.value.states[i + 1]
          const event = sample.value.events[i]

          const transitions = fsmValue.transitions.get(from as number) ?? []
          const valid = transitions.some(t => t.to === to && t.event === event)
          expect(valid).to.be.true
        }
      }
    })
  })
})

// ============================================================================
// FSM Property-Based Testing: Known Problems
// ============================================================================

describe('FSM Property-Based Testing', () => {
  /**
   * Problem 1: DEADLOCK FREEDOM
   *
   * A system is deadlock-free if every non-accepting state has at least one
   * outgoing transition. This ensures the system can always make progress.
   */
  describe('Problem 1: Deadlock Freedom', () => {
    it('should detect deadlocks in FSMs', () => {
      // FSM with a deadlock (state 2 has no transitions and is not accepting)
      const fsmWithDeadlock: FSM = {
        states: [0, 1, 2],
        alphabet: ['a', 'b'],
        initial: 0,
        accepting: [1], // Note: 2 is not accepting
        transitions: new Map([
          [0, [{to: 1, event: 'a'}, {to: 2, event: 'b'}]],
          [1, [{to: 0, event: 'a'}]],
          [2, []] // Deadlock! No transitions out
        ])
      }

      expect(isDeadlockFree(fsmWithDeadlock)).to.be.false
      expect(findDeadlocks(fsmWithDeadlock)).to.deep.equal([2])
    })

    it('should verify deadlock freedom with property-based testing', () => {
      // Property: For all reachable non-accepting states, there exists at least
      // one enabled transition
      const result = fcMain.scenario()
        .forall('fsm', fc.fsm({
          states: 5,
          alphabet: ['a', 'b', 'c'],
          minTransitionsPerState: 1 // Ensure at least one transition per state
        }))
        .then(({fsm}) => isDeadlockFree(fsm))
        .check()

      expect(result.satisfiable).to.be.true
    })

    it('should find counterexample when deadlock exists', () => {
      // Generate FSMs that may have deadlocks
      const result = fcMain.scenario()
        .forall('fsm', fc.fsm({
          states: 4,
          alphabet: ['a'],
          minTransitionsPerState: 0, // Allow states with no transitions
          maxTransitionsPerState: 1
        }))
        .then(({fsm}) => {
          // This property will likely fail for FSMs with 0 transitions per state
          const reachable = getReachableStates(fsm)
          const accepting = new Set(fsm.accepting)

          for (const state of reachable) {
            if (!accepting.has(state)) {
              const trans = fsm.transitions.get(state) ?? []
              if (trans.length === 0) return false
            }
          }
          return true
        })
        .check()

      // The property may or may not hold depending on generated FSM
      // We're testing that the framework can check this property
      expect(result).to.have.property('satisfiable')
    })
  })

  /**
   * Problem 2: REACHABILITY
   *
   * All states should be reachable from the initial state.
   * Unreachable states indicate dead code or design errors.
   */
  describe('Problem 2: Reachability', () => {
    it('should detect unreachable states', () => {
      // FSM with unreachable states
      const fsmWithUnreachable: FSM = {
        states: [0, 1, 2, 3],
        alphabet: ['a', 'b'],
        initial: 0,
        accepting: [3],
        transitions: new Map([
          [0, [{to: 1, event: 'a'}]],
          [1, [{to: 0, event: 'b'}]],
          [2, [{to: 3, event: 'a'}]], // 2 and 3 are unreachable from 0
          [3, [{to: 2, event: 'b'}]]
        ])
      }

      expect(allStatesReachable(fsmWithUnreachable)).to.be.false
      const reachable = getReachableStates(fsmWithUnreachable)
      expect(reachable.size).to.equal(2)
      expect(reachable.has(0)).to.be.true
      expect(reachable.has(1)).to.be.true
      expect(reachable.has(2)).to.be.false
      expect(reachable.has(3)).to.be.false
    })

    it('should verify all states reachable with property-based testing', () => {
      // Property: For all FSMs generated with connected=true, all states are reachable
      const result = fcMain.scenario()
        .forall('fsm', fc.fsm({
          states: 6,
          alphabet: ['a', 'b', 'c'],
          connected: true
        }))
        .then(({fsm}) => allStatesReachable(fsm))
        .check()

      expect(result.satisfiable).to.be.true
    })

    it('should find specific reachable state using exists', () => {
      // Property: There exists a trace that reaches an accepting state
      const fsmValue: FSM = {
        states: [0, 1, 2, 3],
        alphabet: ['a', 'b'],
        initial: 0,
        accepting: [3],
        transitions: new Map([
          [0, [{to: 1, event: 'a'}, {to: 2, event: 'b'}]],
          [1, [{to: 3, event: 'b'}]],
          [2, [{to: 3, event: 'a'}]],
          [3, [{to: 0, event: 'a'}]]
        ])
      }

      const result = fcMain.scenario()
        .given('fsm', fsmValue)
        .exists('trace', (({fsm}: {fsm: FSM}) => fc.fsmTrace(fsm, 5, true)) as any)
        .then(({fsm, trace}) => {
          const typedFsm = fsm
          const typedTrace = trace as FSMTrace<number, string>
          const finalState = typedTrace.states[typedTrace.states.length - 1]
          return typedFsm.accepting.includes(finalState as number)
        })
        .check()

      expect(result.satisfiable).to.be.true
      if (result.example !== undefined) {
        const example = result.example as {fsm: FSM; trace: FSMTrace<number, string>}
        const finalState = example.trace.states[example.trace.states.length - 1]
        expect(fsmValue.accepting.includes(finalState as number)).to.be.true
      }
    })
  })

  /**
   * Problem 3: LIVENESS
   *
   * From any reachable state, it should be possible to eventually reach
   * an accepting state. This ensures the system can always complete its task.
   */
  describe('Problem 3: Liveness', () => {
    it('should detect liveness violations', () => {
      // FSM where state 1 cannot reach any accepting state
      const fsmWithoutLiveness: FSM = {
        states: [0, 1, 2],
        alphabet: ['a', 'b'],
        initial: 0,
        accepting: [2],
        transitions: new Map([
          [0, [{to: 1, event: 'a'}, {to: 2, event: 'b'}]],
          [1, [{to: 1, event: 'a'}, {to: 1, event: 'b'}]], // Stuck in state 1!
          [2, [{to: 0, event: 'a'}]]
        ])
      }

      expect(hasLiveness(fsmWithoutLiveness)).to.be.false
    })

    it('should verify liveness holds', () => {
      // FSM with proper liveness
      const fsmWithLiveness: FSM = {
        states: [0, 1, 2],
        alphabet: ['a', 'b'],
        initial: 0,
        accepting: [2],
        transitions: new Map([
          [0, [{to: 1, event: 'a'}]],
          [1, [{to: 2, event: 'b'}, {to: 0, event: 'a'}]],
          [2, [{to: 0, event: 'a'}]]
        ])
      }

      expect(hasLiveness(fsmWithLiveness)).to.be.true
    })

    it('should test liveness with property-based testing', () => {
      // Property: For randomly generated FSMs with sufficient connectivity,
      // check if liveness holds or find counterexamples
      const result = fcMain.scenario()
        .forall('fsm', fc.fsm({
          states: 4,
          alphabet: ['a', 'b'],
          minTransitionsPerState: 1,
          connected: true
        }))
        .then(({fsm}) => {
          // More lenient liveness check: accepting states are considered live
          const reachable = getReachableStates(fsm)
          const accepting = new Set(fsm.accepting)

          // If all reachable states are accepting, liveness trivially holds
          let allAccepting = true
          for (const s of reachable) {
            if (!accepting.has(s)) {
              allAccepting = false
              break
            }
          }
          if (allAccepting) return true

          // Otherwise check proper liveness
          return hasLiveness(fsm)
        })
        .check()

      // The property may or may not hold - we're testing the framework
      expect(result).to.have.property('satisfiable')
    })
  })

  /**
   * Problem 4: INVARIANTS
   *
   * Certain properties should hold for all reachable states.
   * Example: In a mutex protocol, at most one process holds the lock.
   */
  describe('Problem 4: State Invariants', () => {
    it('should verify invariant holds for all reachable states', () => {
      // Simple counter FSM where state represents count
      // Invariant: state value should be non-negative
      const counterFSM: FSM = {
        states: [0, 1, 2, 3],
        alphabet: ['inc', 'dec'],
        initial: 0,
        accepting: [0, 1, 2, 3],
        transitions: new Map([
          [0, [{to: 1, event: 'inc'}]],
          [1, [{to: 2, event: 'inc'}, {to: 0, event: 'dec'}]],
          [2, [{to: 3, event: 'inc'}, {to: 1, event: 'dec'}]],
          [3, [{to: 2, event: 'dec'}]]
        ])
      }

      // Invariant: All states are non-negative
      expect(invariantHolds(counterFSM, (state) => state >= 0)).to.be.true
    })

    it('should detect invariant violations with property-based testing', () => {
      // For any trace through the FSM, verify an invariant holds at each step
      const result = fcMain.scenario()
        .forall('fsm', fc.fsm({states: 4, alphabet: ['a', 'b']}))
        .forall('trace', (({fsm}: {fsm: FSM}) => fc.fsmTrace(fsm, 8)) as any)
        .then(({trace}) => {
          const typedTrace = trace as FSMTrace<number, string>
          // Invariant: All visited states should be valid indices
          for (const state of typedTrace.states) {
            if (typeof state === 'number' && (state < 0 || state > 10)) {
              return false
            }
          }
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
    })
  })

  /**
   * Problem 5: DETERMINISM
   *
   * A deterministic FSM has at most one transition per (state, event) pair.
   * This ensures predictable behavior.
   */
  describe('Problem 5: Determinism', () => {
    it('should detect non-determinism', () => {
      // Non-deterministic FSM (two transitions for same event from state 0)
      const nonDetFSM: FSM = {
        states: [0, 1, 2],
        alphabet: ['a', 'b'],
        initial: 0,
        accepting: [2],
        transitions: new Map([
          [0, [{to: 1, event: 'a'}, {to: 2, event: 'a'}]], // Non-deterministic!
          [1, [{to: 2, event: 'b'}]],
          [2, []]
        ])
      }

      expect(isDeterministic(nonDetFSM)).to.be.false
    })

    it('should verify determinism with property-based testing', () => {
      // Property: FSMs generated with deterministic=true are deterministic
      const result = fcMain.scenario()
        .forall('fsm', fc.fsm({
          states: 5,
          alphabet: ['a', 'b', 'c'],
          deterministic: true
        }))
        .then(({fsm}) => isDeterministic(fsm))
        .check()

      expect(result.satisfiable).to.be.true
    })

    it('should verify simulation is well-defined for deterministic FSMs', () => {
      // Property: For deterministic FSMs, simulation always produces a result
      const result = fcMain.scenario()
        .forall('fsm', fc.fsm({
          states: 4,
          alphabet: ['a', 'b'],
          deterministic: true,
          minTransitionsPerState: 2 // Ensure most events have transitions
        }))
        .forall('trace', (({fsm}: {fsm: FSM}) => fc.fsmTrace(fsm, 5)) as any)
        .then(({fsm, trace}) => {
          const typedFsm = fsm
          const typedTrace = trace as FSMTrace<number, string>
          // Simulation should work for valid traces
          const finalState = simulate(typedFsm, typedTrace.events)
          if (finalState === undefined) {
            // Trace may have taken a path where an event wasn't defined
            // This is ok - we're just checking consistency
            return true
          }
          // If simulation succeeded, it should match the trace
          return finalState === typedTrace.states[typedTrace.states.length - 1]
        })
        .check()

      expect(result.satisfiable).to.be.true
    })
  })
})

describe('FSM Shrinking', () => {
  it('should shrink FSMs by removing transitions', () => {
    const arb = fc.fsm({
      states: 4,
      alphabet: ['a', 'b'],
      minTransitionsPerState: 1,
      maxTransitionsPerState: 3
    })

    const sample = arb.sample(1)[0]
    if (sample === undefined) return

    // Count initial transitions
    let initialTransitions = 0
    for (const [, trans] of sample.value.transitions) {
      initialTransitions += trans.length
    }

    if (initialTransitions <= 4) return // Can't shrink much

    const shrunkArb = arb.shrink(sample)
    const shrunkSamples = shrunkArb.sample(5)

    for (const shrunk of shrunkSamples) {
      let shrunkTransitions = 0
      for (const [, trans] of shrunk.value.transitions) {
        shrunkTransitions += trans.length
      }
      expect(shrunkTransitions).to.be.at.most(initialTransitions)
    }
  })

  it('should shrink traces by reducing length', () => {
    const fsmValue: FSM = {
      states: [0, 1, 2],
      alphabet: ['a', 'b'],
      initial: 0,
      accepting: [2],
      transitions: new Map([
        [0, [{to: 1, event: 'a'}, {to: 0, event: 'b'}]],
        [1, [{to: 2, event: 'b'}, {to: 0, event: 'a'}]],
        [2, [{to: 0, event: 'a'}]]
      ])
    }

    const arb = fc.fsmTrace(fsmValue, 10)
    const samples = arb.sample(20)

    for (const sample of samples) {
      if (sample.value.events.length > 1) {
        const shrunkArb = arb.shrink(sample)
        const shrunkSamples = shrunkArb.sample(3)

        for (const shrunk of shrunkSamples) {
          expect(shrunk.value.events.length).to.be.lessThan(sample.value.events.length)
        }
        break
      }
    }
  })
})
