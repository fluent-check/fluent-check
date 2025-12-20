import type {
  StatefulConfig,
  StatefulCheckConfig,
  StatefulResult,
  CommandSequence
} from './types.js'

const DEFAULT_NUM_RUNS = 100
const DEFAULT_MAX_COMMANDS = 50
const UINT32_MAX = 0x100000000

function createRng(seed: number): () => number {
  let state = seed
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1)
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61)
    return ((state ^ (state >>> 14)) >>> 0) / UINT32_MAX
  }
}

/**
 * Creates a dummy SUT proxy that absorbs all method calls during sequence generation.
 * This allows the execute function to update the model without crashing on SUT access.
 * All property accesses return functions that return undefined, and those functions
 * are also proxies, so chained calls like sut.foo().bar() work without throwing.
 */
function createDummySut<S>(): S {
  const handler: ProxyHandler<object> = {
    get: () => new Proxy(() => undefined, handler),
    apply: () => undefined,
    construct: () => new Proxy({}, handler)
  }
  return new Proxy({}, handler) as S
}

function generateSequence<M, S>(
  config: StatefulConfig<M, S>,
  maxCommands: number,
  rng: () => number,
  verbose: boolean
): CommandSequence<M, S> {
  const sequence: CommandSequence<M, S> = []
  const model = config.modelFactory()
  const sequenceLength = Math.floor(rng() * (maxCommands + 1))

  for (let i = 0; i < sequenceLength; i++) {
    const validCommands = config.commands.filter(cmd => {
      if (cmd.precondition === undefined) return true
      try {
        return cmd.precondition(model)
      } catch {
        return false
      }
    })

    if (validCommands.length === 0) break

    const cmdIndex = Math.floor(rng() * validCommands.length)
    const command = validCommands[cmdIndex]
    if (command === undefined) continue

    const args: Record<string, unknown> = {}
    let allArgsGenerated = true

    for (const [key, arb] of Object.entries(command.arbitraries)) {
      const pick = arb.pick(rng)
      if (pick === undefined) {
        allArgsGenerated = false
        break
      }
      args[key] = pick.value
    }

    if (!allArgsGenerated) continue

    try {
      command.execute(args, model, createDummySut<S>())
    } catch (e) {
      if (verbose) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        console.warn(`[stateful] Command '${command.name}' threw during generation: ${errorMsg}`)
      }
    }

    sequence.push({command, args})
  }

  return sequence
}

function executeSequence<M, S>(
  config: StatefulConfig<M, S>,
  sequence: CommandSequence<M, S>
): { success: boolean; error?: string; failedAt?: number } {
  const model = config.modelFactory()
  const sut = config.sutFactory()

  for (let i = 0; i < sequence.length; i++) {
    const step = sequence[i]
    if (step === undefined) continue

    const {command, args} = step

    if (command.precondition !== undefined && !command.precondition(model)) {
      return {
        success: false,
        error: `Precondition failed for command "${command.name}" at step ${i}`,
        failedAt: i
      }
    }

    let result: unknown
    try {
      result = command.execute(args, model, sut)
      step.result = result
    } catch (err) {
      return {
        success: false,
        error: `Command "${command.name}" threw: ${err instanceof Error ? err.message : String(err)}`,
        failedAt: i
      }
    }

    if (command.postcondition !== undefined && !command.postcondition(args, model, sut, result)) {
      return {
        success: false,
        error: `Postcondition failed for command "${command.name}" at step ${i}`,
        failedAt: i
      }
    }

    for (const invariant of config.invariants) {
      try {
        if (!invariant(model, sut)) {
          return {
            success: false,
            error: `Invariant failed after command "${command.name}" at step ${i}`,
            failedAt: i
          }
        }
      } catch (err) {
        return {
          success: false,
          error: `Invariant threw after command "${command.name}": ${err instanceof Error ? err.message : String(err)}`,
          failedAt: i
        }
      }
    }
  }

  return {success: true}
}

function shrinkSequence<M, S>(
  config: StatefulConfig<M, S>,
  sequence: CommandSequence<M, S>
): CommandSequence<M, S> {
  let current = [...sequence]

  let lo = 0
  let hi = current.length

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const candidate = current.slice(0, mid)
    const result = executeSequence(config, candidate)

    if (!result.success) {
      hi = mid
      current = candidate
    } else {
      lo = mid + 1
    }
  }

  let improved = true
  while (improved) {
    improved = false

    for (let i = 0; i < current.length; i++) {
      const candidate = [...current.slice(0, i), ...current.slice(i + 1)]
      const result = executeSequence(config, candidate)

      if (!result.success) {
        current = candidate
        improved = true
        break
      }
    }
  }

  return current
}

export function runStatefulCheck<M, S>(
  config: StatefulConfig<M, S>,
  checkConfig: StatefulCheckConfig
): StatefulResult<M, S> {
  const numRuns = checkConfig.numRuns ?? DEFAULT_NUM_RUNS
  const maxCommands = checkConfig.maxCommands ?? DEFAULT_MAX_COMMANDS
  const seed = checkConfig.seed ?? Math.floor(Math.random() * UINT32_MAX)
  const verbose = checkConfig.verbose ?? false

  const rng = createRng(seed)

  for (let run = 0; run < numRuns; run++) {
    const sequence = generateSequence(config, maxCommands, rng, verbose)
    const result = executeSequence(config, sequence)

    if (!result.success) {
      const shrunk = shrinkSequence(config, sequence)

      return {
        success: false,
        numRuns: run + 1,
        failingSequence: sequence,
        shrunkSequence: shrunk,
        error: result.error,
        seed
      }
    }
  }

  return {
    success: true,
    numRuns,
    seed
  }
}
