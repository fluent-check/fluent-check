import {Arbitrary, FluentPick} from './arbitraries'
import {FluentStrategy} from './strategies/FluentStrategy'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory'

type WrapFluentPick<T> = { [P in keyof T]: FluentPick<T[P]> }
type PickResult<V> = Record<string, FluentPick<V>>
type ValueResult<V> = Record<string, V>

class FluentResult {
  constructor(public readonly satisfiable = false, public example: ValueResult<any> = {}) { }

  addExample<A>(name: string, value: FluentPick<A>) {
    this.example[name] = value
  }
}

export type FluentConfig = { sampleSize: number, shrinkSize: number }

export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {

  constructor(public strategy: FluentStrategy = new FluentStrategyFactory().defaultStrategy().build(),
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined) {
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

  protected run(
    testCase: WrapFluentPick<Rec> | Rec,
    callback: (arg: WrapFluentPick<Rec> | Rec) => FluentResult): FluentResult {

    return callback(testCase)
  }

  protected pathFromRoot(): FluentCheck<any, any>[] {
    return this.parent !== undefined ? [...this.parent.pathFromRoot(), this] : [this]
  }

  check(child: (testCase: WrapFluentPick<any>) => FluentResult = () => new FluentResult(true)): FluentResult {
    if (this.parent !== undefined) return this.parent.check(testCase => this.run(testCase, child))
    else {
      const r = this.run({} as WrapFluentPick<Rec>, child)
      return new FluentResult(r.satisfiable, FluentCheck.unwrapFluentPick(r.example))
    }
  }

  static unwrapFluentPick<T>(testCase: PickResult<T>): ValueResult<T> {
    const result = {} as ValueResult<T>
    for (const k in testCase) result[k] = testCase[k].value
    return result
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
    strategy: FluentStrategy) {

    super(strategy, parent)
    this.strategy.addArbitrary(this.name, a)
  }

  protected run(
    testCase: WrapFluentPick<Rec>,
    callback: (arg: WrapFluentPick<Rec>) => FluentResult,
    partial: FluentResult | undefined = undefined,
    depth = 0): FluentResult {

    this.strategy.configArbitrary(this.name, partial, depth)

    while (this.strategy.hasInput(this.name)) {
      testCase[this.name] = this.strategy.getInput(this.name)
      const result = callback(testCase)
      if (result.satisfiable === this.breakValue) {
        result.addExample(this.name, testCase[this.name])
        return this.run(testCase, callback, result, depth + 1)
      }
    }

    return partial || new FluentResult(!this.breakValue)
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

  private runPreliminaries<T>(testCase: ValueResult<T>): Rec {
    const data = { } as Rec

    this.preliminaries.forEach(node => {
      if (node instanceof FluentCheckGivenMutable) data[node.name] = node.factory({...testCase, ...data})
      else if (node instanceof FluentCheckWhen) node.f({...testCase, ...data})
    })

    return data
  }

  protected run(testCase: WrapFluentPick<Rec>,
    callback: (arg: WrapFluentPick<Rec>) => FluentResult): FluentResult {
    const unwrappedTestCase = FluentCheck.unwrapFluentPick(testCase)
    return this.assertion({...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase)} as Rec) ?
      callback(testCase) :
      new FluentResult(false)
  }
}
