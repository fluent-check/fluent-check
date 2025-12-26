/**
 * Shared utilities for evidence generation experiments
 */

import fs from 'fs'
import path from 'path'

/**
 * Mulberry32 PRNG for deterministic random number generation
 * Simple, fast, and produces good distribution
 */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

/**
 * High-resolution timer using process.hrtime.bigint()
 * Returns elapsed time in microseconds (µs) for better precision than milliseconds
 */
export class HighResTimer {
  private startTime: bigint

  constructor() {
    this.startTime = process.hrtime.bigint()
  }

  /**
   * Get elapsed time in microseconds
   */
  elapsedMicros(): number {
    const elapsed = process.hrtime.bigint() - this.startTime
    return Number(elapsed / 1000n) // Convert nanoseconds to microseconds
  }

  /**
   * Get elapsed time in milliseconds (for backward compatibility)
   */
  elapsedMs(): number {
    return Math.round(this.elapsedMicros() / 1000)
  }

  /**
   * Reset timer
   */
  reset(): void {
    this.startTime = process.hrtime.bigint()
  }
}

/**
 * CSV writer for experiment results
 */
export class CSVWriter {
  private stream: fs.WriteStream
  private headerWritten = false

  constructor(filepath: string) {
    // Ensure directory exists
    const dir = path.dirname(filepath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    this.stream = fs.createWriteStream(filepath, { flags: 'w' })
  }

  writeHeader(columns: string[]): void {
    if (this.headerWritten) {
      throw new Error('Header already written')
    }
    this.stream.write(columns.join(',') + '\n')
    this.headerWritten = true
  }

  writeRow(values: (string | number | boolean | undefined)[]): void {
    if (!this.headerWritten) {
      throw new Error('Must write header before rows')
    }
    const escaped = values.map(v => {
      if (v === undefined || v === null) return ''
      const str = String(v)
      // Escape values containing commas, quotes, or newlines
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    this.stream.write(escaped.join(',') + '\n')
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stream.end((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}

/**
 * Progress reporter for long-running experiments
 */
export class ProgressReporter {
  private startTime: number
  private lastReport: number
  private completed = 0

  constructor(
    private total: number,
    private name: string,
    private reportInterval = 1000 // Report every second
  ) {
    this.startTime = Date.now()
    this.lastReport = this.startTime
  }

  update(count = 1): void {
    this.completed += count
    const now = Date.now()
    
    if (now - this.lastReport >= this.reportInterval) {
      this.report()
      this.lastReport = now
    }
  }

  finish(): void {
    this.completed = this.total
    this.report()
    console.log() // Final newline
  }

  private report(): void {
    const elapsed = Date.now() - this.startTime
    const rate = this.completed / (elapsed / 1000)
    const remaining = (this.total - this.completed) / rate
    const percent = ((this.completed / this.total) * 100).toFixed(1)
    
    const bar = this.createBar(this.completed, this.total, 40)
    process.stdout.write(
      `\r${this.name}: ${bar} ${percent}% (${this.completed}/${this.total}) ` +
      `Rate: ${rate.toFixed(1)}/s ETA: ${remaining.toFixed(0)}s`
    )
  }

  private createBar(current: number, total: number, width: number): string {
    const filled = Math.floor((current / total) * width)
    const empty = width - filled
    return '[' + '='.repeat(filled) + ' '.repeat(empty) + ']'
  }
}

/**
 * Generate deterministic seed for trial
 */
export function getSeed(trialId: number): number {
  return trialId * 7919 // Prime multiplier for good distribution
}

/**
 * Check if running in quick mode (reduced sample sizes)
 */
export function isQuickMode(): boolean {
  return process.env.QUICK_MODE === '1'
}

/**
 * Get sample size based on mode
 */
export function getSampleSize(normal: number, quick: number): number {
  return isQuickMode() ? quick : normal
}

/**
 * Configuration for an experiment
 */
export interface ExperimentConfig<TParams, TResult> {
  /** Name of the experiment (for display) */
  name: string
  /** Path to output CSV file */
  outputPath: string
  /** CSV header columns */
  csvHeader: string[]
  /** Number of trials to run per parameter configuration */
  trialsPerConfig: number
  /** Function to map a result object to a CSV row (array of values) */
  resultToRow: (result: TResult) => (string | number | boolean | undefined)[]
  /** Optional function to print experiment info before starting */
  preRunInfo?: () => void
}

/**
 * Generic runner for experiments
 * Handles boilerplate: CSV writing, progress reporting, looping
 */
export class ExperimentRunner<TParams, TResult> {
  constructor(public readonly config: ExperimentConfig<TParams, TResult>) {}

  /**
   * Run the experiment with the given parameter sets
   * @param parameterSets List of parameter configurations to test
   * @param runTrial Function to run a single trial
   */
  async run(
    parameterSets: TParams[], 
    runTrial: (params: TParams, trialId: number) => TResult
  ): Promise<void> {
    console.log(`\n=== ${this.config.name} ===`)
    
    if (this.config.preRunInfo) {
      this.config.preRunInfo()
    }

    const writer = new CSVWriter(this.config.outputPath)
    writer.writeHeader(this.config.csvHeader)

    const totalTrials = parameterSets.length * this.config.trialsPerConfig
    console.log(`Configurations: ${parameterSets.length}`)
    console.log(`Trials per configuration: ${this.config.trialsPerConfig}`)
    console.log(`Total trials: ${totalTrials}\n`)

    const progress = new ProgressReporter(totalTrials, this.config.name)
    let trialId = 0

    for (const params of parameterSets) {
      for (let i = 0; i < this.config.trialsPerConfig; i++) {
        const result = runTrial(params, trialId)
        writer.writeRow(this.config.resultToRow(result))
        progress.update()
        trialId++
      }
    }

    progress.finish()
    await writer.close()

    console.log(`\n✓ ${this.config.name} complete`)
    console.log(`  Output: ${this.config.outputPath}`)
  }
}
