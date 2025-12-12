import {FluentReporter} from './FluentReporter.js'
import type {FluentResult} from './FluentResult.js'
import type {ProgressInfo} from './check/CheckOptions.js'
import {Verbosity, type Logger} from './statistics.js'

export interface ProgressReporter {
  onProgress(progress: ProgressInfo): void
  onFinal(progress: ProgressInfo): void
}

export class NoopProgressReporter implements ProgressReporter {
  onProgress(_progress: ProgressInfo): void {
    // no-op
  }

  onFinal(_progress: ProgressInfo): void {
    // no-op
  }
}

export class CallbackProgressReporter implements ProgressReporter {
  constructor(
    private readonly callback: (progress: ProgressInfo) => void,
    private readonly logger?: Logger
  ) {}

  onProgress(progress: ProgressInfo): void {
    this.#invokeSafely(progress)
  }

  onFinal(progress: ProgressInfo): void {
    this.#invokeSafely(progress)
  }

  #invokeSafely(progress: ProgressInfo): void {
    try {
      this.callback(progress)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      if (this.logger !== undefined) {
        this.logger.log({
          level: 'error',
          message: 'Progress callback error',
          data: {error: errorMessage}
        })
      } else {
        // Fallback to console to avoid completely silent failures
        // when no logger is configured.
        // This mirrors previous behavior where errors were logged.
        console.error('Progress callback error', errorMessage)
      }
    }
  }
}

export class ThrottlingProgressReporter implements ProgressReporter {
  private lastTestsRun = 0
  private lastTimeMs = 0

  constructor(
    private readonly inner: ProgressReporter,
    private readonly minTestsInterval: number,
    private readonly minTimeIntervalMs: number
  ) {}

  onProgress(progress: ProgressInfo): void {
    const now = Date.now()
    const shouldUpdate =
      progress.testsRun - this.lastTestsRun >= this.minTestsInterval ||
      this.lastTimeMs === 0 ||
      now - this.lastTimeMs >= this.minTimeIntervalMs

    if (!shouldUpdate) return

    this.lastTestsRun = progress.testsRun
    this.lastTimeMs = now
    this.inner.onProgress(progress)
  }

  onFinal(progress: ProgressInfo): void {
    this.inner.onFinal(progress)
  }
}

export interface ResultReporter<Rec extends {} = {}> {
  onComplete(result: FluentResult<Rec>): void
}

export class NoopResultReporter<Rec extends {} = {}> implements ResultReporter<Rec> {

  onComplete(_result: FluentResult<Rec>): void {
    // no-op
  }
}

export class ConsoleStatisticsReporter<Rec extends {} = {}> implements ResultReporter<Rec> {
  constructor(private readonly verbosity: Verbosity) {}

  onComplete(result: FluentResult<Rec>): void {
    if (this.verbosity === Verbosity.Quiet) return

    const detailed = this.verbosity >= Verbosity.Verbose
    const includeHistograms = this.verbosity >= Verbosity.Debug

    const formatted = FluentReporter.formatStatistics(result.statistics, {
      format: 'text',
      detailed,
      includeHistograms
    })

    // Maintain existing behavior of prefixing with a newline.
    console.log('\n' + formatted)
  }
}

export class LoggerStatisticsReporter<Rec extends {} = {}> implements ResultReporter<Rec> {
  constructor(
    private readonly logger: Logger,
    private readonly verbosity: Verbosity
  ) {}

  onComplete(result: FluentResult<Rec>): void {
    if (this.verbosity === Verbosity.Quiet) return

    const detailed = this.verbosity >= Verbosity.Verbose
    const includeHistograms = this.verbosity >= Verbosity.Debug

    this.logger.log({
      level: 'info',
      message: 'statistics',
      data: {
        statistics: result.statistics,
        detailed,
        includeHistograms
      }
    })
  }
}
