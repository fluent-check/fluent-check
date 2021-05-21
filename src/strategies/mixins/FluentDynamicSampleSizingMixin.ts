import {MixinStrategy} from '../FluentStrategyTypes'

export function DynamicSampleSizing<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {

    /**
     * Updates the sampleSize and shrinkSize configuration variables if the number of arbitraries used in the testing
     * process is greater than 2 (pair-wise) and if the pair-wise testing mixin is not active. It also updates the
     * generated cache collections for each arbitrary and the maximum number of test cases to be used in the testing
     * process.
     */
    protected tweakSampleSize() {
      let maxNumCombinations = 1
      for (const name in this.arbitraries)
        maxNumCombinations *= this.arbitraries[name].arbitrary.size().value

      this.configuration.maxNumTestCases = Math.min(maxNumCombinations,
        Math.floor(Math.pow(this.configuration.sampleSize, Math.min(Object.keys(this.arbitraries).length, 2))))

      if (!this.configuration.pairwise && Object.keys(this.arbitraries).length > 2) {
        this.configuration.sampleSize = Math.round(Math.pow(Math.pow(this.configuration.sampleSize, 2),
          1 / Object.keys(this.arbitraries).length))

        this.configuration.shrinkSize = Math.round(this.configuration.sampleSize / 2)

        for (const name in this.arbitraries)
          if (this.arbitraries[name].cache !== undefined)
            this.arbitraries[name].cache = this.arbitraries[name].cache?.slice(0, this.configuration.sampleSize)
      }
    }
  }
}
