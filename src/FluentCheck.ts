import {Arbitrary, FluentPick, FluentRandomGenerator} from './arbitraries'
import {FluentStrategy} from './strategies/FluentStrategy'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory'

type UnwrapFluentPick<T> = { [P in keyof T]: T[P] extends FluentPick<infer E> ? E : T[P] }
type WrapFluentPick<T> = { [P in keyof T]: FluentPick<T[P]> }

type FluentPicks = Record<string, FluentPick<any> | any>

export class FluentResult {
  constructor(
    public readonly satisfiable = false,
    public example: FluentPicks = {},
    public readonly seed?: number,
    public readonly withTestCaseOutput: boolean = false,
    public readonly testCases: UnwrapFluentPick<FluentPicks>[] = []) {}

  addExample<A>(name: string, value: FluentPick<A>) {
    this.example[name] = value
  }
}

export type FluentConfig = {sampleSize?: number, shrinkSize?: number, withTestCaseOutput: boolean}

export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  constructor(public strategy: FluentStrategy = new FluentStrategyFactory().defaultStrategy().build(),
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined) {
    if (this.parent !== undefined) this.strategy.randomGenerator = this.parent.strategy.randomGenerator
  }

  config(strategy: FluentStrategyFactory) {
    this.strategy = strategy.build()
    return this
  }

  given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec> {
    return (v instanceof Function) ?
      new FluentCheckGivenMutable(this, name, v, this.strategy) :
      new FluentCheckGivenConstant<K, V, Rec & Record<K, V>, Rec>(this, name, v, this.strategy)
  }

  when(f: (givens: Rec) => void): FluentCheckWhen<Rec, ParentRec> {
    return new FluentCheckWhen(this, f, this.strategy)
  }

  forall<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckUniversal(this, name, a, this.strategy)
  }

  exists<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckExistential(this, name, a, this.strategy)
  }

  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec> {
    return new FluentCheckAssert(this, f, this.strategy)
  }

  withGenerator(generator: (seed: number) => () => number, seed?: number): FluentCheckGenerator<Rec, ParentRec> {
    return new FluentCheckGenerator(this, generator, this.strategy, seed)
  }

  protected run(
    testCase: FluentPicks,
    callback: (arg: FluentPicks) => FluentResult,
    testCases: UnwrapFluentPick<FluentPicks>[],
    _partial: FluentResult | undefined = undefined): FluentResult {

    return callback(testCase)
  }

  protected pathFromRoot() {
    const path: FluentCheck<any, any>[] = []

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: FluentCheck<any, any> | undefined = this
    do {
      path.unshift(node)
      node = node.parent
    } while (node !== undefined)
    return path
  }

  protected pathToRoot() {
    return this.pathFromRoot().reverse()
  }

  check(child: (testCase: FluentPicks) => FluentResult = () => new FluentResult(true),
    testCases: UnwrapFluentPick<FluentPicks>[] = []): FluentResult {
    if (this.parent !== undefined) return this.parent.check(testCase => this.run(testCase, child, testCases), testCases)
    else {
      this.strategy.randomGenerator.initialize()
      const r = this.run({}, child, testCases)
      return new FluentResult(
        r.satisfiable,
        FluentCheck.unwrapFluentPick(r.example),
        this.strategy.randomGenerator.seed,
        this.strategy.configuration.withTestCaseOutput,
        testCases
      )
    }
  }

  static unwrapFluentPick<F extends FluentPicks>(testCase: F): UnwrapFluentPick<F> {
    const result: any = {}
    for (const k in testCase) result[k] = testCase[k].value
    return result
  }

  setRandomGenerator(prng: FluentRandomGenerator) {
    this.strategy.randomGenerator = prng
    this.parent?.setRandomGenerator(prng)
  }
}

class FluentCheckWhen<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly f: (givens: Rec) => void,
    strategy: FluentStrategy) {

    super(strategy, parent)
  }

  and(f: (givens: Rec) => void) { return this.when(f) }
}

abstract class FluentCheckGiven<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    strategy: FluentStrategy) {

    super(strategy, parent)
  }

  and<NK extends string, V>(name: NK, f: ((args: Rec) => V) | V) {
    return super.given(name, f)
  }
}

class FluentCheckGivenMutable<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheckGiven<K, V, Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly factory: (args: ParentRec) => V,
    strategy: FluentStrategy) {

    super(parent, name, strategy)
  }
}

class FluentCheckGivenConstant<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheckGiven<K, V, Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly value: V,
    strategy: FluentStrategy) {

    super(parent, name, strategy)
  }

  protected run(testCase: FluentPicks, callback: (arg: FluentPicks) => FluentResult) {
    testCase[this.name] = this.value
    return callback(testCase)
  }
}

abstract class FluentCheckQuantifier<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly a: Arbitrary<A>,
    strategy: FluentStrategy) {

    super(strategy, parent)
    this.strategy.addArbitrary(this.name, a)
  }

  protected run(
    testCase: FluentPicks,
    callback: (arg: FluentPicks) => FluentResult,
    testCases: UnwrapFluentPick<FluentPicks>[],
    partial: FluentResult | undefined = undefined,
    depth = 0): FluentResult {

    this.strategy.configArbitrary(this.name, partial, depth)

    while (this.strategy.hasInput(this.name)) {
      testCase[this.name] = this.strategy.getInput(this.name)
      const result = callback(testCase)
      if (result.satisfiable === this.breakValue) {
        result.addExample(this.name, testCase[this.name])
        return this.run(testCase, callback, testCases, result, depth + 1)
      }
    }

    return partial ?? new FluentResult(!this.breakValue)
  }

  abstract breakValue: boolean
}

class FluentCheckUniversal<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheckQuantifier<K, A, Rec, ParentRec> {
  breakValue = false
}

class FluentCheckExistential<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheckQuantifier<K, A, Rec, ParentRec> {
  breakValue = true
}

class FluentCheckAssert<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  preliminaries: FluentCheck<unknown, any>[]

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly assertion: (args: Rec) => boolean,
    strategy: FluentStrategy) {

    super(strategy, parent)
    this.preliminaries = this.pathFromRoot().filter(node =>
      (node instanceof FluentCheckGivenMutable) ||
      (node instanceof FluentCheckWhen))
  }

  and(assertion: (args: Rec) => boolean) {
    return this.then(assertion)
  }

  private runPreliminaries(testCase: FluentPicks): FluentPicks {
    const data = { }

    this.preliminaries.forEach(node => {
      if (node instanceof FluentCheckGivenMutable) data[node.name] = node.factory({...testCase, ...data})
      else if (node instanceof FluentCheckWhen) node.f({...testCase, ...data})
    })

    return data
  }

  protected run(
    testCase: FluentPicks,
    callback: (arg: FluentPicks) => FluentResult,
    testCases: UnwrapFluentPick<FluentPicks>[]
  ) {
    const unwrappedTestCase = FluentCheck.unwrapFluentPick(testCase)
    if (this.strategy.configuration.withTestCaseOutput)
      testCases.push(unwrappedTestCase)
    return this.assertion({...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase)} as Rec) ?
      callback(testCase) :
      new FluentResult(false)
  }
}

class FluentCheckGenerator<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    readonly rngBuilder: (seed: number) => () => number,
    strategy: FluentStrategy,
    readonly seed?: number
  ) {
    super(strategy, parent)

    this.setRandomGenerator(new FluentRandomGenerator(rngBuilder, seed))
  }
}
