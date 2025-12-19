import type {Arbitrary} from '../arbitraries/internal.js'
import type {
  Command,
  Invariant,
  StatefulConfig,
  StatefulCheckConfig,
  StatefulResult,
  CommandSequence
} from './types.js'

/**
 * Sub-builder for defining a single command with fluent API.
 */
export class CommandBuilder<M, S, Args extends Record<string, unknown> = Record<string, never>> {
  private readonly parent: StatefulBuilder<M, S>
  private readonly commandName: string
  private args: { [K in keyof Args]: Arbitrary<Args[K]> } = {} as { [K in keyof Args]: Arbitrary<Args[K]> }
  private precondition?: (model: M) => boolean
  private runFn?: (args: Args, model: M, sut: S) => unknown
  private postcondition?: (args: Args, model: M, sut: S, result: unknown) => boolean

  constructor(parent: StatefulBuilder<M, S>, name: string) {
    this.parent = parent
    this.commandName = name
  }

  /**
   * Add a randomly generated argument to this command.
   *
   * @param name - Name of the argument
   * @param arbitrary - Arbitrary to generate values
   * @returns CommandBuilder with the new argument type
   */
  forall<K extends string, V>(
    name: K,
    arbitrary: Arbitrary<V>
  ): CommandBuilder<M, S, Args & { [P in K]: V }> {
    // TypeScript needs help here - we're building up the Args type incrementally
    // eslint-disable-next-line no-restricted-syntax
    const builder = this as unknown as CommandBuilder<M, S, Args & { [P in K]: V }>
    ;(builder.args as Record<string, Arbitrary<unknown>>)[name] = arbitrary
    return builder
  }

  /**
   * Set a precondition for this command.
   * The command will only be selected when the precondition returns true.
   *
   * @param predicate - Function that returns true when command is valid
   */
  pre(predicate: (model: M) => boolean): this {
    this.precondition = predicate
    return this
  }

  /**
   * Set the execution logic for this command.
   *
   * @param fn - Function that executes the command
   * @returns The parent builder for chaining
   */
  run(fn: (args: Args, model: M, sut: S) => unknown): PostBuilder<M, S, Args> {
    this.runFn = fn
    return new PostBuilder(this.parent, this.buildCommand())
  }

  private buildCommand(): Command<M, S, Args> {
    if (this.runFn === undefined) {
      throw new Error(`Command "${this.commandName}" must have a run() function`)
    }

    return {
      name: this.commandName,
      args: this.args,
      pre: this.precondition,
      run: this.runFn,
      post: this.postcondition
    }
  }
}

/**
 * Builder for adding postconditions and continuing the chain.
 */
export class PostBuilder<M, S, Args extends Record<string, unknown>> {
  private readonly parent: StatefulBuilder<M, S>
  private readonly cmd: Command<M, S, Args>

  constructor(parent: StatefulBuilder<M, S>, command: Command<M, S, Args>) {
    this.parent = parent
    this.cmd = command
  }

  /**
   * Set a postcondition for this command.
   *
   * @param predicate - Function that returns true when postcondition is satisfied
   * @returns The parent builder for chaining
   */
  post(predicate: (args: Args, model: M, sut: S, result: unknown) => boolean): StatefulBuilder<M, S> {
    this.cmd.post = predicate
    this.parent.addCommand(this.cmd as Command<M, S, Record<string, unknown>>)
    return this.parent
  }

  /**
   * Define another command.
   */
  command(name: string): CommandBuilder<M, S> {
    this.parent.addCommand(this.cmd as Command<M, S, Record<string, unknown>>)
    return this.parent.command(name)
  }

  /**
   * Add a system invariant.
   */
  invariant(predicate: Invariant<M, S>): StatefulBuilder<M, S> {
    this.parent.addCommand(this.cmd as Command<M, S, Record<string, unknown>>)
    return this.parent.invariant(predicate)
  }

  /**
   * Run the stateful tests.
   */
  check(config?: StatefulCheckConfig): StatefulResult<M, S> {
    this.parent.addCommand(this.cmd as Command<M, S, Record<string, unknown>>)
    return this.parent.check(config)
  }
}

/**
 * Main builder for defining stateful tests with a fluent API.
 *
 * @typeParam M - Model type (simplified representation)
 * @typeParam S - System under test type (actual implementation)
 *
 * @example
 * ```typescript
 * fc.stateful<{ count: number }, Counter>()
 *   .model(() => ({ count: 0 }))
 *   .sut(() => new Counter())
 *   .command('increment')
 *     .run(({}, model, sut) => {
 *       model.count++
 *       sut.increment()
 *     })
 *   .command('decrement')
 *     .pre(model => model.count > 0)
 *     .run(({}, model, sut) => {
 *       model.count--
 *       sut.decrement()
 *     })
 *   .invariant((model, sut) => sut.value() === model.count)
 *   .check({ maxCommands: 100 })
 * ```
 */
export class StatefulBuilder<M, S> {
  private config: Partial<StatefulConfig<M, S>> = {
    commands: [],
    invariants: []
  }

  /**
   * Set the model factory function.
   * The model is a simplified representation of the expected system state.
   *
   * @param factory - Function that creates a fresh model instance
   */
  model(factory: () => M): this {
    this.config.modelFactory = factory
    return this
  }

  /**
   * Set the system-under-test factory function.
   *
   * @param factory - Function that creates a fresh SUT instance
   */
  sut(factory: () => S): this {
    this.config.sutFactory = factory
    return this
  }

  /**
   * Begin defining a new command.
   *
   * @param name - Unique name for this command
   */
  command(name: string): CommandBuilder<M, S> {
    return new CommandBuilder(this, name)
  }

  /**
   * Add a command to the configuration.
   * @internal
   */
  addCommand(cmd: Command<M, S, Record<string, unknown>>): void {
    this.config.commands?.push(cmd)
  }

  /**
   * Add a system invariant that will be checked after every command.
   *
   * @param predicate - Function that returns true when invariant holds
   */
  invariant(predicate: Invariant<M, S>): this {
    this.config.invariants?.push(predicate)
    return this
  }

  /**
   * Run the stateful tests.
   *
   * @param checkConfig - Configuration for the test run
   */
  check(checkConfig?: StatefulCheckConfig): StatefulResult<M, S> {
    const fullConfig = this.validateConfig()
    return runStatefulCheck(fullConfig, checkConfig ?? {})
  }

  private validateConfig(): StatefulConfig<M, S> {
    if (this.config.modelFactory === undefined) {
      throw new Error('Stateful test must have a model factory (use .model())')
    }
    if (this.config.sutFactory === undefined) {
      throw new Error('Stateful test must have a SUT factory (use .sut())')
    }
    if (this.config.commands === undefined || this.config.commands.length === 0) {
      throw new Error('Stateful test must have at least one command')
    }

    return {
      modelFactory: this.config.modelFactory,
      sutFactory: this.config.sutFactory,
      commands: this.config.commands,
      invariants: this.config.invariants ?? []
    }
  }
}

/**
 * Creates a new stateful test builder.
 *
 * @typeParam M - Model type
 * @typeParam S - System under test type
 */
export function stateful<M, S>(): StatefulBuilder<M, S> {
  return new StatefulBuilder<M, S>()
}

// ============================================================================
// Execution Engine
// ============================================================================

/**
 * Simple PRNG for reproducibility (mulberry32)
 */
function createRng(seed: number): () => number {
  let state = seed
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1)
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61)
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generate a command sequence.
 */
function generateSequence<M, S>(
  config: StatefulConfig<M, S>,
  maxCommands: number,
  rng: () => number,
  verbose = false
): CommandSequence<M, S> {
  const sequence: CommandSequence<M, S> = []
  const model = config.modelFactory()

  const sequenceLength = Math.floor(rng() * (maxCommands + 1))

  for (let i = 0; i < sequenceLength; i++) {
    // Filter commands by precondition
    const validCommands = config.commands.filter(cmd => {
      if (cmd.pre === undefined) return true
      try {
        return cmd.pre(model)
      } catch {
        return false
      }
    })

    if (validCommands.length === 0) {
      break // No valid commands available
    }

    // Pick a random command
    const cmdIndex = Math.floor(rng() * validCommands.length)
    const cmd = validCommands[cmdIndex]
    if (cmd === undefined) continue

    // Generate arguments
    const args: Record<string, unknown> = {}
    let allArgsGenerated = true
    for (const [key, arb] of Object.entries(cmd.args)) {
      const pick = (arb).pick(rng)
      if (pick === undefined) {
        allArgsGenerated = false
        break
      }
      args[key] = pick.value
    }
    
    // Skip command if any argument failed to generate
    if (!allArgsGenerated) continue

    // Execute on model to update state for precondition checking
    // We use a dummy SUT during generation to track model state changes
    try {
      // eslint-disable-next-line no-restricted-syntax
      cmd.run(args, model, undefined as unknown as S)
    } catch (e) {
      // Errors during model-only execution may indicate bugs in command logic
      if (verbose) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        console.warn(`[stateful] Warning: command '${cmd.name}' threw during sequence generation: ${errorMsg}`)
      }
    }

    sequence.push({
      command: cmd,
      args
    })
  }

  return sequence
}

/**
 * Execute a command sequence and check for failures.
 */
function executeSequence<M, S>(
  config: StatefulConfig<M, S>,
  sequence: CommandSequence<M, S>
): { success: boolean; error?: string; failedAt?: number } {
  const model = config.modelFactory()
  const sut = config.sutFactory()

  for (let i = 0; i < sequence.length; i++) {
    const executed = sequence[i]
    if (executed === undefined) continue

    const {command, args} = executed

    // Check precondition
    if (command.pre !== undefined && !command.pre(model)) {
      return {
        success: false,
        error: `Precondition failed for command "${command.name}" at step ${i}`,
        failedAt: i
      }
    }

    // Execute command
    let result: unknown
    try {
      result = command.run(args as Record<string, unknown>, model, sut)
      executed.result = result
    } catch (err) {
      return {
        success: false,
        error: `Command "${command.name}" threw: ${err instanceof Error ? err.message : String(err)}`,
        failedAt: i
      }
    }

    // Check postcondition
    if (command.post !== undefined && !command.post(args as Record<string, unknown>, model, sut, result)) {
      return {
        success: false,
        error: `Postcondition failed for command "${command.name}" at step ${i}`,
        failedAt: i
      }
    }

    // Check invariants
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

/**
 * Shrink a failing sequence to find a minimal reproduction.
 */
function shrinkSequence<M, S>(
  config: StatefulConfig<M, S>,
  sequence: CommandSequence<M, S>
): CommandSequence<M, S> {
  let current = [...sequence]

  // Try removing commands from the end (binary search on length)
  let lo = 0
  let hi = current.length

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const candidate = current.slice(0, mid)
    const result = executeSequence(config, candidate)

    if (!result.success) {
      // Still fails - can shrink more
      hi = mid
      current = candidate
    } else {
      // Doesn't fail - need more commands
      lo = mid + 1
    }
  }

  // Try removing individual commands
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

/**
 * Run the stateful check.
 */
function runStatefulCheck<M, S>(
  config: StatefulConfig<M, S>,
  checkConfig: StatefulCheckConfig
): StatefulResult<M, S> {
  const numRuns = checkConfig.numRuns ?? 100
  const maxCommands = checkConfig.maxCommands ?? 50
  const seed = checkConfig.seed ?? Math.floor(Math.random() * 0x100000000)

  const rng = createRng(seed)
  const verbose = checkConfig.verbose ?? false

  for (let run = 0; run < numRuns; run++) {
    const sequence = generateSequence(config, maxCommands, rng, verbose)
    const result = executeSequence(config, sequence)

    if (!result.success) {
      // Found a failure - shrink it
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
