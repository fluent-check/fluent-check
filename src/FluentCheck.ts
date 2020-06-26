import { Arbitrary, FluentPick } from './arbitraries'

type UnwrapFluentPick<T> = { [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : T[P] }
type WrapFluentPick<T> = { [P in keyof T]: Arbitrary<T[P]> }

type FluentPicks = Record<string, FluentPick<any>>

class FluentResult {
  constructor(public readonly satisfiable = false, public example: FluentPicks = {}) { }

  addExample<A>(name: string, value: FluentPick<A>) {
    this.example[name] = value
    return this
  }
}

export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  constructor(protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined) { }

  given<K extends string, V>(name: K, v: (args: Rec) => V | V): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec> {
    return (v instanceof Function) ?
      new FluentCheckGivenMutable(this, name, v) :
      new FluentCheckGivenConstant<K, V, Rec & Record<K, V>, Rec>(this, name, v)
  }

  when(f: (givens: Rec) => void): FluentCheckWhen<Rec, ParentRec> {
    return new FluentCheckWhen(this, f)
  }

  forall<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckUniversal(this, name, a)
  }

  exists<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckExistential(this, name, a)
  }

  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec> {
    return new FluentCheckAssert(this, f)
  }

  protected run(testCase: ParentRec, callback: (arg: Rec) => FluentResult, _partial: FluentResult | undefined = undefined): FluentResult {
    return callback(testCase as Rec)
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

  check(child: (testCase: Rec) => FluentResult = () => new FluentResult(true)): FluentResult {
    if (this.parent !== undefined) return this.parent.check(testCase => this.run(testCase, child))
    else {
      const r = this.run({} as Rec, child)
      return new FluentResult(r.satisfiable, FluentCheck.unwrapFluentPick(r.example))
    }
  }

  static unwrapFluentPick<F extends FluentPicks>(testCase: F): { [K in keyof F]: F[K] extends FluentPick<infer V> ? V : F[K] } {
    const result: any = { }
    for (const k in testCase) result[k] = testCase[k].value
    return result
  }
}

class FluentCheckWhen<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(protected readonly parent: FluentCheck<ParentRec, any>, public readonly f: (givens: Rec) => void) {
    super(parent)
  }

  and(f: (givens: Rec) => void) { return this.when(f) }
}

abstract class FluentCheckGiven<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(protected readonly parent: FluentCheck<ParentRec, any>, public readonly name: K) {
    super(parent)
  }

  and<NK extends string, V>(name: NK, f: (args: Rec) => V | V) {
    return super.given(name, f)
  }
}

class FluentCheckGivenMutable<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}> extends FluentCheckGiven<K, V, Rec, ParentRec> {
  constructor(protected readonly parent: FluentCheck<ParentRec, any>, public readonly name: K, public readonly factory: (args: ParentRec) => V) {
    super(parent, name)
  }
}

class FluentCheckGivenConstant<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}> extends FluentCheckGiven<K, V, Rec, ParentRec> {
  constructor(protected readonly parent: FluentCheck<ParentRec, any>, public readonly name: K, public readonly value: V) {
    super(parent, name)
  }

  protected run(testCase: Rec, callback: (arg: Rec) => FluentResult) {
    (testCase as Record<K, V>)[this.name] = this.value
    return callback(testCase as Rec)
  }
}

class FluentCheckUniversal<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  private cache: Array<FluentPick<A>>
  private dedup: Arbitrary<A>

  constructor(protected readonly parent: FluentCheck<ParentRec, any>, public readonly name: K, public readonly a: Arbitrary<A>) {
    super(parent)
    this.dedup = a.unique()
    this.cache = this.dedup.sampleWithBias(1000)
  }

  protected run(testCase: unknown, callback: (arg: Rec) => FluentResult, partial: FluentResult | undefined = undefined): FluentResult {
    const example = partial || new FluentResult(true)
    const collection = partial === undefined ? this.cache : this.dedup.shrink(partial.example[this.name]).sampleWithBias(1000)

    for (const tp of collection) {
      (testCase as Record<K, FluentPick<A>>)[this.name] = tp
      const result = callback(testCase as Rec)
      if (!result.satisfiable) {
        result.addExample(this.name, tp)
        return this.run(testCase, callback, result)
      }
    }

    return example
  }
}

class FluentCheckExistential<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  private cache: Array<FluentPick<A>>
  private dedup: Arbitrary<A>

  constructor(protected readonly parent: FluentCheck<ParentRec, any>, public readonly name: K, public readonly a: Arbitrary<A>) {
    super(parent)
    this.dedup = a.unique()
    this.cache = this.dedup.sampleWithBias(1000)
  }

  protected run(testCase: unknown, callback: (arg: Rec) => FluentResult, partial: FluentResult | undefined = undefined, depth = 0): FluentResult {
    const example = partial || new FluentResult(false)
    const collection = depth === 0 ? this.cache : (partial !== undefined ? this.dedup.shrink(partial.example[this.name]).sampleWithBias(1000) : [])

    for (const tp of collection) {
      (testCase as Record<K, FluentPick<A>>)[this.name] = tp
      const result = callback(testCase as Rec)
      if (result.satisfiable) {
        result.addExample(this.name, tp)
        return this.run(testCase, callback, result, depth + 1)
      }
    }

    return example
  }
}

class FluentCheckAssert<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  preliminaries: FluentCheck<unknown, any>[]

  constructor(protected readonly parent: FluentCheck<ParentRec, any>, public readonly assertion: (args: Rec) => boolean) {
    super(parent)
    this.preliminaries = this.pathFromRoot().filter(node =>
      (node instanceof FluentCheckGivenMutable) ||
      (node instanceof FluentCheckWhen))
  }

  and(assertion: (args: Rec) => boolean) {
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

  protected run(testCase: Rec, callback: (arg: Rec) => FluentResult) {
    const unwrappedTestCase = FluentCheck.unwrapFluentPick(testCase)
    return (this.assertion({ ...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase) } as Rec)) ? callback(testCase) : new FluentResult(false)
  }
}
