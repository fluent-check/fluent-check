import {CoverageSummary} from '../../strategies/FluentStrategyTypes'

export type BenchmarkMetrics = {
  time: string
  number_test_cases: number
  coverage: CoverageSummary
}
