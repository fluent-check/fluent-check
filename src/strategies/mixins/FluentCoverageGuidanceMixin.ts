import {performance} from 'perf_hooks'
import {MixinStrategy} from '../FluentStrategyTypes'
import {FluentPick, WrapFluentPick} from '../../arbitraries'
import {FluentStrategyInterface} from '../FluentStrategy'

export function CoverageGuidance<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {

    /**
     * Indicates whether the current test case collection inputs are the result of a mutation or not.
     */
    private testCaseCollectionMutationStatus = false

    /**
     * Generates each arbitrary seed collection, which is based on the arbitrary corner cases and extracted
     * constants from the code, and defines the arbitrary collection as equal to the previous and already
     * defined seed collection. Once all of the arbitrary collections are properly defined, it generates the
     * test case collection to be used during the testing process.
     */
    configArbitraries() {
      for (const name in this.arbitraries) {
        this.arbitraries[name].seedCollection = this.buildArbitraryCollection(this.arbitraries[name].arbitrary,
          this.getArbitraryExtractedConstants(this.arbitraries[name].arbitrary))
        this.arbitraries[name].collection = this.arbitraries[name].seedCollection
      }

      this.arbitrariesKeysIndex = Object.keys(this.arbitraries)
      this.generateTestCaseCollection()
    }

    /**
     * Returns false if either the minimum coverage or defined timeout are reached. Otherwise, it checks
     * whether a new test case collection should be created or not, and creates it if needed through a
     * series of mutations applied to each arbitrary seed collection. Regardless of the need for creating
     * a test case collection, it ends up returning true.
     */
    hasInput(): boolean {
      this.currTime = performance.now()

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (this.getCoverageBuilder()!.getTotalCoverage() >= this.configuration.coveragePercentage ||
        this.configuration.timeout < this.currTime - (this.initTime ?? this.currTime)) return false
      else if (this.testCaseCollectionPick >= this.testCaseCollection.length) {
        for (const name in this.arbitraries) {
          this.arbitraries[name].collection = []
          const collectionMap: Map<string, FluentPick<any>> = new Map()

          for (const input of this.arbitraries[name].seedCollection) {
            const inputMutations = this.arbitraries[name].arbitrary
              .mutate(input, this.randomGenerator.generator, this.configuration.maxNumMutations)

            for (const mutatedInput of inputMutations)
              if (!collectionMap.has(JSON.stringify(mutatedInput.value)))
                collectionMap.set(JSON.stringify(mutatedInput.value), mutatedInput)
          }
          this.arbitraries[name].collection.push(... Array.from(collectionMap.values()))
        }
        this.testCaseCollectionPick = 0
        this.testCaseCollectionMutationStatus = true
        this.generateTestCaseCollection()
      }

      return true
    }

    /**
     * Updates the current input being used for testing purposes and returns it.
     */
    getInput(): WrapFluentPick<any> {
      this.currTestCase = this.testCaseCollection[this.testCaseCollectionPick++] as WrapFluentPick<any>
      return this.currTestCase
    }

    /**
     * Computes coverage for a given test case and adds it to the testCases array. It also checks if the test
     * case should be favored and its inputs added to the respective arbitrary seed collection.
     */
    handleResult(inputData: any[]) {
      inputData.forEach(data => {
        this.addTestCase(data)
        this.getCoverageBuilder()?.compute(data)
      })

      this.getCoverageBuilder()?.updateTotalCoverage()

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (this.testCaseCollectionMutationStatus && this.getCoverageBuilder()!.compare())
        for (const name in this.arbitraries)
          this.arbitraries[name].seedCollection = [... new Set(this.arbitraries[name].seedCollection
            .concat([this.currTestCase[name]]))]
    }

  }
}
