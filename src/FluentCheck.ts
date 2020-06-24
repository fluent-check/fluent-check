import { Arbitrary, FluentPick, FluentSample } from './arbitraries'

type TestCase = { [k: string]: any }
type FluentPicks = { [k: string]: FluentPick<any> }

class FluentResult {
  constructor(
    public readonly satisfiable = false,
    public example: TestCase = {},
    public confidence: number = 0.0) {}

  addExample<A>(name: string, value: A) {
    this.example[name] = value
    return this
  }
}

export class FluentCheck<G extends TestCase, P extends TestCase> {
  constructor(protected readonly parent: FluentCheck<P, any> | undefined = undefined) { }

  given<NK extends string, V>(name: NK, a: (args: G) => V): FluentCheckGivenMutable<NK, V, G, G & Record<NK, V>>
  given<NK extends string, V>(name: NK, a: V): FluentCheckGivenMutable<NK, V, G, G & Record<NK, V>> | FluentCheckGivenConstant<NK, V, G, G & Record<NK, V>> {
    return (a instanceof Function) ?
      new FluentCheckGivenMutable(this, name, a as unknown as (args: G) => V) :
      new FluentCheckGivenConstant(this, name, a)
  }

  when(f: (givens: G) => void): FluentCheckWhen<G, P> {
    return new FluentCheckWhen(this, f)
  }

  forall<NK extends string, A>(name: NK, a: Arbitrary<A>): FluentCheckUniversal<NK, A, G, G & Record<NK, A>> {
    return new FluentCheckUniversal(this, name, a)
  }

  exists<NK extends string, A>(name: NK, a: Arbitrary<A>): FluentCheckExistential<NK, A, G, G & Record<NK, A>> {
    return new FluentCheckExistential(this, name, a)
  }

  then(f: (arg: G) => boolean): FluentCheckAssert<G, P> {
    return new FluentCheckAssert(this, f)
  }

  protected run(testCase: G, callback: (arg: TestCase) => FluentResult, _partial: FluentResult | undefined = undefined): FluentResult {
    return callback(testCase)
  }

  protected pathFromRoot() {
    const path: FluentCheck<any, any>[] = []

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: FluentCheck<any, any> | undefined = this
    while (node !== undefined) {
      path.unshift(node)
      node = node.parent
    }
    return path
  }

  protected pathToRoot() {
    return this.pathFromRoot().reverse()
  }

  check(child: (testCase: TestCase) => FluentResult = () => new FluentResult(true)): FluentResult {
    if (this.parent !== undefined) return this.parent.check((testCase: TestCase) => this.run(testCase as G, child))
    else {
      const r = this.run({} as G, child)
      return new FluentResult(r.satisfiable, FluentCheck.unwrapFluentPick(r.example), r.confidence)
    }
  }

  static unwrapFluentPick(testCase: FluentPicks): TestCase {
    const result: TestCase = {}
    for (const k in testCase)
      result[k] = testCase[k].value
    return result
  }
}

class FluentCheckWhen<G extends TestCase, P extends TestCase> extends FluentCheck<G, P> {
  constructor(protected readonly parent: FluentCheck<P, any>, public readonly f: (givens: G) => void) {
    super(parent)
  }

  and(f: (givens: G) => void) { return this.when(f) }
}

class FluentCheckGivenMutable<K extends string, V, P extends TestCase, G extends P & Record<K, V>> extends FluentCheck<G, P> {
  constructor(protected readonly parent: FluentCheck<P, any>, public readonly name: K, public readonly factory: (args: P) => V) {
    super(parent)
  }

  and<NK extends string, NV>(name: NK, a: (args: G) => NV) { return this.given(name, a) }
}

class FluentCheckGivenConstant<K extends string, V, P extends TestCase, G extends P & Record<K, V>> extends FluentCheck<G, P> {
  constructor(protected readonly parent: FluentCheck<P, any>, public readonly name: K, public readonly value: V) {
    super(parent)
  }

  and<NK extends string, NV>(name: NK, a: (args: G) => NV) { return this.given(name, a) }

  protected run(testCase: TestCase, callback: (arg: TestCase) => FluentResult) {
    testCase[this.name] = this.value
    return callback(testCase)
  }
}

class FluentCheckUniversal<K extends string, A, P extends TestCase, G extends P & Record<K, A>> extends FluentCheck<G, P> {
  private cache: FluentSample<A>
  private dedup: Arbitrary<A>

  constructor(protected readonly parent: FluentCheck<P, any>, public readonly name: K, public readonly a: Arbitrary<A>) {
    super(parent)
    this.dedup = a.unique()
    this.cache = this.dedup.sampleWithBias(1000)
  }

  protected run(testCase: TestCase, callback: (arg: TestCase) => FluentResult, partial: FluentResult | undefined = undefined): FluentResult {
    const sample = partial === undefined ?
      this.cache :
      this.dedup.shrink(partial.example[this.name]).sampleWithBias(1000)

    for (const tp of sample.items) {
      testCase[this.name] = tp
      const result = callback(testCase)
      if (!result.satisfiable) {
        result.addExample(this.name, tp)
        return this.run(testCase, callback, result)
      }
    }

    return partial || new FluentResult(true, {}, sample.confidence)
  }
}

class FluentCheckExistential<K extends string, A, P extends TestCase, G extends P & Record<K, A>> extends FluentCheck<G, P> {
  private cache: FluentSample<A>
  private dedup: Arbitrary<A>

  constructor(protected readonly parent: FluentCheck<P, any>, public readonly name: K, public readonly a: Arbitrary<A>) {
    super(parent)
    this.dedup = a.unique()
    this.cache = this.dedup.sampleWithBias(1000)
  }

  protected run(testCase: TestCase, callback: (arg: TestCase) => FluentResult, partial: FluentResult | undefined = undefined): FluentResult {
    const sample = partial === undefined ?
      this.cache :
      this.dedup.shrink(partial.example[this.name]).sampleWithBias(1000)

    for (const tp of sample.items) {
      testCase[this.name] = tp
      const result = callback(testCase)
      if (result.satisfiable) {
        result.addExample(this.name, tp)
        return this.run(testCase, callback, result)
      }
    }

    return partial || new FluentResult(false, {}, sample.confidence)
  }
}

class FluentCheckAssert<G extends TestCase, P extends TestCase> extends FluentCheck<G, P> {
  preliminaries: FluentCheck<any, any>[]

  constructor(protected readonly parent: FluentCheck<P, any>, public readonly assertion: (args: G) => boolean) {
    super(parent)
    this.preliminaries = this.pathFromRoot().filter(node =>
      (node instanceof FluentCheckGivenMutable) ||
      (node instanceof FluentCheckWhen))
  }

  and(assertion: (args: G) => boolean) {
    return this.then(assertion)
  }

  private runPreliminaries(testCase: TestCase) {
    const data: TestCase = {}

    this.preliminaries.forEach(node => {
      if (node instanceof FluentCheckGivenMutable) data[node.name] = node.factory({ ...testCase, ...data })
      else if (node instanceof FluentCheckWhen) node.f({ ...testCase, ...data })
    })

    return data
  }

  protected run(testCase: TestCase, callback: (arg: TestCase) => FluentResult) {
    const unwrappedTestCase = FluentCheck.unwrapFluentPick(testCase)
    return (this.assertion({ ...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase) } as G)) ? callback(testCase) : new FluentResult(false)
  }
}
