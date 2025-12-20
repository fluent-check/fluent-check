import type {Arbitrary} from '../arbitraries/internal.js'
import type {
  Invariant,
  StatefulCheckConfig,
  StatefulResult,
  StoredCommand,
  BuilderState,
  Prettify
} from './types.js'
import {
  emptyBuilderState,
  withModelFactory,
  withSutFactory,
  withCommand,
  withInvariant
} from './types.js'
import {runStatefulCheck} from './execution.js'

class CommandNameBuilder<M, S> {
  protected constructor(
    protected readonly state: BuilderState<M, S>,
    protected readonly name: string
  ) {}

  static create<M, S>(state: BuilderState<M, S>, name: string): CommandNameBuilder<M, S> {
    return new CommandNameBuilder(state, name)
  }

  forall<K extends string, V>(
    argName: K,
    arbitrary: Arbitrary<V>
  ): CommandArgsBuilder<M, S, Record<K, V>> {
    return CommandArgsBuilder.create(
      this.state,
      this.name,
      {[argName]: arbitrary},
      undefined
    )
  }

  pre(predicate: (model: M) => boolean): CommandPreBuilder<M, S, Record<string, never>> {
    return CommandPreBuilder.create(
      this.state,
      this.name,
      {},
      predicate
    )
  }

  run(fn: (args: Record<string, never>, model: M, sut: S) => unknown): CommandPostBuilder<M, S, Record<string, never>> {
    return CommandPostBuilder.create(
      this.state,
      this.name,
      {},
      undefined,
      fn
    )
  }
}

class CommandArgsBuilder<M, S, Args extends Record<string, unknown>> {
  protected constructor(
    protected readonly state: BuilderState<M, S>,
    protected readonly commandName: string,
    protected readonly arbitraries: Record<string, Arbitrary<unknown>>,
    protected readonly precondition: ((model: M) => boolean) | undefined
  ) {}

  static create<M, S, Args extends Record<string, unknown>>(
    state: BuilderState<M, S>,
    name: string,
    arbitraries: Record<string, Arbitrary<unknown>>,
    precondition: ((model: M) => boolean) | undefined
  ): CommandArgsBuilder<M, S, Args> {
    return new CommandArgsBuilder(state, name, arbitraries, precondition)
  }

  forall<K extends string, V>(
    argName: K,
    arbitrary: Arbitrary<V>
  ): CommandArgsBuilder<M, S, Prettify<Args & Record<K, V>>> {
    return CommandArgsBuilder.create(
      this.state,
      this.commandName,
      {...this.arbitraries, [argName]: arbitrary},
      this.precondition
    )
  }

  pre(predicate: (model: M) => boolean): CommandPreBuilder<M, S, Args> {
    return CommandPreBuilder.create(
      this.state,
      this.commandName,
      this.arbitraries,
      predicate
    )
  }

  run(fn: (args: Args, model: M, sut: S) => unknown): CommandPostBuilder<M, S, Args> {
    return CommandPostBuilder.create(
      this.state,
      this.commandName,
      this.arbitraries,
      this.precondition,
      fn
    )
  }
}

class CommandPreBuilder<M, S, Args extends Record<string, unknown>> {
  protected constructor(
    protected readonly state: BuilderState<M, S>,
    protected readonly commandName: string,
    protected readonly arbitraries: Record<string, Arbitrary<unknown>>,
    protected readonly precondition: (model: M) => boolean
  ) {}

  static create<M, S, Args extends Record<string, unknown>>(
    state: BuilderState<M, S>,
    name: string,
    arbitraries: Record<string, Arbitrary<unknown>>,
    precondition: (model: M) => boolean
  ): CommandPreBuilder<M, S, Args> {
    return new CommandPreBuilder(state, name, arbitraries, precondition)
  }

  run(fn: (args: Args, model: M, sut: S) => unknown): CommandPostBuilder<M, S, Args> {
    return CommandPostBuilder.create(
      this.state,
      this.commandName,
      this.arbitraries,
      this.precondition,
      fn
    )
  }
}

class CommandPostBuilder<M, S, Args extends Record<string, unknown>> {
  protected constructor(
    protected readonly state: BuilderState<M, S>,
    protected readonly commandName: string,
    protected readonly arbitraries: Record<string, Arbitrary<unknown>>,
    protected readonly precondition: ((model: M) => boolean) | undefined,
    protected readonly runFn: (args: Args, model: M, sut: S) => unknown
  ) {}

  static create<M, S, Args extends Record<string, unknown>>(
    state: BuilderState<M, S>,
    name: string,
    arbitraries: Record<string, Arbitrary<unknown>>,
    precondition: ((model: M) => boolean) | undefined,
    runFn: (args: Args, model: M, sut: S) => unknown
  ): CommandPostBuilder<M, S, Args> {
    return new CommandPostBuilder(state, name, arbitraries, precondition, runFn)
  }

  post(predicate: (args: Args, model: M, sut: S, result: unknown) => boolean): StatefulBuilder<M, S> {
    return this.buildAndContinue(predicate)
  }

  command(name: string): CommandNameBuilder<M, S> {
    return CommandNameBuilder.create(this.buildAndContinue(undefined).getState(), name)
  }

  invariant(predicate: Invariant<M, S>): StatefulBuilder<M, S> {
    const builder = this.buildAndContinue(undefined)
    return builder.invariant(predicate)
  }

  check(config?: StatefulCheckConfig): StatefulResult<M, S> {
    return this.buildAndContinue(undefined).check(config)
  }

  private buildAndContinue(
    postcondition: ((args: Args, model: M, sut: S, result: unknown) => boolean) | undefined
  ): StatefulBuilder<M, S> {
    const storedCommand = this.buildStoredCommand(postcondition)
    return StatefulBuilder.fromState(withCommand(this.state, storedCommand))
  }

  private buildStoredCommand(
    postcondition: ((args: Args, model: M, sut: S, result: unknown) => boolean) | undefined
  ): StoredCommand<M, S> {
    const runFn = this.runFn
    const postFn = postcondition

    return {
      name: this.commandName,
      arbitraries: this.arbitraries,
      precondition: this.precondition,
      execute: (args, model, sut) => runFn(args as Args, model, sut),
      postcondition: postFn !== undefined
        ? (args, model, sut, result) => postFn(args as Args, model, sut, result)
        : undefined
    }
  }
}

export class StatefulBuilder<M, S> {
  protected constructor(
    protected readonly state: BuilderState<M, S>
  ) {}

  static create<M, S>(): StatefulBuilder<M, S> {
    return new StatefulBuilder(emptyBuilderState<M, S>())
  }

  static fromState<M, S>(state: BuilderState<M, S>): StatefulBuilder<M, S> {
    return new StatefulBuilder(state)
  }

  getState(): BuilderState<M, S> {
    return this.state
  }

  model(factory: () => M): StatefulBuilder<M, S> {
    return new StatefulBuilder(withModelFactory(this.state, factory))
  }

  sut(factory: () => S): StatefulBuilder<M, S> {
    return new StatefulBuilder(withSutFactory(this.state, factory))
  }

  command(name: string): CommandNameBuilder<M, S> {
    return CommandNameBuilder.create(this.state, name)
  }

  invariant(predicate: Invariant<M, S>): StatefulBuilder<M, S> {
    return new StatefulBuilder(withInvariant(this.state, predicate))
  }

  check(config?: StatefulCheckConfig): StatefulResult<M, S> {
    if (this.state.modelFactory === undefined) {
      throw new Error('Stateful test requires a model factory')
    }
    if (this.state.sutFactory === undefined) {
      throw new Error('Stateful test requires a SUT factory')
    }
    if (this.state.commands.length === 0) {
      throw new Error('Stateful test requires at least one command')
    }

    return runStatefulCheck(
      {
        modelFactory: this.state.modelFactory,
        sutFactory: this.state.sutFactory,
        commands: this.state.commands,
        invariants: this.state.invariants
      },
      config ?? {}
    )
  }
}

export function stateful<M, S>(): StatefulBuilder<M, S> {
  return StatefulBuilder.create<M, S>()
}

export {CommandNameBuilder as CommandBuilder}
export {CommandPostBuilder as PostBuilder}
