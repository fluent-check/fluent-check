import {Arbitrary, FluentPick, PrngInfo} from './arbitraries'

type UnwrapFluentPick<T> = { [P in keyof T]: T[P] extends FluentPick<infer E> ? E : T[P] }
type WrapFluentPick<T> = { [P in keyof T]: FluentPick<T[P]> }

type FluentPicks = Record<string, FluentPick<any> | any>

class FluentResult {
  constructor(public readonly satisfiable = false, public example: FluentPicks = {}, public readonly seed?: string) { }

  addExample<A>(name: string, value: FluentPick<A>) {
    this.example[name] = value
  }
}

export type FluentConfig = { sampleSize?: number, shrinkSize?: number}

export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  public prng: PrngInfo

  constructor(public strategy: FluentStrategy = new FluentStrategyFactory().defaultStrategy().build(),
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined) {
    if (this.parent === undefined)
      this.prng = {generator: Math.random, seed: undefined}
    else
      this.prng = this.parent.prng
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
    return new FluentCheckGenerator(this, this.configuration, generator, seed)
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
      return new FluentResult(r.satisfiable, FluentCheck.unwrapFluentPick(r.example),
        this.prng.seed === undefined ? 'unseeded' : this.prng.seed.toString())
    }
  }

  static unwrapFluentPick<F extends FluentPicks>(testCase: F): UnwrapFluentPick<F> {
    const result: any = {}
    for (const k in testCase) result[k] = testCase[k].value
    return result
  }

  setPrng(prng: PrngInfo): void { this.prng = prng }
  getCache(): Array<FluentPick<any>> { return [] }
}

class FluentCheckWhen<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(
    readonly parent: FluentCheck<ParentRec, any>,
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
    readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly factory: (args: ParentRec) => V,
    strategy: FluentStrategy) {

    super(parent, name, strategy)
  }
}

class FluentCheckGivenConstant<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheckGiven<K, V, Rec, ParentRec> {

  constructor(
    readonly parent: FluentCheck<ParentRec, any>,
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
    readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly a: Arbitrary<A>,
    strategy: FluentStrategy) {

    super(strategy, parent)
    this.strategy.addArbitrary(this.name, a)
  }

  protected run(
    testCase: FluentPicks,
    callback: (arg: FluentPicks) => FluentResult,
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

  getCache(): Array<FluentPick<A>> {
    return this.cache
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
    readonly parent: FluentCheck<ParentRec, any>,
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

  protected run(testCase: FluentPicks, callback: (arg: FluentPicks) => FluentResult) {
    const unwrappedTestCase = FluentCheck.unwrapFluentPick(testCase)
    return this.assertion({...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase)} as Rec) ?
      callback(testCase) :
      new FluentResult(false)
  }
}

class FluentCheckGenerator<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(
    readonly parent: FluentCheck<ParentRec, any>,
    config: FluentConfig,
    readonly generator: (seed: number) => () => number,
    readonly seed?: number
  ) {
    super(parent, config)
    if (seed !== undefined)
      this.prng.seed = seed
    else
      this.prng.seed = Math.floor(Math.random() * 0x100000000)
    this.prng.generator = generator(this.prng.seed)
    let p: FluentCheck<ParentRec, any> | undefined = this.parent
    while (p !== undefined) {
      p.setPrng(this.prng)
      p = p.parent
    }
  }
}
