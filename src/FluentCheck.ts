import {FluentStrategy} from './strategies/FluentStrategy'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory'
import {Arbitrary, FluentPick, ValueResult, PickResult, FluentRandomGenerator} from './arbitraries'

export class FluentResult {
  constructor(
    public satisfiable = false,
    public example: PickResult<any> = {},
    public readonly seed?: number) { }

  addExample<A>(name: string, value: FluentPick<A>) {
    this.example[name] = value
  }
}

export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  constructor(protected strategy: FluentStrategy = new FluentStrategyFactory().defaultStrategy().build(),
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined) {
  }

  config(strategy: FluentStrategyFactory) {
    this.strategy = strategy.build()
    return this
  }

  given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec> {
    return v instanceof Function ?
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

  protected run(callback: () => FluentResult): FluentResult {
    return callback()
  }

  protected pathFromRoot(): FluentCheck<any, any>[] {
    return this.parent !== undefined ? [...this.parent.pathFromRoot(), this] : [this]
  }

  check(): FluentResult {
    return new FluentCheckRunner(this, this.strategy).verify()
  }

  verify(child: () => FluentResult = () => new FluentResult(true)): FluentResult {
    if (this.parent !== undefined) return this.parent.verify(() => this.run(child))
    else {
      this.strategy.setup()
      const r = this.run(child)
      this.strategy.tearDown()

      return new FluentResult(r.satisfiable,
        FluentCheck.unwrapFluentPick(r.example),
        this.strategy.getRandomGenerator().seed
      )
    }
  }

  static unwrapFluentPick<T>(testCase: PickResult<T>): ValueResult<T> {
    const result = {}
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
    this.strategy.addTestMethod(f)
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
    this.strategy.addTestMethod(factory)
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

}

abstract class FluentCheckQuantifier<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  abstract breakValue: boolean

  private context: Map<string, boolean> = new Map()
  private partialContext: Map<string, boolean> = new Map()

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly a: Arbitrary<A>,
    strategy: FluentStrategy) {

    super(strategy, parent)
    this.strategy.addArbitrary(this.name, a)
  }

  protected run(
    callback: () => FluentResult,
    partial: FluentResult | undefined = undefined
  ): FluentResult {

    const result = callback()

    if (Object.keys(result.example).length === 0) return partial !== undefined ? partial : result
    else if (result.example[this.name] === undefined || this.breakValue !== result.satisfiable ||
      this.strategy.shrink(this.name, result) === false) return result

    this.strategy.updateArbitraryCollections(this.name, result.example)
    this.strategy.generateTestCaseCollection()

    return this.run(callback, result)
  }

  /**
   * Updates its own context.
   */
  selfUpdateContext(testCase: ValueResult<any>, assertionResult: boolean) {
    this.context.set(JSON.stringify(testCase), assertionResult)
  }

  /**
   * Updates its quantifier parent based on its own context, which is already updated at this point in the program
   * execution flow.
   */
  updateParentQuantifierContext(
    testCase: ValueResult<any>,
    assertionResult: boolean,
    parentQuantifier: FluentCheckQuantifier<K, A, unknown, any>
  ) {
    const contextKeyObject: ValueResult<any> = {}

    for (const testCaseKey of Object.keys(testCase))
      if (testCaseKey === this.name) break
      else contextKeyObject[testCaseKey] = testCase[testCaseKey]

    const key: [string, boolean] = ['', false]
    const contextKey = JSON.stringify(contextKeyObject)

    if (parentQuantifier.partialContext.size === 0) parentQuantifier.partialContext.set(contextKey, assertionResult)
    else if (this.strategy.getTestCaseCollection().length === 0) key[0] = contextKey
    else if (!parentQuantifier.partialContext.has(contextKey)) {
      key[0] = parentQuantifier.partialContext.keys().next().value
      key[1] = true
    }

    if (key[0].length > 0) {
      const value = Array.from(this.context.entries()).filter(x =>
        x[0].substring(1, x[0].length - 1).includes(key[0].substring(1, key[0].length - 1))
      ).map(x => x[1])

      parentQuantifier.context.set(key[0], this.breakValue ? value.some(x => x) : value.every(x => x))
      parentQuantifier.partialContext.clear()

      if (!key[1]) parentQuantifier.partialContext.set(contextKey, assertionResult)
    }
  }

  /**
   * Returns true if the early stop condition was met. Otherwise, returns false.
   */
  earlyStopConditionStatus(): boolean {
    return this.breakValue ?
      Array.from(this.context.values()).some(x => x) :
      Array.from(this.context.values()).some(x => !x)
  }

  /**
   * Returns the quantifier context.
   */
  getContext() {
    return this.context
  }

  /**
   * Cleans both the quantifier context and partial context.
   */
  cleanContexts() {
    this.context.clear()
    this.partialContext.clear()
  }

}

class FluentCheckUniversal<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheckQuantifier<K, A, Rec, ParentRec> {
  breakValue = false
}

class FluentCheckExistential<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheckQuantifier<K, A, Rec, ParentRec> {
  breakValue = true
}

class FluentCheckAssert<Rec extends ParentRec, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  preliminaries: FluentCheck<unknown, any>[]

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly assertion: (args: Rec) => boolean,
    strategy: FluentStrategy) {

    super(strategy, parent)

    this.preliminaries = this.pathFromRoot().filter(node =>
      node instanceof FluentCheckWhen ||
      node instanceof FluentCheckGivenMutable ||
      node instanceof FluentCheckGivenConstant)

    this.strategy.addTestMethod(assertion)
  }

  and(assertion: (args: Rec) => boolean) {
    return this.then(assertion)
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
    this.strategy.setRandomGenerator(new FluentRandomGenerator(rngBuilder, seed))
  }
}

class FluentCheckRunner<K extends string, A, Rec extends ParentRec, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  asserts: FluentCheckAssert<unknown, any>[]
  quantifiers: FluentCheckQuantifier<K, A, unknown, any>[]
  runnerBreakValue: boolean | undefined = undefined

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    strategy: FluentStrategy
  ) {
    super(strategy, parent)

    this.strategy.configArbitraries()

    this.asserts = this.pathFromRoot().filter(node => node instanceof FluentCheckAssert)
      .map(x => x as FluentCheckAssert<unknown, any>)
    this.quantifiers = this.pathFromRoot().filter(node => node instanceof FluentCheckQuantifier)
      .reverse().map(x => x as FluentCheckQuantifier<K, A, unknown, any>)
    this.runnerBreakValue = this.quantifiers.length > 0 && this.quantifiers.map(val => val.breakValue)
      .every((val, _, arr) => val === arr[0]) ? this.quantifiers[0].breakValue : undefined
  }

  private runPreliminaries<T>(testCase: ValueResult<T>, preliminaries: FluentCheck<unknown, any>[]): Rec {
    const data = { } as Rec

    preliminaries.forEach(node => {
      if (node instanceof FluentCheckGivenConstant) data[node.name] = node.value
      else if (node instanceof FluentCheckGivenMutable) data[node.name] = node.factory({...testCase, ...data})
      else if (node instanceof FluentCheckWhen) node.f({...testCase, ...data})
    })

    return data
  }

  private runAssertions(): [boolean, Rec[]] {
    const inputData: Rec[] = []
    let assertionResult = true
    const unwrappedTestCase = FluentCheck.unwrapFluentPick(this.strategy.getCurrentTestCase())

    for (const node of this.asserts) {
      inputData.push({...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase, node.preliminaries)} as Rec)
      assertionResult = assertionResult && node.assertion(inputData[inputData.length - 1])
      if (!assertionResult) break
    }

    return [assertionResult, inputData]
  }

  protected run(): FluentResult {
    if (this.quantifiers.length === 0) return new FluentResult(this.runAssertions()[0])

    const result = new FluentResult(!this.quantifiers[this.quantifiers.length - 1].breakValue)

    if (this.runnerBreakValue === undefined) this.quantifiers.forEach(node => node.cleanContexts())

    while (this.strategy.hasInput()) {
      this.strategy.getInput()
      const assertionsData = this.runAssertions()
      this.strategy.handleResult(assertionsData[1])

      if (this.runnerBreakValue !== undefined && this.runnerBreakValue === assertionsData[0]) {
        result.satisfiable = assertionsData[0]
        this.quantifiers.forEach(node => result.addExample(node.name, this.strategy.getCurrentTestCase()[node.name]))
        return result
      }

      this.quantifiers[0].selfUpdateContext(this.strategy.getCurrentTestCase(), assertionsData[0])
      for (let i = 0; i < this.quantifiers.length - 1; i++) {
        this.quantifiers[i].updateParentQuantifierContext(this.strategy.getCurrentTestCase(),
          assertionsData[0], this.quantifiers[i+1])
      }

      for (let i = 1; i < this.quantifiers.length; i++) {
        if (this.quantifiers[i].getContext().size >= 1 && this.quantifiers[i].earlyStopConditionStatus()) {
          result.satisfiable = this.quantifiers[i].breakValue
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          result.example = JSON.parse(Array.from(this.quantifiers[i].getContext().entries())
            .find(x => x[1] === this.quantifiers[i].breakValue)![0])
          return result
        }
      }
    }

    return result
  }

}
