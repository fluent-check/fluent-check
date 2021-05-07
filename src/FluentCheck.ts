import {Arbitrary, ArbitraryCoverage, FluentPick, FluentRandomGenerator,
  IndexCollection, PrintInfo, ScenarioCoverage, ValueResult, TestCases} from './arbitraries'
import {FluentStatistician} from './statistics/FluentStatistician'
import {FluentStatisticianFactory} from './statistics/FluentStatisticianFactory'
import {FluentStrategy} from './strategies/FluentStrategy'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory'
import now from 'performance-now'

type WrapFluentPick<T> = { [P in keyof T]: FluentPick<T[P]> }
type PickResult<V> = Record<string, FluentPick<V>>

export class FluentResult {
  constructor(
    public readonly satisfiable = false,
    public example: PickResult<any> = {},
    public readonly seed?: number,
    public readonly execTime?: string,
    public readonly withTestCaseOutput: boolean = false,
    public readonly withInputSpaceCoverage: boolean = false,
    public readonly withOutputOnSuccess: boolean = false,
    public readonly withGraphs: boolean = false,
    public readonly csvPath?: string,
    public readonly testCases: PrintInfo = {unwrapped: [], time: [], result: []},
    public readonly coverages: [ScenarioCoverage, ArbitraryCoverage] = [0, {}],
    public readonly indexesForGraphs: IndexCollection = {oneD: [], twoD: []}) {}

  addExample<A>(name: string, value: FluentPick<A>) {
    this.example[name] = value
  }
}

export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  protected readonly startInstant

  constructor(public strategy: FluentStrategy = new FluentStrategyFactory().defaultStrategy().build(),
    public statistician: FluentStatistician = new FluentStatisticianFactory().build(),
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined) {
    this.parent === undefined ?
      this.startInstant = now() : this.strategy.randomGenerator = this.parent.strategy.randomGenerator
    this.strategy.statConfiguration = this.statistician.configuration
    this.statistician.arbitraries = this.strategy.arbitraries
  }

  config(strategy: FluentStrategyFactory) {
    this.strategy = strategy.build()
    this.statistician.arbitraries = this.strategy.arbitraries
    return this
  }

  configStatistics(statistician: FluentStatisticianFactory) {
    this.statistician = statistician.build()
    this.strategy.statConfiguration = this.statistician.configuration
    return this
  }

  given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec> {
    return v instanceof Function ?
      new FluentCheckGivenMutable(this, name, v, this.strategy, this.statistician) :
      new FluentCheckGivenConstant<K, V, Rec & Record<K, V>, Rec>(this, name, v, this.strategy, this.statistician)
  }

  when(f: (givens: Rec) => void): FluentCheckWhen<Rec, ParentRec> {
    return new FluentCheckWhen(this, f, this.strategy, this.statistician)
  }

  forall<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckUniversal(this, name, a, this.strategy, this.statistician)
  }

  exists<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckExistential(this, name, a, this.strategy, this.statistician)
  }

  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec> {
    return new FluentCheckAssert(this, f, this.strategy, this.statistician)
  }

  withGenerator(generator: (seed: number) => () => number, seed?: number): FluentCheckGenerator<Rec, ParentRec> {
    return new FluentCheckGenerator(this, generator, this.strategy, this.statistician, seed)
  }

  protected run(
    testCase: WrapFluentPick<Rec> | Rec,
    callback: (arg: WrapFluentPick<Rec> | Rec) => FluentResult,
    _: TestCases): FluentResult {

    return callback(testCase)
  }

  protected pathFromRoot(): FluentCheck<any, any>[] {
    return this.parent !== undefined ? [...this.parent.pathFromRoot(), this] : [this]
  }

  check(child: (testCase: WrapFluentPick<any>) => FluentResult = () => new FluentResult(true),
    testCases: TestCases = {wrapped: [], unwrapped: [], time: [], result: []}): FluentResult {
    if (this.parent !== undefined) return this.parent.check(testCase => this.run(testCase, child, testCases), testCases)
    else {
      this.strategy.randomGenerator.initialize()
      const r = this.run({} as Rec, child, testCases)

      return new FluentResult(
        r.satisfiable,
        FluentCheck.unwrapFluentPick(r.example),
        this.strategy.randomGenerator.seed,
        (now() - this.startInstant).toFixed(5),
        this.statistician.reporterConfiguration.withTestCaseOutput,
        this.statistician.reporterConfiguration.withInputSpaceCoverage,
        this.statistician.reporterConfiguration.withOutputOnSuccess,
        this.statistician.reporterConfiguration.withGraphs,
        this.statistician.reporterConfiguration.csvPath,
        testCases,
        this.statistician.reporterConfiguration.withInputSpaceCoverage ?
          this.statistician.calculateCoverages(new Set(testCases.unwrapped.map(x=>JSON.stringify(x))).size) : undefined,
        this.statistician.reporterConfiguration.withGraphs ?
          this.statistician.calculateIndexes(testCases) : undefined
      )
    }
  }

  static unwrapFluentPickOriginal<T>(testCase: PickResult<T>): ValueResult<number | number[]> {
    const result = {}
    for (const k in testCase) result[k] = testCase[k].original
    return result
  }

  static unwrapFluentPick<T>(testCase: PickResult<T>): ValueResult<T> {
    const result = {}
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
    strategy: FluentStrategy,
    statistician: FluentStatistician) {

    super(strategy, statistician, parent)
  }

  and(f: (givens: Rec) => void) { return this.when(f) }
}

abstract class FluentCheckGiven<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    strategy: FluentStrategy,
    statistician: FluentStatistician) {

    super(strategy, statistician, parent)
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
    strategy: FluentStrategy,
    statistician: FluentStatistician) {

    super(parent, name, strategy, statistician)
  }
}

class FluentCheckGivenConstant<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheckGiven<K, V, Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly value: V,
    strategy: FluentStrategy,
    statistician: FluentStatistician) {

    super(parent, name, strategy, statistician)
  }

  protected run(testCase: Rec, callback: (arg: Rec) => FluentResult) {
    testCase[this.name as string] = this.value
    return callback(testCase)
  }
}

abstract class FluentCheckQuantifier<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly a: Arbitrary<A>,
    strategy: FluentStrategy,
    statistician: FluentStatistician) {

    super(strategy, statistician, parent)
    this.strategy.addArbitrary(this.name, a)
  }

  protected run(
    testCase: WrapFluentPick<Rec>,
    callback: (arg: WrapFluentPick<Rec>) => FluentResult,
    testCases: TestCases,
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
    strategy: FluentStrategy,
    statistician: FluentStatistician) {

    super(strategy, statistician, parent)
    this.preliminaries = this.pathFromRoot().filter(node =>
      node instanceof FluentCheckGivenMutable ||
      node instanceof FluentCheckWhen)
  }

  and(assertion: (args: Rec) => boolean) {
    return this.then(assertion)
  }

  private runPreliminaries<T>(testCase: ValueResult<T>): Rec {
    const data = { } as Rec

    this.preliminaries.forEach(node => {
      if (node instanceof FluentCheckGivenMutable) data[node.name] = node.factory({...testCase, ...data})
      else if (node instanceof FluentCheckWhen) node.f({...testCase, ...data})
    })

    return data
  }

  protected run(testCase: WrapFluentPick<Rec>,
    callback: (arg: WrapFluentPick<Rec>) => FluentResult,
    testCases: TestCases): FluentResult {
    const unwrappedTestCase = FluentCheck.unwrapFluentPick(testCase)

    let result
    if (this.statistician.configuration.gatherTestCases) {
      testCases.wrapped.push({...testCase})
      testCases.unwrapped.push(unwrappedTestCase)
      const start = now()
      result = this.assertion({...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase)} as Rec)
      testCases.time.push(now() - start)
      testCases.result.push(result)
    } else
      result = this.assertion({...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase)} as Rec)
    return result === true ? callback(testCase) : new FluentResult(false)
  }
}

class FluentCheckGenerator<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    rngBuilder: (seed: number) => () => number,
    strategy: FluentStrategy,
    statistician: FluentStatistician,
    seed?: number
  ) {
    super(strategy, statistician, parent)

    this.setRandomGenerator(new FluentRandomGenerator(rngBuilder, seed))
  }
}
