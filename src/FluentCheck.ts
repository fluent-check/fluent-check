import {Arbitrary, FluentPick} from './arbitraries'

type UnwrapFluentPick<T> = { [P in keyof T]: T[P] extends FluentPick<infer E> ? E : T[P] }
type WrapFluentPick<T> = { [P in keyof T]: FluentPick<T[P]> }

type FluentPicks = Record<string, FluentPick<any> | any>

class FluentResult {
  constructor(public readonly satisfiable = false, public example: FluentPicks = {}) { }

  addExample<A>(name: string, value: FluentPick<A>) {
    this.example[name] = value
  }
}

export type FluentConfig = { sampleSize?: number, shrinkSize?: number }

export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  constructor(protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined,
    public readonly configuration: FluentConfig = {sampleSize: 1000, shrinkSize: 500}) {
  }

  config(config: FluentConfig) {
    for (const k in config) this.configuration[k] = config[k]
    return this
  }

  given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec> {
    return (v instanceof Function) ?
      new FluentCheckGivenMutable(this, name, v, this.configuration) :
      new FluentCheckGivenConstant<K, V, Rec & Record<K, V>, Rec>(this, name, v, this.configuration)
  }

  when(f: (givens: Rec) => void): FluentCheckWhen<Rec, ParentRec> {
    return new FluentCheckWhen(this, f, this.configuration)
  }

  forall<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckUniversal(this, name, a, this.configuration)
  }

  exists<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckExistential(this, name, a, this.configuration)
  }

  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec> {
    return new FluentCheckAssert(this, f, this.configuration)
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
    config: FluentConfig) {

    super(parent, config)
  }

  and(f: (givens: Rec) => void) { return this.when(f) }
}

abstract class FluentCheckGiven<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  constructor(protected readonly parent: FluentCheck<ParentRec, any>, public readonly name: K, config: FluentConfig) {
    super(parent, config)
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
    config: FluentConfig) {

    super(parent, name, config)
  }
}

class FluentCheckGivenConstant<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheckGiven<K, V, Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly value: V,
    config: FluentConfig) {

    super(parent, name, config)
  }

  protected run(testCase: FluentPicks, callback: (arg: FluentPicks) => FluentResult) {
    testCase[this.name] = this.value
    return callback(testCase)
  }
}

abstract class FluentCheckQuantifier<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  private cache: Array<FluentPick<A>>

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly a: Arbitrary<A>,
    config: FluentConfig) {

    super(parent, config)
    this.cache = this.a.sampleWithoutReplacementWithBias(this.configuration.sampleSize)
  }

  protected run(
    testCase: FluentPicks,
    callback: (arg: FluentPicks) => FluentResult,
    partial: FluentResult | undefined = undefined,
    depth = 0): FluentResult {

    const example = partial || new FluentResult(!this.breakValue)

    const collection = depth === 0 ?
      this.cache :
      (partial !== undefined ?
        this.a.shrink(partial.example[this.name]).sampleWithoutReplacementWithBias(this.configuration.shrinkSize) :
        [])

    for (const tp of collection) {
      testCase[this.name] = tp
      const result = callback(testCase)
      if (result.satisfiable === this.breakValue) {
        result.addExample(this.name, tp)
        return this.run(testCase, callback, result, depth + 1)
      }
    }

    return example
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
    config: FluentConfig) {

    super(parent, config)
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
    return (this.assertion({...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase)} as Rec)) ?
      callback(testCase) :
      new FluentResult(false)
  }
}
