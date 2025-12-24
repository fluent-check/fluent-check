import type {CheckOptions} from './check/CheckOptions.js'
import type {Logger} from './statistics.js'
import {Verbosity} from './statistics.js'
import {
  CallbackProgressReporter,
  ConsoleStatisticsReporter,
  LoggerStatisticsReporter,
  NoopProgressReporter,
  NoopResultReporter,
  ThrottlingProgressReporter,
  type ProgressReporter,
  type ResultReporter
} from './reporting.js'

/**
 * Create a progress reporter from CheckOptions.
 * Handles the mapping from options to the appropriate reporter implementation.
 */
export function createProgressReporter(
  checkOptions: CheckOptions,
  logger?: Logger
): ProgressReporter {
  const defaultFactory = (options: CheckOptions, factoryLogger?: Logger): ProgressReporter => {
    const DEFAULT_PROGRESS_INTERVAL = 100
    const DEFAULT_PROGRESS_TIME_INTERVAL_MS = 1000
    if (options.onProgress === undefined) {
      return new NoopProgressReporter()
    }

    const base = new CallbackProgressReporter(options.onProgress, factoryLogger)
    const progressInterval = options.progressInterval ?? DEFAULT_PROGRESS_INTERVAL
    return new ThrottlingProgressReporter(base, progressInterval, DEFAULT_PROGRESS_TIME_INTERVAL_MS)
  }

  if (checkOptions.progressReporterFactory !== undefined) {
    return checkOptions.progressReporterFactory({
      options: checkOptions,
      logger,
      defaultFactory
    })
  }

  return defaultFactory(checkOptions, logger)
}

/**
 * Create a result reporter from CheckOptions.
 * Handles the mapping from options to the appropriate reporter implementation.
 */
export function createResultReporter<Rec extends {} = {}>(
  checkOptions: CheckOptions,
  effectiveVerbosity: Verbosity,
  logger?: Logger
): ResultReporter<Rec> {
  const defaultFactory = (
    options: CheckOptions,
    factoryVerbosity: Verbosity,
    factoryLogger?: Logger
  ): ResultReporter<Rec> => {
    if (options.logStatistics !== true) {
      return new NoopResultReporter<Rec>()
    }
    if (factoryVerbosity === Verbosity.Quiet) {
      return new NoopResultReporter<Rec>()
    }
    if (factoryLogger !== undefined) {
      return new LoggerStatisticsReporter<Rec>(factoryLogger, factoryVerbosity)
    }
    return new ConsoleStatisticsReporter<Rec>(factoryVerbosity)
  }

  if (checkOptions.resultReporterFactory !== undefined) {
    return checkOptions.resultReporterFactory({
      options: checkOptions,
      effectiveVerbosity,
      logger,
      defaultFactory
    }) as ResultReporter<Rec>
  }

  return defaultFactory(checkOptions, effectiveVerbosity, logger)
}

/**
 * Create an execution logger from verbosity and optional user logger.
 * Returns a logging facade that handles verbosity gating.
 */
export function createExecutionLogger(
  effectiveVerbosity: Verbosity,
  userLogger?: Logger
) {
  const shouldLogVerbosity = (min: Verbosity) =>
    effectiveVerbosity >= min && effectiveVerbosity !== Verbosity.Quiet

  const log = (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>,
    minVerbosity: Verbosity = Verbosity.Normal
  ) => {
    if (!shouldLogVerbosity(minVerbosity)) return
    const entry = {level, message, ...(data !== undefined && {data})}
    if (userLogger !== undefined) {
      userLogger.log(entry)
      return
    }
    const payload = data !== undefined ? JSON.stringify(data) : ''
    switch (level) {
      case 'warn':
        console.warn(message, payload)
        break
      case 'error':
        console.error(message, payload)
        break
      case 'debug':
        console.debug(`[DEBUG] ${message}`, payload)
        break
      default:
        console.log(message, payload)
    }
  }

  return {
    log,
    logger: userLogger,
    verbose: (message: string, data?: Record<string, unknown>) =>
      log('info', message, data, Verbosity.Verbose),
    debug: (message: string, data?: Record<string, unknown>) =>
      log('debug', message, data, Verbosity.Debug)
  }
}
