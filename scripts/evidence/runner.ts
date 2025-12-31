/**
 * Shared utilities for evidence generation experiments
 */

import fs from 'fs'
import path from 'path'
import { fork, ChildProcess } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'url'
import jstat from 'jstat'

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
  /** Optional configuration for parallel execution */
  parallel?: {
    /** Absolute path to the module containing the run function */
    modulePath: string
    /** Name of the exported function to call */
    functionName: string
  }
}

/**
 * Run tasks in parallel using child processes
 */
export async function runParallel<TResult>(
  tasks: { args: any[], taskId: number }[],
  modulePath: string,
  functionName: string,
  progress?: ProgressReporter
): Promise<TResult[]> {
  const threadCount = process.env.THREADS ? parseInt(process.env.THREADS, 10) : 1
  
  if (threadCount <= 1) {
    throw new Error('runParallel called with threads <= 1')
  }

  console.log(`Running in parallel with ${threadCount} child processes...`)

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const workerPath = path.join(__dirname, 'worker.ts')
  
  const results: Map<number, TResult> = new Map()
  
  // Create workers
  const workers: ChildProcess[] = []
  const taskQueue = [...tasks]
  let pendingTasks = tasks.length
  
  return new Promise((resolve, reject) => {
    let errorOccurred = false

    const cleanup = () => {
      workers.forEach(w => w.kill())
    }

    const processQueue = (workerIndex: number) => {
      if (errorOccurred) return
      
      if (taskQueue.length === 0) {
        if (pendingTasks === 0) {
           // All done
           cleanup()
           // Sort results by taskId to maintain order
           const sortedResults = tasks.map(t => {
             const res = results.get(t.taskId)
             if (res === undefined) {
               console.error(`Task ${t.taskId} is missing result!`)
             }
             return res!
           })
           resolve(sortedResults)
        }
        return
      }

      const task = taskQueue.shift()!
      const worker = workers[workerIndex]
      
      worker.send({
        type: 'run',
        payload: {
          modulePath,
          functionName,
          args: task.args
        },
        taskId: task.taskId
      })
    }

    for (let i = 0; i < threadCount; i++) {
      const worker = fork(workerPath, [], {
        execArgv: process.execArgv,
        env: process.env,
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
      })
      
      worker.on('message', (msg: any) => {
        if (msg.type === 'result') {
          results.set(msg.taskId, msg.result)
          pendingTasks--
          if (progress) progress.update()
          processQueue(i)
        } else if (msg.type === 'error') {
          errorOccurred = true
          console.error(`Worker error on task ${msg.taskId}:`, msg.error)
          cleanup()
          reject(msg.error)
        }
      })

      worker.on('error', (err) => {
        errorOccurred = true
        console.error('Child process error:', err)
        cleanup()
        reject(err)
      })

      worker.on('exit', (code) => {
        if (code !== 0 && !errorOccurred) {
          errorOccurred = true
          cleanup()
          reject(new Error(`Child process exited with code ${code}`))
        }
      })

      workers.push(worker)
      // Start processing
      processQueue(i)
    }
  })
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
    runTrial: (params: TParams, trialId: number, indexInConfig: number) => TResult
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

    // Check if parallel execution is enabled and requested
    const threadCount = process.env.THREADS ? parseInt(process.env.THREADS, 10) : 1
    if (this.config.parallel && threadCount > 1) {
      const tasks: { args: any[], taskId: number }[] = []
      
      for (const params of parameterSets) {
        for (let i = 0; i < this.config.trialsPerConfig; i++) {
          tasks.push({
            args: [params, trialId, i],
            taskId: trialId
          })
          trialId++
        }
      }

      const results = await runParallel<TResult>(
        tasks,
        this.config.parallel.modulePath,
        this.config.parallel.functionName,
        progress
      )

      for (const result of results) {
        writer.writeRow(this.config.resultToRow(result))
      }
    } else {
      // Sequential execution
      for (const params of parameterSets) {
        for (let i = 0; i < this.config.trialsPerConfig; i++) {
          const result = runTrial(params, trialId, i)
          writer.writeRow(this.config.resultToRow(result))
          progress.update()
          trialId++
        }
      }
    }

    progress.finish()
    await writer.close()

    console.log(`\n✓ ${this.config.name} complete`)
    console.log(`  Output: ${this.config.outputPath}`)
  }

  /**
   * Run the experiment where each trial produces multiple result rows (Series/TimeSeries data)
   * @param parameterSets List of parameter configurations to test
   * @param runTrial Function to run a single trial returning an array of results
   */
  async runSeries(
    parameterSets: TParams[],
    runTrial: (params: TParams, trialId: number, indexInConfig: number) => TResult[]
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
        const results = runTrial(params, trialId, i)
        for (const result of results) {
          writer.writeRow(this.config.resultToRow(result))
        }
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

// =============================================================================
// POWER ANALYSIS UTILITIES
// =============================================================================

/**
 * Statistical power analysis for proportion-based studies.
 *
 * These utilities help determine sample sizes needed to detect
 * deviations from a target proportion (e.g., 90% coverage) with
 * specified statistical power.
 */

/**
 * Parameters for power analysis
 */
export interface PowerAnalysisParams {
  /** Target proportion (e.g., 0.90 for 90% coverage) */
  targetProportion: number
  /** Minimum deviation to detect (e.g., 0.05 for 5% deviation) */
  minDetectableDeviation: number
  /** Significance level (default: 0.05 for 95% confidence) */
  alpha?: number
  /** Desired statistical power (default: 0.95) */
  power?: number
}

/**
 * Result of power analysis
 */
export interface PowerAnalysisResult {
  /** Required sample size per configuration */
  requiredSampleSize: number
  /** The parameters used */
  params: Required<PowerAnalysisParams>
  /** Expected Wilson CI half-width at this sample size */
  expectedCIHalfWidth: number
  /** Actual detectable deviation at this sample size */
  actualDetectableDeviation: number
}

/**
 * Standard normal quantile function (inverse CDF).
 * Wrapper around jstat.normal.inv for standard normal (mean=0, std=1).
 */
function normalQuantile(p: number): number {
  return jstat.normal.inv(p, 0, 1)
}

/**
 * Calculate Cohen's h effect size for two proportions.
 * h = 2 * (arcsin(sqrt(p1)) - arcsin(sqrt(p2)))
 */
function cohensH(p1: number, p2: number): number {
  return 2 * (Math.asin(Math.sqrt(p1)) - Math.asin(Math.sqrt(p2)))
}

/**
 * Calculate required sample size to detect a deviation from target proportion.
 *
 * Uses the formula for one-sample proportion test based on Cohen's h effect size.
 *
 * @example
 * ```ts
 * // To detect 5% deviation from 90% with 95% power:
 * const result = calculateRequiredSampleSize({
 *   targetProportion: 0.90,
 *   minDetectableDeviation: 0.05,
 *   power: 0.95
 * })
 * console.log(result.requiredSampleSize) // 564
 * ```
 */
export function calculateRequiredSampleSize(params: PowerAnalysisParams): PowerAnalysisResult {
  const {
    targetProportion,
    minDetectableDeviation,
    alpha = 0.05,
    power = 0.95
  } = params

  // Z-scores for two-sided test
  const zAlpha = normalQuantile(1 - alpha / 2)
  const zBeta = normalQuantile(power)

  // Effect size (Cohen's h)
  const p1 = targetProportion - minDetectableDeviation
  const h = Math.abs(cohensH(targetProportion, p1))

  // Sample size formula: n = ((z_alpha + z_beta) / h)^2
  const n = Math.ceil(Math.pow((zAlpha + zBeta) / h, 2))

  // Calculate expected CI half-width at this sample size
  const z = normalQuantile(1 - alpha / 2)
  const p = targetProportion
  const denominator = 1 + z * z / n
  const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denominator
  const expectedCIHalfWidth = margin

  // Calculate actual detectable deviation at this sample size
  const actualH = (zAlpha + zBeta) / Math.sqrt(n)
  const actualP1 = Math.pow(Math.sin(Math.asin(Math.sqrt(targetProportion)) - actualH / 2), 2)
  const actualDetectableDeviation = Math.abs(targetProportion - actualP1)

  return {
    requiredSampleSize: n,
    params: { targetProportion, minDetectableDeviation, alpha, power },
    expectedCIHalfWidth,
    actualDetectableDeviation
  }
}

/**
 * Print power analysis summary to console
 */
export function printPowerAnalysis(result: PowerAnalysisResult): void {
  const { params, requiredSampleSize, expectedCIHalfWidth, actualDetectableDeviation } = result

  console.log('Power Analysis:')
  console.log(`  Target proportion: ${(params.targetProportion * 100).toFixed(0)}%`)
  console.log(`  Min detectable deviation: ±${(params.minDetectableDeviation * 100).toFixed(1)}%`)
  console.log(`  Significance level (α): ${params.alpha}`)
  console.log(`  Statistical power: ${(params.power * 100).toFixed(0)}%`)
  console.log(`  Required sample size: ${requiredSampleSize} per configuration`)
  console.log(`  Expected 95% CI half-width: ±${(expectedCIHalfWidth * 100).toFixed(2)}%`)
  console.log(`  Actual detectable deviation: ±${(actualDetectableDeviation * 100).toFixed(2)}%`)
}
