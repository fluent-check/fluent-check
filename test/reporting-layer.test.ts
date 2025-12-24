import {expect} from 'chai'
import {it} from 'mocha'
import {
  CallbackProgressReporter,
  ConsoleStatisticsReporter,
  LoggerStatisticsReporter,
  ThrottlingProgressReporter,
  type ProgressReporter,
  type ResultReporter
} from '../src/reporting'
import {Verbosity, type FluentStatistics, type LogEntry, type Logger} from '../src/statistics'
import {FluentResult, type ProgressInfo} from '../src/FluentCheck'

describe('Reporting layer', () => {
  describe('CallbackProgressReporter', () => {
    it('catches errors from progress callbacks and logs them', () => {
      const entries: LogEntry[] = []
      const logger: Logger = {
        log: (entry: LogEntry) => {
          entries.push(entry)
        }
      }

      const reporter = new CallbackProgressReporter((_progress: ProgressInfo) => {
        throw new Error('Callback failure')
      }, logger)

      const progress: ProgressInfo = {
        testsRun: 1,
        testsPassed: 0,
        testsDiscarded: 0,
        elapsedMs: 0,
        currentPhase: 'exploring'
      }

      expect(() => reporter.onProgress(progress)).not.to.throw()
      expect(() => reporter.onFinal(progress)).not.to.throw()

      expect(entries.length).to.equal(2)
      for (const entry of entries) {
        expect(entry.level).to.equal('error')
        expect(entry.message).to.equal('Progress callback error')
        expect(entry.data).to.not.equal(undefined)
        expect(entry.data).to.have.property('error')
      }
    })
  })

  describe('ThrottlingProgressReporter', () => {
    it('forwards progress according to testsRun interval', () => {
      const forwarded: ProgressInfo[] = []
      const inner: ProgressReporter = {
        onProgress: (p: ProgressInfo) => {
          forwarded.push(p)
        },
        onFinal: () => {
          // no-op
        }
      }

      const reporter = new ThrottlingProgressReporter(inner, 10, 1000)

      const originalNow = Date.now
      try {
        // Keep time constant so throttling is driven purely by testsRun

        ;(Date as any).now = () => 1000

        const base: Omit<ProgressInfo, 'testsRun'> = {
          testsPassed: 0,
          testsDiscarded: 0,
          elapsedMs: 0,
          currentPhase: 'exploring'
        }

        reporter.onProgress({testsRun: 1, ...base})
        reporter.onProgress({testsRun: 5, ...base})
        reporter.onProgress({testsRun: 11, ...base})
        reporter.onProgress({testsRun: 19, ...base})
        reporter.onProgress({testsRun: 21, ...base})
      } finally {

        ;(Date as any).now = originalNow
      }

      expect(forwarded.map(p => p.testsRun)).to.deep.equal([1, 11, 21])
    })

    it('always forwards final progress', () => {
      const finals: ProgressInfo[] = []
      const inner: ProgressReporter = {
        onProgress: () => {
          // no-op
        },
        onFinal: (p: ProgressInfo) => {
          finals.push(p)
        }
      }

      const reporter = new ThrottlingProgressReporter(inner, 100, 100000)

      const progress: ProgressInfo = {
        testsRun: 50,
        testsPassed: 25,
        testsDiscarded: 5,
        elapsedMs: 1000,
        currentPhase: 'exploring'
      }

      reporter.onFinal(progress)

      expect(finals).to.deep.equal([progress])
    })
  })

  describe('ResultReporter implementations', () => {
    const makeResult = (): FluentResult => {
      const statistics: FluentStatistics = {
        testsRun: 10,
        testsPassed: 10,
        testsDiscarded: 0,
        executionTimeMs: 5,
        executionTimeBreakdown: {
          exploration: 5,
          shrinking: 0
        }
      }
      return new FluentResult(true, {}, statistics, 123, 0)
    }

    it('ConsoleStatisticsReporter respects Quiet verbosity', () => {
      const reporter: ResultReporter = new ConsoleStatisticsReporter(Verbosity.Quiet)
      const result = makeResult()

      const originalLog = console.log
      const calls: unknown[][] = []
      try {

        console.log = (...args: unknown[]) => {
          calls.push(args)
        }

        reporter.onComplete(result)
      } finally {

        console.log = originalLog
      }

      expect(calls.length).to.equal(0)
    })

    it('ConsoleStatisticsReporter logs once for non-Quiet verbosity', () => {
      const reporter: ResultReporter = new ConsoleStatisticsReporter(Verbosity.Normal)
      const result = makeResult()

      const originalLog = console.log
      const calls: unknown[][] = []
      try {

        console.log = (...args: unknown[]) => {
          calls.push(args)
        }

        reporter.onComplete(result)
      } finally {

        console.log = originalLog
      }

      expect(calls.length).to.equal(1)
      // First arg should be a newline-prefixed string
      expect(calls[0][0]).to.be.a('string')
    })

    it('LoggerStatisticsReporter respects verbosity flags', () => {
      const statistics: FluentStatistics = {
        testsRun: 5,
        testsPassed: 5,
        testsDiscarded: 0,
        executionTimeMs: 1,
        executionTimeBreakdown: {exploration: 1, shrinking: 0}
      }
      const result = new FluentResult(true, {}, statistics, 1, 0)

      const logs: LogEntry[] = []
      const logger: Logger = {
        log: (entry: LogEntry) => {
          logs.push(entry)
        }
      }

      const reporterNormal = new LoggerStatisticsReporter(logger, Verbosity.Normal)
      reporterNormal.onComplete(result)

      expect(logs.length).to.equal(1)
      const log0 = logs[0]
      if (log0 === undefined) throw new Error('Expected log entry')
      expect(log0.level).to.equal('info')
      expect(log0.message).to.equal('statistics')
      expect(log0.data).to.not.equal(undefined)
      const data0 = log0.data as Record<string, unknown>
      expect(data0.statistics).to.equal(statistics)
      expect(data0.detailed).to.equal(false)
      expect(data0.includeHistograms).to.equal(false)

      logs.length = 0
      const reporterVerbose = new LoggerStatisticsReporter(logger, Verbosity.Verbose)
      reporterVerbose.onComplete(result)

      const logV = logs[0]
      if (logV === undefined) throw new Error('Expected log entry')
      const dataV = logV.data as Record<string, unknown>
      expect(dataV.detailed).to.equal(true)
      expect(dataV.includeHistograms).to.equal(false)

      logs.length = 0
      const reporterDebug = new LoggerStatisticsReporter(logger, Verbosity.Debug)
      reporterDebug.onComplete(result)

      const logD = logs[0]
      if (logD === undefined) throw new Error('Expected log entry')
      const dataD = logD.data as Record<string, unknown>
      expect(dataD.detailed).to.equal(true)
      expect(dataD.includeHistograms).to.equal(true)

      logs.length = 0
      const reporterQuiet = new LoggerStatisticsReporter(logger, Verbosity.Quiet)
      reporterQuiet.onComplete(result)

      expect(logs.length).to.equal(0)
    })
  })
})
