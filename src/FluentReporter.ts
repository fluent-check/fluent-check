import type {FluentResult} from './FluentCheck.js'
import type {FluentStatistics, HistogramBin} from './statistics.js'
import * as md from 'ts-markdown-builder'

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

  // Helper: Check if an object has keys
  private static hasKeys<T extends Record<string, unknown>>(obj: T | undefined): obj is T {
    return obj !== undefined && Object.keys(obj).length > 0
  }

  // Helper: Get percentage with fallback
  private static getPercentage(percentages: Record<string, number> | undefined, key: string): number {
    return percentages?.[key] ?? 0
  }

  // Helper: Sort labels by count (descending) and limit
  private static getSortedLabels(
    labels: Record<string, number> | undefined,
    maxRows: number
  ): Array<[string, number]> {
    if (!this.hasKeys(labels)) return []
    return Object.entries(labels)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxRows)
  }

  // Helper: Calculate histogram bar width
  private static calculateBarWidth(count: number, maxCount: number): number {
    return maxCount === 0 ? 0 : Math.max(1, Math.round((count / maxCount) * 20))
  }

  // Helper: Render histogram bins to lines (for text format)
  private static renderHistogramBins(
    bins: HistogramBin[],
    maxCount: number,
    indent: string
  ): string[] {
    return bins.map(bin => {
      const width = this.calculateBarWidth(bin.count, maxCount)
      const bar = '█'.repeat(width)
      return `${indent}${bin.label.padEnd(14)} ${bar} ${bin.percentage.toFixed(1)}%`
    })
  }

  // Helper: Format distribution stats (min/max/mean/median) - returns two lines
  private static formatDistributionStats(
    stats: { min: number; max: number; mean: number; median: number }
  ): [string, string] {
    return [
      `Min: ${stats.min}, Max: ${stats.max}`,
      `Mean: ${stats.mean.toFixed(2)}, Median: ${stats.median.toFixed(2)}`
    ]
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
      lines.push(...this.renderHistogramBins(bins, maxCount, '      '))
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

    if (this.hasKeys(statistics.labels)) {
      lines.push('\nLabels:')
      const sortedLabels = this.getSortedLabels(statistics.labels, maxLabelRows)

      for (const [label, count] of sortedLabels) {
        const percentage = this.getPercentage(statistics.labelPercentages, label)
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
          const percentage = this.getPercentage(statistics.labelPercentages, label)
          const width = this.calculateBarWidth(count, maxCount)
          const bar = '█'.repeat(width)
          lines.push(`    ${label}: ${bar} ${percentage.toFixed(1)}%`)
        }
      }
    }

    if (this.hasKeys(statistics.events)) {
      lines.push('\nEvents:')
      for (const [event, count] of Object.entries(statistics.events)) {
        const percentage = this.getPercentage(statistics.eventPercentages, event)
        lines.push(`  ${event}: ${count} (${percentage.toFixed(1)}%)`)
      }
    }

    if (this.hasKeys(statistics.targets)) {
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
          const [minMax, meanMedian] = this.formatDistributionStats(stats.arrayLengths)
          lines.push(`      ${minMax}`)
          lines.push(`      ${meanMedian}`)
          renderHistogram(stats.arrayLengthHistogram, 'Histogram')
        }

        if (stats.stringLengths !== undefined) {
          lines.push('    String lengths:')
          const [minMax, meanMedian] = this.formatDistributionStats(stats.stringLengths)
          lines.push(`      ${minMax}`)
          lines.push(`      ${meanMedian}`)
          renderHistogram(stats.stringLengthHistogram, 'Histogram')
        }
      }
    }

    return lines.join('\n')
  }

  // Helper: Render histogram for markdown format
  private static renderMarkdownHistogram(
    bins: HistogramBin[] | undefined,
    title: string | undefined,
    includeHistograms: boolean
  ): string | null {
    if (!includeHistograms || bins === undefined || bins.length === 0) return null
    const maxCount = Math.max(...bins.map(b => b.count))
    const histogramLines = title ? [`Histogram: ${title}`] : ['Histogram']
    histogramLines.push(...this.renderHistogramBins(bins, maxCount, '').map(line => line.trim()))
    return md.codeBlock(histogramLines.join('\n'))
  }

  private static formatMarkdown(
    statistics: FluentStatistics,
    detailed: boolean,
    includeHistograms: boolean,
    maxLabelRows: number
  ): string {
    const blocks: string[] = []

    // Main statistics table
    const mainTableRows: string[][] = [
      ['Tests run', String(statistics.testsRun)],
      ['Tests passed', String(statistics.testsPassed)],
      ['Tests discarded', String(statistics.testsDiscarded)],
      ['Execution time', `${statistics.executionTimeMs}ms`]
    ]
    
    if (statistics.executionTimeBreakdown !== undefined) {
      mainTableRows.push(['- Exploration', `${statistics.executionTimeBreakdown.exploration}ms`])
      mainTableRows.push(['- Shrinking', `${statistics.executionTimeBreakdown.shrinking}ms`])
    }

    blocks.push(
      md.heading('Statistics', { level: 2 }),
      md.table(['Metric', 'Value'], mainTableRows)
    )

    // Labels section
    if (this.hasKeys(statistics.labels)) {
      const sortedLabels = this.getSortedLabels(statistics.labels, maxLabelRows)

      const labelRows: string[][] = sortedLabels.map(([label, count]) => {
        const percentage = this.getPercentage(statistics.labelPercentages, label)
        return [label, String(count), `${percentage.toFixed(1)}%`]
      })

      const remaining = Object.keys(statistics.labels).length - sortedLabels.length
      if (remaining > 0) {
        labelRows.push([`... and ${remaining} more`, '', ''])
      }

      blocks.push(
        md.heading('Labels', { level: 3 }),
        md.table(['Label', 'Count', 'Percentage'], labelRows)
      )

      if (includeHistograms && sortedLabels.length > 0) {
        const maxCount = Math.max(...sortedLabels.map(([, count]) => count))
        const histogramLines = ['Label histogram']
        for (const [label, count] of sortedLabels) {
          const percentage = this.getPercentage(statistics.labelPercentages, label)
          const width = this.calculateBarWidth(count, maxCount)
          const bar = '█'.repeat(width)
          histogramLines.push(`${label}: ${bar} ${percentage.toFixed(1)}%`)
        }
        blocks.push(md.codeBlock(histogramLines.join('\n')))
      }
    }

    // Events section
    if (this.hasKeys(statistics.events)) {
      const eventRows: string[][] = Object.entries(statistics.events).map(([event, count]) => {
        const percentage = this.getPercentage(statistics.eventPercentages, event)
        return [event, String(count), `${percentage.toFixed(1)}%`]
      })

      blocks.push(
        md.heading('Events', { level: 3 }),
        md.table(['Event', 'Count', 'Percentage'], eventRows)
      )
    }

    // Targets section
    if (this.hasKeys(statistics.targets)) {
      const targetRows: string[][] = Object.entries(statistics.targets).map(([label, target]) => [
        label,
        String(target.best),
        target.mean.toFixed(2),
        String(target.observations)
      ])

      blocks.push(
        md.heading('Targets', { level: 3 }),
        md.table(['Label', 'Best', 'Mean', 'Observations'], targetRows)
      )
    }

    // Arbitrary statistics section
    if (detailed && statistics.arbitraryStats !== undefined) {
      blocks.push(md.heading('Arbitrary Statistics', { level: 3 }))

      for (const [name, stats] of Object.entries(statistics.arbitraryStats)) {
        const arbitraryBlocks: string[] = [
          md.heading(name, { level: 4 }),
          md.list([
            `Samples generated: ${stats.samplesGenerated}`,
            `Unique values: ${stats.uniqueValues}`,
            `Corner cases: ${stats.cornerCases.tested.length}/${stats.cornerCases.total}`
          ])
        ]

        if (stats.distribution !== undefined) {
          arbitraryBlocks.push(
            md.bold('Distribution:'),
            md.list([
              `Min: ${stats.distribution.min}, Max: ${stats.distribution.max}`,
              `Mean: ${stats.distribution.mean.toFixed(2)}, Median: ${stats.distribution.median.toFixed(2)}`,
              `Q1: ${stats.distribution.q1.toFixed(2)}, Q3: ${stats.distribution.q3.toFixed(2)}`,
              `StdDev: ${stats.distribution.stdDev.toFixed(2)}`
            ])
          )
          const histogram = this.renderMarkdownHistogram(stats.distributionHistogram, 'Distribution', includeHistograms)
          if (histogram) arbitraryBlocks.push(histogram)
        }

        if (stats.arrayLengths !== undefined) {
          const [minMax, meanMedian] = this.formatDistributionStats(stats.arrayLengths)
          arbitraryBlocks.push(
            md.bold('Array lengths:'),
            md.list([minMax, meanMedian])
          )
          const histogram = this.renderMarkdownHistogram(stats.arrayLengthHistogram, 'Array lengths', includeHistograms)
          if (histogram) arbitraryBlocks.push(histogram)
        }

        if (stats.stringLengths !== undefined) {
          const [minMax, meanMedian] = this.formatDistributionStats(stats.stringLengths)
          arbitraryBlocks.push(
            md.bold('String lengths:'),
            md.list([minMax, meanMedian])
          )
          const histogram = this.renderMarkdownHistogram(stats.stringLengthHistogram, 'String lengths', includeHistograms)
          if (histogram) arbitraryBlocks.push(histogram)
        }

        blocks.push(...arbitraryBlocks)
      }
    }

    return md.joinBlocks(blocks)
  }

  private static formatJson(
    statistics: FluentStatistics,
    detailed: boolean
  ): string {
    const output: FluentStatistics = {
      testsRun: statistics.testsRun,
      testsPassed: statistics.testsPassed,
      testsDiscarded: statistics.testsDiscarded,
      executionTimeMs: statistics.executionTimeMs,
      ...(statistics.executionTimeBreakdown !== undefined && {
        executionTimeBreakdown: statistics.executionTimeBreakdown
      }),
      ...(statistics.labels !== undefined && { labels: statistics.labels }),
      ...(statistics.labelPercentages !== undefined && {
        labelPercentages: statistics.labelPercentages
      }),
      ...(statistics.events !== undefined && { events: statistics.events }),
      ...(statistics.eventPercentages !== undefined && {
        eventPercentages: statistics.eventPercentages
      }),
      ...(statistics.targets !== undefined && { targets: statistics.targets }),
      ...(statistics.coverageResults !== undefined && {
        coverageResults: statistics.coverageResults
      }),
      ...(detailed && statistics.arbitraryStats !== undefined && {
        arbitraryStats: statistics.arbitraryStats
      }),
      ...(statistics.shrinking !== undefined && { shrinking: statistics.shrinking })
    }

    return JSON.stringify(output, null, 2)
  }
}
