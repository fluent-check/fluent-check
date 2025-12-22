import type {FluentResult} from './FluentCheck.js'
import type {FluentStatistics, HistogramBin} from './statistics.js'

export function expect<Rec extends {}>(result: FluentResult<Rec>): void | never {
  if (!result.satisfiable) {
    throw new FluentReporter(result)
  }
}

/**
 * Options for formatting statistics.
 */
export interface FormatStatisticsOptions {
  /** Output format: 'text', 'markdown', or 'json' */
  format?: 'text' | 'markdown' | 'json'
  /** Whether to include detailed statistics (arbitrary stats) */
  detailed?: boolean
  /** Whether to include histograms for distributions */
  includeHistograms?: boolean
  /** Maximum number of label rows to show (others will be truncated) */
  maxLabelRows?: number
}

export class FluentReporter extends Error {
  constructor(result: FluentResult) {
    super()
    this.name = 'Property not satisfiable'

    const msg: string[] = []
    msg.push('\n\nCounter-example:')
    msg.push(JSON.stringify(result.example, null, 2))

    if (result.seed !== undefined) {
      msg.push(`\nSeed: ${result.seed} (use .withSeed(${result.seed}) to reproduce)`)
    }

    msg.push('')
    this.message = msg.join('\n')
  }

  /**
   * Format statistics for output.
   *
   * @param statistics - The statistics to format
   * @param options - Formatting options
   * @returns Formatted string representation
   */
  static formatStatistics(
    statistics: FluentStatistics,
    options: FormatStatisticsOptions = {}
  ): string {
    const {
      format = 'text',
      detailed = false,
      includeHistograms = false,
      maxLabelRows = 20
    } = options

    switch (format) {
      case 'json':
        return this.formatJson(statistics, detailed)
      case 'markdown':
        return this.formatMarkdown(statistics, detailed, includeHistograms, maxLabelRows)
      case 'text':
      default:
        return this.formatText(statistics, detailed, includeHistograms, maxLabelRows)
    }
  }

  private static formatText(
    statistics: FluentStatistics,
    detailed: boolean,
    includeHistograms: boolean,
    maxLabelRows: number
  ): string {
    const lines: string[] = []
    const renderHistogram = (bins?: HistogramBin[], heading?: string) => {
      if (!includeHistograms || bins === undefined || bins.length === 0) return
      const maxCount = Math.max(...bins.map(b => b.count))
      if (heading !== undefined) lines.push(`    ${heading}:`)
      for (const bin of bins) {
        const width = maxCount === 0 ? 0 : Math.max(1, Math.round((bin.count / maxCount) * 20))
        const bar = '█'.repeat(width)
        lines.push(`      ${bin.label.padEnd(14)} ${bar} ${bin.percentage.toFixed(1)}%`)
      }
    }

    lines.push('Statistics:')
    lines.push(`  Tests run: ${statistics.testsRun}`)
    lines.push(`  Tests passed: ${statistics.testsPassed}`)
    lines.push(`  Tests discarded: ${statistics.testsDiscarded}`)
    lines.push(`  Execution time: ${statistics.executionTimeMs}ms`)
    if (statistics.executionTimeBreakdown !== undefined) {
      lines.push(`    Exploration: ${statistics.executionTimeBreakdown.exploration}ms`)
      lines.push(`    Shrinking: ${statistics.executionTimeBreakdown.shrinking}ms`)
    }

    if (statistics.labels !== undefined && Object.keys(statistics.labels).length > 0) {
      lines.push('\nLabels:')
      const sortedLabels = Object.entries(statistics.labels)
        .sort(([, a], [, b]) => b - a)
        .slice(0, maxLabelRows)

      for (const [label, count] of sortedLabels) {
        const percentage = statistics.labelPercentages?.[label] ?? 0
        lines.push(`  ${label}: ${count} (${percentage.toFixed(1)}%)`)
      }

      const remaining = Object.keys(statistics.labels).length - sortedLabels.length
      if (remaining > 0) {
        lines.push(`  ... and ${remaining} more`)
      }

      if (includeHistograms && sortedLabels.length > 0) {
        const maxCount = Math.max(...sortedLabels.map(([, count]) => count))
        lines.push('  Label histogram:')
        for (const [label, count] of sortedLabels) {
          const percentage = statistics.labelPercentages?.[label] ?? 0
          const width = maxCount === 0 ? 0 : Math.max(1, Math.round((count / maxCount) * 20))
          const bar = '█'.repeat(width)
          lines.push(`    ${label}: ${bar} ${percentage.toFixed(1)}%`)
        }
      }
    }

    if (statistics.events !== undefined && Object.keys(statistics.events).length > 0) {
      lines.push('\nEvents:')
      for (const [event, count] of Object.entries(statistics.events)) {
        const percentage = statistics.eventPercentages?.[event] ?? 0
        lines.push(`  ${event}: ${count} (${percentage.toFixed(1)}%)`)
      }
    }

    if (statistics.targets !== undefined && Object.keys(statistics.targets).length > 0) {
      lines.push('\nTargets:')
      for (const [label, target] of Object.entries(statistics.targets)) {
        const mean = target.mean.toFixed(2)
        lines.push(`  ${label}: best=${target.best}, mean=${mean}, observations=${target.observations}`)
      }
    }

    if (detailed && statistics.arbitraryStats !== undefined) {
      lines.push('\nArbitrary Statistics:')
      for (const [name, stats] of Object.entries(statistics.arbitraryStats)) {
        lines.push(`  ${name}:`)
        lines.push(`    Samples generated: ${stats.samplesGenerated}`)
        lines.push(`    Unique values: ${stats.uniqueValues}`)
        lines.push(`    Corner cases: ${stats.cornerCases.tested.length}/${stats.cornerCases.total}`)

        if (stats.distribution !== undefined) {
          lines.push('    Distribution:')
          lines.push(`      Min: ${stats.distribution.min}`)
          lines.push(`      Max: ${stats.distribution.max}`)
          lines.push(`      Mean: ${stats.distribution.mean.toFixed(2)}`)
          lines.push(`      Median: ${stats.distribution.median.toFixed(2)}`)
          lines.push(`      Q1: ${stats.distribution.q1.toFixed(2)}`)
          lines.push(`      Q3: ${stats.distribution.q3.toFixed(2)}`)
          lines.push(`      StdDev: ${stats.distribution.stdDev.toFixed(2)}`)
          renderHistogram(stats.distributionHistogram, 'Histogram')
        }

        if (stats.arrayLengths !== undefined) {
          lines.push('    Array lengths:')
          const arrMin = stats.arrayLengths.min
          const arrMax = stats.arrayLengths.max
          const arrMean = stats.arrayLengths.mean.toFixed(2)
          const arrMedian = stats.arrayLengths.median.toFixed(2)
          lines.push(`      Min: ${arrMin}, Max: ${arrMax}`)
          lines.push(`      Mean: ${arrMean}, Median: ${arrMedian}`)
          renderHistogram(stats.arrayLengthHistogram, 'Histogram')
        }

        if (stats.stringLengths !== undefined) {
          lines.push('    String lengths:')
          const strMin = stats.stringLengths.min
          const strMax = stats.stringLengths.max
          const strMean = stats.stringLengths.mean.toFixed(2)
          const strMedian = stats.stringLengths.median.toFixed(2)
          lines.push(`      Min: ${strMin}, Max: ${strMax}`)
          lines.push(`      Mean: ${strMean}, Median: ${strMedian}`)
          renderHistogram(stats.stringLengthHistogram, 'Histogram')
        }
      }
    }

    return lines.join('\n')
  }

  private static formatMarkdown(
    statistics: FluentStatistics,
    detailed: boolean,
    includeHistograms: boolean,
    maxLabelRows: number
  ): string {
    const lines: string[] = []
    const renderHistogram = (bins?: HistogramBin[]) => {
      if (!includeHistograms || bins === undefined || bins.length === 0) return
      lines.push('')
      lines.push('```\nHistogram')
      const maxCount = Math.max(...bins.map(b => b.count))
      for (const bin of bins) {
        const width = maxCount === 0 ? 0 : Math.max(1, Math.round((bin.count / maxCount) * 20))
        const bar = '█'.repeat(width)
        lines.push(`${bin.label.padEnd(14)} ${bar} ${bin.percentage.toFixed(1)}%`)
      }
      lines.push('```')
    }

    lines.push('## Statistics')
    lines.push('')
    lines.push('| Metric | Value |')
    lines.push('|--------|-------|')
    lines.push(`| Tests run | ${statistics.testsRun} |`)
    lines.push(`| Tests passed | ${statistics.testsPassed} |`)
    lines.push(`| Tests discarded | ${statistics.testsDiscarded} |`)
    lines.push(`| Execution time | ${statistics.executionTimeMs}ms |`)
    if (statistics.executionTimeBreakdown !== undefined) {
      lines.push(`| - Exploration | ${statistics.executionTimeBreakdown.exploration}ms |`)
      lines.push(`| - Shrinking | ${statistics.executionTimeBreakdown.shrinking}ms |`)
    }
    lines.push('')

    if (statistics.labels !== undefined && Object.keys(statistics.labels).length > 0) {
      lines.push('### Labels')
      lines.push('')
      lines.push('| Label | Count | Percentage |')
      lines.push('|-------|-------|------------|')

      const sortedLabels = Object.entries(statistics.labels)
        .sort(([, a], [, b]) => b - a)
        .slice(0, maxLabelRows)

      for (const [label, count] of sortedLabels) {
        const percentage = statistics.labelPercentages?.[label] ?? 0
        lines.push(`| ${label} | ${count} | ${percentage.toFixed(1)}% |`)
      }

      const remaining = Object.keys(statistics.labels).length - sortedLabels.length
      if (remaining > 0) {
        lines.push(`| ... and ${remaining} more | | |`)
      }
      lines.push('')

      if (includeHistograms && sortedLabels.length > 0) {
        const maxCount = Math.max(...sortedLabels.map(([, count]) => count))
        lines.push('```\nLabel histogram')
        for (const [label, count] of sortedLabels) {
          const percentage = statistics.labelPercentages?.[label] ?? 0
          const width = maxCount === 0 ? 0 : Math.max(1, Math.round((count / maxCount) * 20))
          const bar = '█'.repeat(width)
          lines.push(`${label}: ${bar} ${percentage.toFixed(1)}%`)
        }
        lines.push('```')
        lines.push('')
      }
    }

    if (statistics.events !== undefined && Object.keys(statistics.events).length > 0) {
      lines.push('### Events')
      lines.push('')
      lines.push('| Event | Count | Percentage |')
      lines.push('|-------|-------|------------|')
      for (const [event, count] of Object.entries(statistics.events)) {
        const percentage = statistics.eventPercentages?.[event] ?? 0
        lines.push(`| ${event} | ${count} | ${percentage.toFixed(1)}% |`)
      }
      lines.push('')
    }

    if (statistics.targets !== undefined && Object.keys(statistics.targets).length > 0) {
      lines.push('### Targets')
      lines.push('')
      lines.push('| Label | Best | Mean | Observations |')
      lines.push('|-------|------|------|--------------|')
      for (const [label, target] of Object.entries(statistics.targets)) {
        lines.push(`| ${label} | ${target.best} | ${target.mean.toFixed(2)} | ${target.observations} |`)
      }
      lines.push('')
    }

    if (detailed && statistics.arbitraryStats !== undefined) {
      lines.push('### Arbitrary Statistics')
      lines.push('')
      for (const [name, stats] of Object.entries(statistics.arbitraryStats)) {
        lines.push(`#### ${name}`)
        lines.push('')
        lines.push(`- Samples generated: ${stats.samplesGenerated}`)
        lines.push(`- Unique values: ${stats.uniqueValues}`)
        lines.push(`- Corner cases: ${stats.cornerCases.tested.length}/${stats.cornerCases.total}`)

        if (stats.distribution !== undefined) {
          lines.push('')
          lines.push('**Distribution:**')
          lines.push(`- Min: ${stats.distribution.min}, Max: ${stats.distribution.max}`)
          lines.push(`- Mean: ${stats.distribution.mean.toFixed(2)}, Median: ${stats.distribution.median.toFixed(2)}`)
          lines.push(`- Q1: ${stats.distribution.q1.toFixed(2)}, Q3: ${stats.distribution.q3.toFixed(2)}`)
          lines.push(`- StdDev: ${stats.distribution.stdDev.toFixed(2)}`)
          renderHistogram(stats.distributionHistogram)
        }

        if (stats.arrayLengths !== undefined) {
          lines.push('')
          lines.push('**Array lengths:**')
          lines.push(`- Min: ${stats.arrayLengths.min}, Max: ${stats.arrayLengths.max}`)
          lines.push(`- Mean: ${stats.arrayLengths.mean.toFixed(2)}, Median: ${stats.arrayLengths.median.toFixed(2)}`)
          renderHistogram(stats.arrayLengthHistogram)
        }

        if (stats.stringLengths !== undefined) {
          lines.push('')
          lines.push('**String lengths:**')
          lines.push(`- Min: ${stats.stringLengths.min}, Max: ${stats.stringLengths.max}`)
          lines.push(`- Mean: ${stats.stringLengths.mean.toFixed(2)}, Median: ${stats.stringLengths.median.toFixed(2)}`)
          renderHistogram(stats.stringLengthHistogram)
        }
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  private static formatJson(
    statistics: FluentStatistics,
    detailed: boolean
  ): string {
    const output: FluentStatistics = {
      testsRun: statistics.testsRun,
      testsPassed: statistics.testsPassed,
      testsDiscarded: statistics.testsDiscarded,
      executionTimeMs: statistics.executionTimeMs
    }

    // TODO(tech-debt): Consider using object spread with conditional properties instead of mutations
    if (statistics.executionTimeBreakdown !== undefined) {
      output.executionTimeBreakdown = statistics.executionTimeBreakdown
    }
    if (statistics.labels !== undefined) output.labels = statistics.labels
    if (statistics.labelPercentages !== undefined) output.labelPercentages = statistics.labelPercentages
    if (statistics.events !== undefined) output.events = statistics.events
    if (statistics.eventPercentages !== undefined) output.eventPercentages = statistics.eventPercentages
    if (statistics.targets !== undefined) output.targets = statistics.targets
    if (statistics.coverageResults !== undefined) output.coverageResults = statistics.coverageResults
    if (detailed && statistics.arbitraryStats !== undefined) output.arbitraryStats = statistics.arbitraryStats
    if (statistics.shrinking !== undefined) output.shrinking = statistics.shrinking

    return JSON.stringify(output, null, 2)
  }
}
