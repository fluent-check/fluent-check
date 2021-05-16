import {MixinStrategy} from '../FluentStrategyTypes'

export function DynamicSampleSizing<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {

    /**
     * Updates the sampleSize and shrinkSize configuration variables if the selected base strategy is random-based
     * and the number of arbitraries used in the testing process is greater than 2 (pair-wise). It also updates the
     * generated cache collections for each arbitrary.
     */
    protected tweakSampleSize() {
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
