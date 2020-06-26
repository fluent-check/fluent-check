import { Arbitrary, FluentPick } from './arbitraries'

type FluentPicks = Record<string, FluentPick<any>>

class FluentResult {
  constructor(public readonly satisfiable = false, public example: FluentPicks = {}) { }

  addExample<A>(name: string, value: FluentPick<A>) {
    this.example[name] = value
    return this
  }
}

export class FluentCheck<G extends P, P extends {}> {
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

  protected run(testCase: P, callback: (arg: G) => FluentResult, _partial: FluentResult | undefined = undefined): FluentResult {
    return callback(testCase as G)
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

  check(child: (testCase: {}) => FluentResult = () => new FluentResult(true)): FluentResult {
    if (this.parent !== undefined) return this.parent.check((testCase: {}) => this.run(testCase as G, child))
    else {
      const r = this.run({} as G, child)
      return new FluentResult(r.satisfiable, FluentCheck.unwrapFluentPick(r.example))
    }
  }

  static unwrapFluentPick(testCase: FluentPicks): {} {
    const result = {}
    for (const k in testCase)
      result[k] = testCase[k].value
    return result
  }
}

class FluentCheckWhen<G extends P, P extends {}> extends FluentCheck<G, P> {
  constructor(protected readonly parent: FluentCheck<P, any>, public readonly f: (givens: G) => void) {
    super(parent)
  }

  and(f: (givens: G) => void) { return this.when(f) }
}

abstract class FluentCheckGiven<K extends string, V, P extends {}, G extends P & Record<K, V>> extends FluentCheck<G, P> {
  constructor(protected readonly parent: FluentCheck<P, any>, public readonly name: K) {
    super(parent)
  }

  and<NK extends string, NV>(name: NK, a: (args: G) => NV) {
    return super.given<NK, NV>(name, a)
  }
}

class FluentCheckGivenMutable<K extends string, V, P extends {}, G extends P & Record<K, V>> extends FluentCheckGiven<K, V, P, G> {
  constructor(protected readonly parent: FluentCheck<P, any>, public readonly name: K, public readonly factory: (args: P) => V) {
    super(parent, name)
  }
}

class FluentCheckGivenConstant<K extends string, V, P extends {}, G extends P & Record<K, V>> extends FluentCheckGiven<K, V, P, G> {
  constructor(protected readonly parent: FluentCheck<P, any>, public readonly name: K, public readonly value: V) {
    super(parent, name)
  }

  protected run(testCase: P, callback: (arg: G) => FluentResult) {
    (testCase as unknown as Record<K, V>)[this.name] = this.value
    return callback(testCase as G)
  }
}

class FluentCheckUniversal<K extends string, A, P extends {}, G extends P & Record<K, A>> extends FluentCheck<G, P> {
  private cache: Array<FluentPick<A>>
  private dedup: Arbitrary<A>

  constructor(protected readonly parent: FluentCheck<P, any>, public readonly name: K, public readonly a: Arbitrary<A>) {
    super(parent)
    this.dedup = a.unique()
    this.cache = this.dedup.sampleWithBias(1000)
  }

  protected run(testCase: unknown, callback: (arg: G) => FluentResult, partial: FluentResult | undefined = undefined): FluentResult {
    const example = partial || new FluentResult(true)
    const collection = partial === undefined ? this.cache : this.dedup.shrink(partial.example[this.name]).sampleWithBias(1000)

    for (const tp of collection) {
      (testCase as Record<K, FluentPick<A>>)[this.name] = tp
      const result = callback(testCase as G)
      if (!result.satisfiable) {
        result.addExample(this.name, tp)
        return this.run(testCase, callback, result)
      }
    }

    return example
  }
}

class FluentCheckExistential<K extends string, A, P extends {}, G extends P & Record<K, A>> extends FluentCheck<G, P> {
  private cache: Array<FluentPick<A>>
  private dedup: Arbitrary<A>

  constructor(protected readonly parent: FluentCheck<P, any>, public readonly name: K, public readonly a: Arbitrary<A>) {
    super(parent)
    this.dedup = a.unique()
    this.cache = this.dedup.sampleWithBias(1000)
  }

  protected run(testCase: unknown, callback: (arg: G) => FluentResult, partial: FluentResult | undefined = undefined, depth = 0): FluentResult {
    const example = partial || new FluentResult(false)
    const collection = depth === 0 ? this.cache : (partial !== undefined ? this.dedup.shrink(partial.example[this.name]).sampleWithBias(1000) : [])

    for (const tp of collection) {
      (testCase as Record<K, FluentPick<A>>)[this.name] = tp
      const result = callback(testCase as G)
      if (result.satisfiable) {
        result.addExample(this.name, tp)
        return this.run(testCase, callback, result, depth + 1)
      }
    }

    return example
  }
}

class FluentCheckAssert<G extends P, P extends {}> extends FluentCheck<G, P> {
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

  private runPreliminaries(testCase: {}) {
    const data = { }

    this.preliminaries.forEach(node => {
      if (node instanceof FluentCheckGivenMutable) data[node.name] = node.factory({ ...testCase, ...data })
      else if (node instanceof FluentCheckWhen) node.f({ ...testCase, ...data })
    })

    return data
  }

  protected run(testCase: P, callback: (arg: G) => FluentResult) {
    const unwrappedTestCase = FluentCheck.unwrapFluentPick(testCase)
    return (this.assertion({ ...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase) } as G)) ? callback(testCase as G) : new FluentResult(false)
  }
}
