import type {FluentPick} from './types.js'
import type {FSM, FSMConfig, FSMTrace} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {estimatedSize, FNV_OFFSET_BASIS, mix, stringToHash} from './util.js'
import {Arbitrary} from './internal.js'
import * as fc from './index.js'

/**
 * Arbitrary that generates Finite State Machines with configurable properties.
 *
 * FSMs are generated with the following structure:
 * - States: Either a count (generating 0, 1, 2, ...) or explicit state values
 * - Alphabet: Set of events/inputs that trigger transitions
 * - Transitions: Map from state to outgoing transitions (to, event)
 * - Initial: First state (states[0])
 * - Accepting: Subset of states marked as accepting
 *
 * Generation ensures:
 * - Connectivity (optional): All states reachable from initial
 * - Determinism (optional): At most one transition per (state, event) pair
 *
 * Note: This class does not delegate to ArbitraryGraph because FSMs have
 * semantic requirements that graphs cannot express:
 * - Transitions require event labels (not optional weights)
 * - Determinism constrains at most one transition per (state, event) pair
 * - Accepting states have no graph equivalent
 * The spanning tree and random edge algorithms share similar structure but
 * differ in how they assign events and enforce determinism constraints.
 *
 * @typeParam S - The state type
 * @typeParam E - The event/input type
 */
export class ArbitraryFSM<S = number, E = string> extends Arbitrary<FSM<S, E>> {
  private readonly stateCount: number
  private readonly stateValues: S[]
  private readonly alphabet: E[]
  private readonly minAccepting: number
  private readonly maxAccepting: number
  private readonly isConnected: boolean
  private readonly isDeterministic: boolean
  private readonly minTransitions: number
  private readonly maxTransitions: number

  constructor(config: FSMConfig<S, E>) {
    super()

    // Resolve state configuration
    if (typeof config.states === 'number') {
      this.stateCount = config.states
      this.stateValues = Array.from({length: config.states}, (_, i) => i) as S[]
    } else {
      this.stateCount = config.states.length
      this.stateValues = config.states
    }

    this.alphabet = config.alphabet
    this.minTransitions = config.minTransitionsPerState ?? 0
    this.maxTransitions = config.maxTransitionsPerState ?? this.alphabet.length
    this.isConnected = config.connected ?? true
    this.isDeterministic = config.deterministic ?? true
    this.minAccepting = config.minAccepting ?? 1
    this.maxAccepting = config.maxAccepting ?? Math.max(1, Math.floor(this.stateCount / 2))
  }

  override size() {
    // FSM size is combinatorial - estimate based on state and transition counts
    if (this.stateCount === 0 || this.alphabet.length === 0) {
      return estimatedSize(1, [1, 1])
    }

    const avgTransitions = (this.minTransitions + this.maxTransitions) / 2
    const transitionCombinations = Math.pow(this.stateCount, avgTransitions * this.stateCount)
    const acceptingCombinations = Math.pow(2, this.stateCount)

    return estimatedSize(
      transitionCombinations * acceptingCombinations,
      [1, transitionCombinations * acceptingCombinations * 10]
    )
  }

  override pick(generator: () => number): FluentPick<FSM<S, E>> | undefined {
    if (this.stateCount === 0 || this.alphabet.length === 0) {
      return undefined
    }

    const states = [...this.stateValues]
    const initial = states[0] as S
    const transitions: Map<S, Array<{to: S; event: E}>> = new Map()

    // Initialize empty transition lists
    for (const state of states) {
      transitions.set(state, [])
    }

    // If connected, build a spanning tree from initial state first
    if (this.isConnected && states.length > 1) {
      this.addSpanningTransitions(states, transitions, generator)
    }

    // Add additional random transitions
    this.addRandomTransitions(states, transitions, generator)

    // Select accepting states
    const acceptingCount = Math.floor(
      generator() * (this.maxAccepting - this.minAccepting + 1)
    ) + this.minAccepting
    const accepting = this.selectAcceptingStates(states, acceptingCount, generator)

    const fsm: FSM<S, E> = {
      states,
      alphabet: [...this.alphabet],
      initial,
      accepting,
      transitions
    }

    return {value: fsm}
  }

  private addSpanningTransitions(
    states: S[],
    transitions: Map<S, Array<{to: S; event: E}>>,
    generator: () => number
  ): void {
    // Shuffle states for random tree structure (keep first as initial)
    const shuffled = [states[0] as S]
    const remaining = states.slice(1)

    // Fisher-Yates shuffle
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(generator() * (i + 1))
      const temp = remaining[i]
      remaining[i] = remaining[j] as S
      remaining[j] = temp as S
    }
    shuffled.push(...remaining)

    // Connect each state to a random previous state
    // For deterministic FSMs, track used events per state to avoid overloading
    for (let i = 1; i < shuffled.length; i++) {
      const to = shuffled[i] as S

      // Try to find a valid source state with available events
      let added = false

      // Try states in random order until we find one that can accept the transition
      const candidateIndices = Array.from({length: i}, (_, k) => k)
      // Shuffle candidates
      for (let j = candidateIndices.length - 1; j > 0; j--) {
        const k = Math.floor(generator() * (j + 1))
        const temp = candidateIndices[j]
        candidateIndices[j] = candidateIndices[k] as number
        candidateIndices[k] = temp as number
      }

      for (const fromIdx of candidateIndices) {
        const from = shuffled[fromIdx] as S
        const fromTransitions = transitions.get(from) ?? []

        if (this.isDeterministic) {
          const usedEvents = new Set(fromTransitions.map(t => t.event))
          // Check if this state can accept more transitions
          if (usedEvents.size >= this.alphabet.length) {
            continue // All events used from this state, try another
          }

          // Find an unused event
          const unusedEvent = this.alphabet.find(e => !usedEvents.has(e))
          if (unusedEvent !== undefined) {
            fromTransitions.push({to, event: unusedEvent})
            transitions.set(from, fromTransitions)
            added = true
            break
          }
        } else {
          const event = this.alphabet[Math.floor(generator() * this.alphabet.length)] as E
          fromTransitions.push({to, event})
          transitions.set(from, fromTransitions)
          added = true
          break
        }
      }

      // If we couldn't add from any existing state, this shouldn't happen
      // if alphabet.length >= 1 and we have enough states processed
      if (!added && !this.isDeterministic) {
        // Fallback: add from the first state
        const from = shuffled[0] as S
        const event = this.alphabet[Math.floor(generator() * this.alphabet.length)] as E
        const fromTransitions = transitions.get(from) ?? []
        fromTransitions.push({to, event})
        transitions.set(from, fromTransitions)
      }
    }
  }

  private addRandomTransitions(
    states: S[],
    transitions: Map<S, Array<{to: S; event: E}>>,
    generator: () => number
  ): void {
    for (const state of states) {
      const stateTransitions = transitions.get(state) ?? []
      const currentCount = stateTransitions.length
      const targetCount = Math.floor(
        generator() * (this.maxTransitions - Math.max(this.minTransitions, currentCount) + 1)
      ) + Math.max(this.minTransitions, currentCount)

      const additionalNeeded = targetCount - currentCount
      if (additionalNeeded <= 0) continue

      const usedEvents = new Set(stateTransitions.map(t => t.event))

      for (let i = 0; i < additionalNeeded; i++) {
        const to = states[Math.floor(generator() * states.length)] as S

        if (this.isDeterministic) {
          // Find an unused event
          const unusedEvent = this.alphabet.find(e => !usedEvents.has(e))
          if (unusedEvent !== undefined) {
            stateTransitions.push({to, event: unusedEvent})
            usedEvents.add(unusedEvent)
          }
        } else {
          const event = this.alphabet[Math.floor(generator() * this.alphabet.length)] as E
          stateTransitions.push({to, event})
        }
      }

      transitions.set(state, stateTransitions)
    }
  }

  private selectAcceptingStates(states: S[], count: number, generator: () => number): S[] {
    const shuffled = [...states]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(generator() * (i + 1))
      const temp = shuffled[i]
      shuffled[i] = shuffled[j] as S
      shuffled[j] = temp as S
    }
    return shuffled.slice(0, Math.min(count, shuffled.length))
  }

  override shrink(initial: FluentPick<FSM<S, E>>): Arbitrary<FSM<S, E>> {
    const fsm = initial.value
    const shrunkFSMs: FSM<S, E>[] = []

    // Strategy 1: Remove transitions
    for (const [state, stateTransitions] of fsm.transitions) {
      if (stateTransitions.length > this.minTransitions) {
        for (let i = 0; i < stateTransitions.length; i++) {
          const newTransitions = new Map(fsm.transitions)
          const newStateTransitions = [...stateTransitions]
          newStateTransitions.splice(i, 1)
          newTransitions.set(state, newStateTransitions)

          const newFSM: FSM<S, E> = {
            ...fsm,
            transitions: newTransitions
          }

          // Check if still connected
          if (!this.isConnected || this.checkConnected(newFSM)) {
            shrunkFSMs.push(newFSM)
          }
        }
      }
    }

    // Strategy 2: Reduce accepting states (if above minimum)
    if (fsm.accepting.length > this.minAccepting) {
      for (let i = 0; i < fsm.accepting.length; i++) {
        const newAccepting = [...fsm.accepting]
        newAccepting.splice(i, 1)
        shrunkFSMs.push({...fsm, accepting: newAccepting})
      }
    }

    if (shrunkFSMs.length === 0) {
      return fc.empty()
    }

    return fc.oneof(shrunkFSMs as [FSM<S, E>, ...FSM<S, E>[]])
  }

  private checkConnected(fsm: FSM<S, E>): boolean {
    if (fsm.states.length === 0) return true

    const visited = new Set<S>()
    const queue: S[] = [fsm.initial]
    visited.add(fsm.initial)

    while (queue.length > 0) {
      const state = queue.shift()
      if (state === undefined) break

      const stateTransitions = fsm.transitions.get(state) ?? []
      for (const transition of stateTransitions) {
        if (!visited.has(transition.to)) {
          visited.add(transition.to)
          queue.push(transition.to)
        }
      }
    }

    return visited.size === fsm.states.length
  }

  override canGenerate(pick: FluentPick<FSM<S, E>>): boolean {
    const fsm = pick.value

    if (fsm.states.length !== this.stateCount) return false
    if (fsm.alphabet.length !== this.alphabet.length) return false
    if (!fsm.states.includes(fsm.initial)) return false

    // Check accepting states count
    if (fsm.accepting.length < this.minAccepting) return false
    if (fsm.accepting.length > this.maxAccepting) return false

    // Check transitions per state
    for (const [, stateTransitions] of fsm.transitions) {
      if (stateTransitions.length < this.minTransitions) return false
      if (stateTransitions.length > this.maxTransitions) return false
    }

    // Check connectivity
    if (this.isConnected && !this.checkConnected(fsm)) return false

    // Check determinism
    if (this.isDeterministic && !this.checkDeterministic(fsm)) return false

    return true
  }

  private checkDeterministic(fsm: FSM<S, E>): boolean {
    for (const [, stateTransitions] of fsm.transitions) {
      const events = stateTransitions.map(t => t.event)
      const uniqueEvents = new Set(events)
      if (events.length !== uniqueEvents.size) return false
    }
    return true
  }

  override cornerCases(): FluentPick<FSM<S, E>>[] {
    const cases: FluentPick<FSM<S, E>>[] = []

    if (this.stateCount === 0 || this.alphabet.length === 0) {
      return cases
    }

    // Minimal FSM: single state, self-loop
    if (this.stateCount >= 1) {
      const singleState = this.stateValues[0] as S
      const singleTransitions = new Map<S, Array<{to: S; event: E}>>()
      singleTransitions.set(singleState, [{to: singleState, event: this.alphabet[0] as E}])

      cases.push({
        value: {
          states: [singleState],
          alphabet: [...this.alphabet],
          initial: singleState,
          accepting: [singleState],
          transitions: singleTransitions
        }
      })
    }

    return cases
  }

  override hashCode(): HashFunction {
    return (f: unknown): number => {
      const fsm = f as FSM<S, E>
      let hash = FNV_OFFSET_BASIS

      hash = mix(hash, fsm.states.length)
      hash = mix(hash, fsm.alphabet.length)
      hash = mix(hash, fsm.accepting.length)
      hash = mix(hash, stringToHash(String(fsm.initial)))

      // Count total transitions
      let transitionCount = 0
      for (const [, trans] of fsm.transitions) {
        transitionCount += trans.length
      }
      hash = mix(hash, transitionCount)

      return hash
    }
  }

  override equals(): EqualsFunction {
    return (a: unknown, b: unknown): boolean => {
      const fsmA = a as FSM<S, E>
      const fsmB = b as FSM<S, E>

      if (fsmA.states.length !== fsmB.states.length) return false
      if (fsmA.alphabet.length !== fsmB.alphabet.length) return false
      if (fsmA.initial !== fsmB.initial) return false
      if (fsmA.accepting.length !== fsmB.accepting.length) return false

      // Compare transitions
      for (const [state, transA] of fsmA.transitions) {
        const transB = fsmB.transitions.get(state)
        if (transB === undefined) return false
        if (transA.length !== transB.length) return false
      }

      return true
    }
  }

  override toString(depth = 0): string {
    const indent = ' '.repeat(depth * 2)
    return `${indent}FSM Arbitrary: states=${this.stateCount}, alphabet=[${this.alphabet.join(', ')}]`
  }
}

/**
 * Arbitrary that generates valid execution traces for an FSM.
 *
 * @typeParam S - The state type
 * @typeParam E - The event type
 */
export class ArbitraryFSMTrace<S, E> extends Arbitrary<FSMTrace<S, E>> {
  private readonly fsm: FSM<S, E>
  private readonly maxLength: number
  private readonly reachAccepting: boolean

  constructor(
    fsm: FSM<S, E>,
    maxLength = 10,
    reachAccepting = false
  ) {
    super()
    this.fsm = fsm
    this.maxLength = maxLength
    this.reachAccepting = reachAccepting
  }

  override size() {
    const avgTransitions = this.computeAvgTransitions()
    const estimatedTraces = Math.pow(avgTransitions, this.maxLength)
    return estimatedSize(Math.max(1, estimatedTraces), [1, estimatedTraces * 10])
  }

  private computeAvgTransitions(): number {
    if (this.fsm.states.length === 0) return 0

    let total = 0
    for (const [, trans] of this.fsm.transitions) {
      total += trans.length
    }
    return total / this.fsm.states.length
  }

  override pick(generator: () => number): FluentPick<FSMTrace<S, E>> | undefined {
    const states: S[] = [this.fsm.initial]
    const events: E[] = []
    let current = this.fsm.initial

    const acceptingSet = new Set(this.fsm.accepting)

    while (states.length < this.maxLength + 1) {
      // If we need to reach accepting and we're there, maybe stop
      if (this.reachAccepting && acceptingSet.has(current)) {
        if (generator() < 0.3) break // 30% chance to stop at accepting state
      }

      const transitions = this.fsm.transitions.get(current) ?? []
      if (transitions.length === 0) break // Deadlock

      // Pick random transition
      const idx = Math.floor(generator() * transitions.length)
      const transition = transitions[idx]
      if (transition === undefined) break

      events.push(transition.event)
      states.push(transition.to)
      current = transition.to
    }

    return {value: {states, events}}
  }

  override shrink(initial: FluentPick<FSMTrace<S, E>>): Arbitrary<FSMTrace<S, E>> {
    const trace = initial.value

    if (trace.events.length <= 0) {
      return fc.empty()
    }

    const shrunkTraces: FSMTrace<S, E>[] = []

    // Try removing each step from the end
    for (let len = trace.events.length - 1; len >= 0; len--) {
      shrunkTraces.push({
        states: trace.states.slice(0, len + 1),
        events: trace.events.slice(0, len)
      })
    }

    if (shrunkTraces.length === 0) {
      return fc.empty()
    }

    return fc.oneof(shrunkTraces as [FSMTrace<S, E>, ...FSMTrace<S, E>[]])
  }

  override canGenerate(pick: FluentPick<FSMTrace<S, E>>): boolean {
    const trace = pick.value

    if (trace.states.length === 0) return false
    if (trace.states[0] !== this.fsm.initial) return false
    if (trace.events.length !== trace.states.length - 1) return false
    if (trace.states.length > this.maxLength + 1) return false

    // Verify each transition is valid
    for (let i = 0; i < trace.events.length; i++) {
      const from = trace.states[i] as S
      const to = trace.states[i + 1] as S
      const event = trace.events[i] as E

      const transitions = this.fsm.transitions.get(from) ?? []
      const valid = transitions.some(t => t.to === to && t.event === event)
      if (!valid) return false
    }

    return true
  }

  override cornerCases(): FluentPick<FSMTrace<S, E>>[] {
    const cases: FluentPick<FSMTrace<S, E>>[] = []

    // Empty trace (just initial state)
    cases.push({
      value: {states: [this.fsm.initial], events: []}
    })

    return cases
  }

  override hashCode(): HashFunction {
    return (t: unknown): number => {
      const trace = t as FSMTrace<S, E>
      let hash = FNV_OFFSET_BASIS
      hash = mix(hash, trace.states.length)
      hash = mix(hash, trace.events.length)
      return hash
    }
  }

  override equals(): EqualsFunction {
    return (a: unknown, b: unknown): boolean => {
      const traceA = a as FSMTrace<S, E>
      const traceB = b as FSMTrace<S, E>

      if (traceA.states.length !== traceB.states.length) return false
      if (traceA.events.length !== traceB.events.length) return false

      for (let i = 0; i < traceA.states.length; i++) {
        if (traceA.states[i] !== traceB.states[i]) return false
      }
      for (let i = 0; i < traceA.events.length; i++) {
        if (traceA.events[i] !== traceB.events[i]) return false
      }

      return true
    }
  }

  override toString(depth = 0): string {
    const indent = ' '.repeat(depth * 2)
    return `${indent}FSM Trace Arbitrary: maxLength=${this.maxLength}`
  }
}

// ============================================================================
// FSM Property Checking Utilities
// ============================================================================

/**
 * Checks if an FSM is deadlock-free.
 * A deadlock occurs when a non-accepting state has no outgoing transitions.
 */
export function isDeadlockFree<S, E>(fsm: FSM<S, E>): boolean {
  const acceptingSet = new Set(fsm.accepting)

  for (const state of fsm.states) {
    if (acceptingSet.has(state)) continue // Accepting states can be terminal

    const transitions = fsm.transitions.get(state) ?? []
    if (transitions.length === 0) {
      return false // Deadlock: non-accepting state with no transitions
    }
  }

  return true
}

/**
 * Checks if all states in an FSM are reachable from the initial state.
 */
export function allStatesReachable<S, E>(fsm: FSM<S, E>): boolean {
  const visited = new Set<S>()
  const queue: S[] = [fsm.initial]
  visited.add(fsm.initial)

  while (queue.length > 0) {
    const state = queue.shift()
    if (state === undefined) break

    const transitions = fsm.transitions.get(state) ?? []
    for (const t of transitions) {
      if (!visited.has(t.to)) {
        visited.add(t.to)
        queue.push(t.to)
      }
    }
  }

  return visited.size === fsm.states.length
}

/**
 * Checks liveness: from any reachable state, an accepting state is reachable.
 */
export function hasLiveness<S, E>(fsm: FSM<S, E>): boolean {
  // First, find all states that can reach an accepting state (backward reachability)
  const canReachAccepting = new Set<S>(fsm.accepting)
  let changed = true

  while (changed) {
    changed = false
    for (const [state, transitions] of fsm.transitions) {
      if (canReachAccepting.has(state)) continue

      for (const t of transitions) {
        if (canReachAccepting.has(t.to)) {
          canReachAccepting.add(state)
          changed = true
          break
        }
      }
    }
  }

  // Now check that all reachable states can reach an accepting state
  const reachable = getReachableStates(fsm)

  for (const state of reachable) {
    if (!canReachAccepting.has(state)) {
      return false
    }
  }

  return true
}

/**
 * Gets all states reachable from the initial state.
 */
export function getReachableStates<S, E>(fsm: FSM<S, E>): Set<S> {
  const visited = new Set<S>()
  const queue: S[] = [fsm.initial]
  visited.add(fsm.initial)

  while (queue.length > 0) {
    const state = queue.shift()
    if (state === undefined) break

    const transitions = fsm.transitions.get(state) ?? []
    for (const t of transitions) {
      if (!visited.has(t.to)) {
        visited.add(t.to)
        queue.push(t.to)
      }
    }
  }

  return visited
}

/**
 * Checks if an FSM is deterministic.
 * A deterministic FSM has at most one transition per (state, event) pair.
 */
export function isDeterministic<S, E>(fsm: FSM<S, E>): boolean {
  for (const [, transitions] of fsm.transitions) {
    const events = transitions.map(t => t.event)
    const uniqueEvents = new Set(events)
    if (events.length !== uniqueEvents.size) {
      return false
    }
  }
  return true
}

/**
 * Checks if an invariant holds for all reachable states.
 *
 * @param fsm - The FSM to check
 * @param invariant - Predicate that should hold for every reachable state
 */
export function invariantHolds<S, E>(
  fsm: FSM<S, E>,
  invariant: (state: S) => boolean
): boolean {
  const reachable = getReachableStates(fsm)

  for (const state of reachable) {
    if (!invariant(state)) {
      return false
    }
  }

  return true
}

/**
 * Finds all deadlock states (non-accepting states with no outgoing transitions).
 */
export function findDeadlocks<S, E>(fsm: FSM<S, E>): S[] {
  const acceptingSet = new Set(fsm.accepting)
  const deadlocks: S[] = []

  for (const state of fsm.states) {
    if (acceptingSet.has(state)) continue

    const transitions = fsm.transitions.get(state) ?? []
    if (transitions.length === 0) {
      deadlocks.push(state)
    }
  }

  return deadlocks
}

/**
 * Simulates the FSM with a sequence of events and returns the final state.
 * Returns undefined if any transition is undefined (non-deterministic or missing).
 */
export function simulate<S, E>(fsm: FSM<S, E>, events: E[]): S | undefined {
  let current = fsm.initial

  for (const event of events) {
    const transitions = fsm.transitions.get(current) ?? []
    const matching = transitions.filter(t => t.event === event)

    if (matching.length !== 1) {
      return undefined // Non-deterministic or no transition
    }

    const transition = matching[0]
    if (transition === undefined) {
      return undefined
    }
    current = transition.to
  }

  return current
}
