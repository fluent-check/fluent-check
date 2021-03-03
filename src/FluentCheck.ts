import {Arbitrary, FluentPick} from './arbitraries'
import {FluentStrategy} from './strategies/FluentStrategy'
import * as Strategies from './strategies/index'

type UnwrapFluentPick<T> = { [P in keyof T]: T[P] extends FluentPick<infer E> ? E : T[P] }
type WrapFluentPick<T> = { [P in keyof T]: FluentPick<T[P]> }

type FluentPicks = Record<string, FluentPick<any> | any>

export class FluentResult {
  constructor(public readonly satisfiable = false, public example: FluentPicks = {}) { }

  addExample<A>(name: string, value: FluentPick<A>) {
    this.example[name] = value
  }
}

export type FluentConfig = { sampleSize?: number, shrinkSize?: number }

export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {

  constructor(protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined,
    public readonly configuration: FluentConfig = {sampleSize: 1000, shrinkSize: 500},
    public strategy = new Strategies.BiasedRandomCachedStrategyWithShrinking({sampleSize: 1000, shrinkSize: 500})) {
  }

  config(config: FluentConfig) {
    for (const k in config) this.configuration[k] = config[k]
    return this
  }

  given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec> {
    return (v instanceof Function) ?
      new FluentCheckGivenMutable(this, name, v, this.configuration, this.strategy) :
      new FluentCheckGivenConstant<K, V, Rec & Record<K, V>, Rec>(this, name, v, this.configuration, this.strategy)
  }

  when(f: (givens: Rec) => void): FluentCheckWhen<Rec, ParentRec> {
    return new FluentCheckWhen(this, f, this.configuration, this.strategy)
  }

  forall<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckUniversal(this, name, a, this.configuration, this.strategy)
  }

  exists<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckExistential(this, name, a, this.configuration, this.strategy)
  }

  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec> {
    return new FluentCheckAssert(this, f, this.configuration, this.strategy)
  }

  protected run(
    testCase: FluentPicks,
    callback: (arg: FluentPicks) => FluentResult,
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

  check(child: (testCase: FluentPicks) => FluentResult = () => new FluentResult(true)): FluentResult {
    if (this.parent !== undefined) return this.parent.check(testCase => this.run(testCase, child))
    else {
      const r = this.run({}, child)
      return new FluentResult(r.satisfiable, FluentCheck.unwrapFluentPick(r.example))
    }
  }

  static unwrapFluentPick<F extends FluentPicks>(testCase: F): UnwrapFluentPick<F> {
    const result: any = {}
    for (const k in testCase) result[k] = testCase[k].value
    return result
  }
}

class FluentCheckWhen<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly f: (givens: Rec) => void,
    config: FluentConfig,
    strategy: any) {

    super(parent, config, strategy)
  }

  and(f: (givens: Rec) => void) { return this.when(f) }
}

abstract class FluentCheckGiven<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    config: FluentConfig,
    strategy: any) {

    super(parent, config, strategy)
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
    config: FluentConfig,
    strategy: FluentStrategy) {

    super(parent, name, config, strategy)
  }
}

class FluentCheckGivenConstant<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheckGiven<K, V, Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly value: V,
    config: FluentConfig,
    strategy: FluentStrategy) {

    super(parent, name, config, strategy)
  }

  protected run(testCase: FluentPicks, callback: (arg: FluentPicks) => FluentResult) {
    testCase[this.name] = this.value
    return callback(testCase)
  }
}

class FluentCheckUniversal<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly a: Arbitrary<A>,
    config: FluentConfig,
    strategy: any) {

    super(parent, config, strategy)
    this.strategy.addArbitrary(this.name, a.unique())
  }

  protected run(
    testCase: FluentPicks,
    callback: (arg: FluentPicks) => FluentResult,
    partial: FluentResult | undefined = undefined,
    depth = 0): FluentResult {

    this.strategy.configArbitrary(this.name, partial, depth)

    while (this.strategy.hasInput(this.name)) {
      testCase[this.name] = this.strategy.getInput()
      const result = callback(testCase)
      if (!result.satisfiable) {
        result.addExample(this.name, testCase[this.name])
        return this.run(testCase, callback, result, depth + 1)
      }
    }

    return partial || new FluentResult(true)
  }
}

class FluentCheckExistential<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly a: Arbitrary<A>,
    config: FluentConfig,
    strategy: any) {

    super(parent, config, strategy)
    this.strategy.addArbitrary(this.name, a.unique())
  }

  protected run(
    testCase: FluentPicks,
    callback: (arg: FluentPicks) => FluentResult,
    partial: FluentResult | undefined = undefined,
    depth = 0): FluentResult {

    this.strategy.configArbitrary(this.name, partial, depth)

    while (this.strategy.hasInput(this.name)) {
      testCase[this.name] = this.strategy.getInput()
      const result = callback(testCase)
      if (result.satisfiable) {
        result.addExample(this.name, testCase[this.name])
        return this.run(testCase, callback, result, depth + 1)
      }
    }

    return partial || new FluentResult(false)
  }
}

class FluentCheckAssert<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  preliminaries: FluentCheck<unknown, any>[]

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly assertion: (args: Rec) => boolean,
    config: FluentConfig,
    strategy: any) {

    super(parent, config, strategy)
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

  protected run(testCase: FluentPicks, callback: (arg: FluentPicks) => FluentResult) {
    const unwrappedTestCase = FluentCheck.unwrapFluentPick(testCase)
    return this.assertion({...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase)} as Rec) ?
      callback(testCase) :
      new FluentResult(false)
  }
}
