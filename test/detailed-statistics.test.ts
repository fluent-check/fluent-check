import * as fc from '../src/index'
import {it, describe, beforeEach, afterEach} from 'mocha'
import {expect} from 'chai'
import {
  Verbosity, FluentReporter, type LogEntry
} from '../src/index'
import {
  detailedScenario,
  basicScenario,
  getArbitraryStats,
  createTestLogger,
  captureConsole,
  restoreConsole,
  getCapturedLogs
} from './test-utils.js'

describe('Detailed Statistics', () => {
  describe('withDetailedStatistics()', () => {
    it('should collect distribution statistics for integer arbitraries', () => {
      const result = detailedScenario()
        .forall('x', fc.integer(1, 100))
        .then(() => true)
        .check()

      const xStats = getArbitraryStats(result, 'x')
      expect(xStats.samplesGenerated).to.equal(result.statistics.testsRun)
      const dist = xStats.distribution
      if (dist === undefined) throw new Error('Expected distribution')
      expect(dist.min).to.be.within(1, 100)
      expect(dist.max).to.be.within(1, 100)
      expect(dist.mean).to.be.within(1, 100)
      expect(dist.median).to.be.within(1, 100)
      expect(dist.count).to.equal(xStats.samplesGenerated)
    })

    it('should collect length statistics for array arbitraries', () => {
      const result = detailedScenario()
        .forall('xs', fc.array(fc.integer(-10, 10), 0, 20))
        .then(() => true)
        .check()

      const xsStats = getArbitraryStats(result, 'xs')
      expect(xsStats.samplesGenerated).to.equal(result.statistics.testsRun)
      const lengths = xsStats.arrayLengths
      if (lengths === undefined) throw new Error('Expected arrayLengths')
      expect(lengths.min).to.be.within(0, 20)
      expect(lengths.max).to.be.within(0, 20)
      expect(lengths.count).to.equal(xsStats.samplesGenerated)
    })

    it('should collect length statistics for string arbitraries', () => {
      const result = detailedScenario()
        .forall('s', fc.string(0, 50))
        .then(() => true)
        .check()

      const sStats = getArbitraryStats(result, 's')
      const lengths = sStats.stringLengths
      if (lengths === undefined) throw new Error('Expected stringLengths')
      expect(lengths.min).to.be.within(0, 50)
      expect(lengths.max).to.be.within(0, 50)
      expect(lengths.count).to.equal(sStats.samplesGenerated)
    })

    it('should track corner cases', () => {
      const result = detailedScenario(200)
        .forall('x', fc.integer(0, 10))
        .then(() => true)
        .check()

      const xStats = getArbitraryStats(result, 'x')
      expect(xStats.cornerCases).to.exist
      expect(xStats.cornerCases.tested.length).to.be.at.most(xStats.cornerCases.total)
    })

    it('should not collect arbitrary statistics when disabled', () => {
      const result = basicScenario()
        .forall('x', fc.integer())
        .then(() => true)
        .check()

      expect(result.statistics.arbitraryStats).to.be.undefined
    })

    it('should handle empty test runs gracefully', () => {
      const result = detailedScenario(0)
        .forall('x', fc.integer())
        .then(() => true)
        .check()

      if (result.statistics.arbitraryStats !== undefined) {
        expect(Object.keys(result.statistics.arbitraryStats)).to.have.length(0)
      }
    })
  })

  describe('fc.event()', () => {
    it('should track events and calculate percentages', () => {
      const result = basicScenario()
        .forall('x', fc.integer(-50, 50))
        .then(({x}) => {
          if (x > 0) fc.event('positive')
          if (x < 0) fc.event('negative')
          if (x === 0) fc.event('zero')
          return true
        })
        .check()

      expect(result.statistics.events).to.exist
      expect(result.statistics.eventPercentages).to.exist

      const events = result.statistics.events
      const pcts = result.statistics.eventPercentages
      if (events === undefined || pcts === undefined) throw new Error('Expected events and percentages')

      // Event counts should not exceed tests run (each test triggers at most one)
      const totalEvents = (events['positive'] ?? 0) + (events['negative'] ?? 0) + (events['zero'] ?? 0)
      expect(totalEvents).to.be.at.most(result.statistics.testsRun)

      // Percentages should be in valid range
      for (const pct of Object.values(pcts)) {
        expect(pct).to.be.within(0, 100)
      }
    })

    it('should deduplicate multiple calls with same event name in one test case', () => {
      const result = basicScenario(50)
        .forall('x', fc.integer(0, 10))
        .then(({x}) => {
          if (x > 5) {
            fc.event('large')
            fc.event('large')
            fc.event('large')
          }
          return true
        })
        .check()

      // Should count as one occurrence per test case, not three
      const largeCount = result.statistics.events?.['large'] ?? 0
      expect(largeCount).to.be.at.most(result.statistics.testsRun)
    })

    it('should throw error when called outside property evaluation', () => {
      expect(() => fc.event('test')).to.throw('fc.event() can only be called within a property function')
    })

    it('should work without detailed statistics enabled', () => {
      const result = basicScenario(50)
        .forall('x', fc.integer())
        .then(({x}) => {
          if (x > 0) fc.event('positive')
          return true
        })
        .check()

      expect(result.statistics.events).to.exist
      expect(result.statistics.arbitraryStats).to.be.undefined
    })

    it('should include payloads in debug output', () => {
      const {logger, entries} = createTestLogger()
      fc.scenario()
        .config(fc.strategy().withVerbosity(Verbosity.Debug).withSampleSize(5))
        .forall('x', fc.integer())
        .then(({x}) => {
          fc.event('payload', {x: x})
          return true
        })
        .check({logger})

      expect(entries.some(e => {
        const data = e.data
        const payload = data !== undefined && 'payload' in data ? data['payload'] : undefined
        return e.level === 'debug' && e.message === 'event' && payload !== undefined
      })).to.be.true
    })
  })

  describe('fc.target()', () => {
    it('should track target observations with statistics', () => {
      const result = basicScenario()
        .forall('x', fc.integer(0, 100))
        .then(({x}) => {
          fc.target(x, 'value')
          return true
        })
        .check()

      const targets = result.statistics.targets
      if (targets === undefined) throw new Error('Expected targets')
      const valueTarget = targets['value']
      if (valueTarget === undefined) throw new Error('Expected value target')

      expect(valueTarget.best).to.be.within(0, 100)
      expect(valueTarget.observations).to.equal(result.statistics.testsRun)
      expect(valueTarget.mean).to.be.within(0, 100)
    })

    it('should use default label when not provided', () => {
      const result = basicScenario(50)
        .forall('x', fc.integer(0, 10))
        .then(({x}) => {
          fc.target(x)
          return true
        })
        .check()

      expect(result.statistics.targets?.['default']).to.exist
    })

    it('should track multiple targets with different labels', () => {
      const result = basicScenario()
        .forall('xs', fc.array(fc.integer(0, 10), 0, 20))
        .then(({xs}) => {
          fc.target(xs.length, 'length')
          fc.target(Math.max(...xs, 0), 'max')
          return true
        })
        .check()

      const targets = result.statistics.targets
      if (targets === undefined) throw new Error('Expected targets')
      expect(targets['length']).to.exist
      expect(targets['max']).to.exist
    })

    it('should ignore invalid target observations (NaN, Infinity)', () => {
      const {logger} = createTestLogger()
      const result = basicScenario(50)
        .forall('x', fc.integer(0, 10))
        .then(({x}) => {
          fc.target(x, 'valid')
          fc.target(NaN, 'invalid')
          fc.target(Infinity, 'invalid2')
          return true
        })
        .check({logger})

      const targets = result.statistics.targets
      if (targets === undefined) throw new Error('Expected targets')
      expect(targets['valid']).to.exist
      expect(targets['invalid']).to.be.undefined
      expect(targets['invalid2']).to.be.undefined
    })

    it('should throw error when called outside property evaluation', () => {
      expect(() => fc.target(42)).to.throw('fc.target() can only be called within a property function')
    })

    it('should work without detailed statistics enabled', () => {
      const result = basicScenario(50)
        .forall('x', fc.integer())
        .then(({x}) => {
          fc.target(x, 'value')
          return true
        })
        .check()

      expect(result.statistics.targets).to.exist
      expect(result.statistics.arbitraryStats).to.be.undefined
    })

    it('should log warnings for invalid observations', () => {
      const {logger, entries} = createTestLogger()

      basicScenario(10)
        .forall('x', fc.integer())
        .then(() => {
          fc.target(Number.NaN, 'invalid')
          return true
        })
        .check({logger})

      expect(entries.some((e: LogEntry) => {
        const isWarn = e.level === 'warn'
        const hasMessage = typeof e.message === 'string' && e.message.includes('Invalid target')
        return Boolean(isWarn && hasMessage)
      })).to.be.true
    })
  })

  describe('Statistics with multiple quantifiers', () => {
    it('should collect statistics for each quantifier independently', () => {
      const result = detailedScenario()
        .forall('x', fc.integer(1, 10))
        .forall('y', fc.integer(1, 10))
        .then(() => true)
        .check()

      const xStats = getArbitraryStats(result, 'x')
      const yStats = getArbitraryStats(result, 'y')

      expect(xStats.samplesGenerated).to.be.at.least(1)
      expect(yStats.samplesGenerated).to.be.at.least(1)
    })

    it('should handle nested quantifiers (exists/forall)', () => {
      const result = detailedScenario(50)
        .exists('a', fc.integer(0, 10))
        .forall('b', fc.integer(0, 10))
        .then(() => true)
        .check()

      const aStats = getArbitraryStats(result, 'a')
      const bStats = getArbitraryStats(result, 'b')

      expect(aStats.samplesGenerated).to.be.at.least(1)
      expect(bStats.samplesGenerated).to.be.at.least(aStats.samplesGenerated)
    })
  })

  describe('Statistics with given predicates', () => {
    it('should track all generated samples including filtered ones', () => {
      const result = detailedScenario(200)
        .forall('x', fc.integer(0, 100))
        .given('y', ({x}) => x * 2)
        .then(({x, y}) => {
          fc.pre(x > 0)
          return y === x * 2
        })
        .check()

      const xStats = getArbitraryStats(result, 'x')
      expect(xStats.samplesGenerated).to.be.at.least(result.statistics.testsRun)
    })
  })

  describe('Streaming algorithms', () => {
    it('should calculate distribution statistics correctly', () => {
      const result = detailedScenario(1000)
        .forall('x', fc.integer(0, 100))
        .then(() => true)
        .check()

      const dist = getArbitraryStats(result, 'x').distribution
      if (dist === undefined) throw new Error('Expected distribution')

      // Mean should be roughly centered (uniform distribution)
      expect(dist.mean).to.be.closeTo(50, 15)
      expect(dist.stdDev).to.be.greaterThan(0)

      // Quantiles should be properly ordered
      expect(dist.q1).to.be.at.most(dist.median)
      expect(dist.median).to.be.at.most(dist.q3)
      expect(dist.min).to.be.at.most(dist.q1)
      expect(dist.q3).to.be.at.most(dist.max)
    })
  })

  describe('Verbosity levels', () => {
    beforeEach(() => captureConsole())
    afterEach(() => restoreConsole())

    it('should respect Quiet mode (no output)', () => {
      fc.scenario()
        .config(fc.strategy().withVerbosity(Verbosity.Quiet).withSampleSize(10))
        .forall('x', fc.integer())
        .then(() => true)
        .check({logStatistics: true})

      expect(getCapturedLogs()).to.have.length(0)
    })

    it('should output in Verbose mode', () => {
      fc.scenario()
        .config(fc.strategy().withVerbosity(Verbosity.Verbose).withSampleSize(10))
        .forall('x', fc.integer())
        .then(() => true)
        .check({logStatistics: true})

      expect(getCapturedLogs().length).to.be.greaterThan(0)
    })

    it('should output debug information in Debug mode', () => {
      fc.scenario()
        .config(fc.strategy().withVerbosity(Verbosity.Debug).withSampleSize(10))
        .forall('x', fc.integer())
        .then(() => true)
        .check({logStatistics: true})

      expect(getCapturedLogs().some(log => log.includes('[DEBUG]'))).to.be.true
    })

    it('should suppress logger output in Quiet mode', () => {
      const {logger, entries} = createTestLogger()
      fc.scenario()
        .config(fc.strategy().withVerbosity(Verbosity.Quiet).withSampleSize(10))
        .forall('x', fc.integer())
        .then(() => true)
        .check({logStatistics: true, logger})

      expect(entries).to.have.length(0)
    })
  })

  describe('formatStatistics()', () => {
    it('should format statistics in text, markdown, and JSON formats', () => {
      const result = detailedScenario(50)
        .forall('x', fc.integer(0, 10))
        .then(({x}) => {
          if (x > 5) fc.event('large')
          return true
        })
        .check()

      const text = FluentReporter.formatStatistics(result.statistics, {format: 'text', detailed: true})
      expect(text).to.include('Tests run')
      expect(text).to.include('Tests passed')

      const md = FluentReporter.formatStatistics(result.statistics, {format: 'markdown', detailed: true})
      expect(md).to.include('## Statistics')
      expect(md).to.include('|')

      const json = FluentReporter.formatStatistics(result.statistics, {format: 'json', detailed: true})
      const parsed = JSON.parse(json)
      expect(parsed).to.have.property('testsRun')
      expect(parsed).to.have.property('arbitraryStats')
    })

    it('should truncate labels when maxLabelRows is exceeded', () => {
      const result = basicScenario()
        .forall('x', fc.integer(0, 50))
        .label(({x}) => `label-${x}`)
        .then(() => true)
        .check()

      const formatted = FluentReporter.formatStatistics(result.statistics, {format: 'text', maxLabelRows: 10})
      expect(formatted).to.include('... and')
    })

    it('should include histograms when requested', () => {
      const result = detailedScenario(120)
        .forall('x', fc.integer(0, 20))
        .then(() => true)
        .check()

      const formatted = FluentReporter.formatStatistics(result.statistics, {
        format: 'text',
        detailed: true,
        includeHistograms: true
      })

      expect(formatted).to.include('Histogram')
      expect(formatted).to.include('█')
    })
  })

  describe('Progress callbacks', () => {
    it('should invoke progress callback during test execution', () => {
      const progressCalls: fc.ProgressInfo[] = []

      const result = basicScenario(200)
        .forall('x', fc.integer())
        .then(() => true)
        .check({onProgress: (p) => progressCalls.push(p)})

      expect(progressCalls.length).to.be.greaterThan(0)

      const lastProgress = progressCalls[progressCalls.length - 1]
      if (lastProgress === undefined) throw new Error('Expected at least one progress call')
      expect(lastProgress.testsRun).to.equal(result.statistics.testsRun)
      expect(lastProgress.currentPhase).to.equal('exploring')
    })

    it('should handle progress callback errors gracefully', () => {
      basicScenario()
        .forall('x', fc.integer())
        .then(() => true)
        .check({
          onProgress: () => { throw new Error('Callback error') }
        })
      // Test passes if no exception is thrown
    })

    it('should respect progressInterval option', () => {
      const progressCalls: fc.ProgressInfo[] = []

      const result = basicScenario(500)
        .forall('x', fc.integer())
        .then(() => true)
        .check({onProgress: (p) => progressCalls.push(p), progressInterval: 100})

      expect(progressCalls.length).to.be.at.least(1)
      const lastCall = progressCalls[progressCalls.length - 1]
      if (lastCall === undefined) throw new Error('Expected at least one progress call')
      expect(lastCall.testsRun).to.equal(result.statistics.testsRun)
    })
  })

  describe('Backward compatibility', () => {
    it('should work with existing classification features', () => {
      const result = detailedScenario()
        .forall('x', fc.integer(0, 10))
        .classify(({x}) => x < 5, 'small')
        .classify(({x}) => x >= 5, 'large')
        .then(() => true)
        .check()

      // Both should exist when classification and detailed stats are enabled
      expect(result.statistics.labels).to.exist
      expect(result.statistics.arbitraryStats).to.exist
    })
  })

  describe('Composed arbitraries', () => {
    it('should collect statistics for mapped arbitraries', () => {
      const result = detailedScenario()
        .forall('x', fc.integer(0, 10).map(n => n * 2))
        .then(() => true)
        .check()

      const dist = getArbitraryStats(result, 'x').distribution
      if (dist === undefined) throw new Error('Expected distribution')
      expect(dist.min).to.be.within(0, 20)
      expect(dist.max).to.be.within(0, 20)
    })

    it('should collect statistics for filtered arbitraries', () => {
      const result = detailedScenario(200)
        .forall('x', fc.integer(0, 100).filter(n => n % 2 === 0))
        .then(() => true)
        .check()

      const xStats = getArbitraryStats(result, 'x')
      expect(xStats.samplesGenerated).to.be.at.least(result.statistics.testsRun)
    })
  })

  describe('Performance overhead', () => {
    it('should have acceptable overhead when detailed statistics enabled', () => {
      const measure = (withStats: boolean) => {
        const start = Date.now()
        const scenario = withStats ? detailedScenario() : basicScenario()
        scenario.forall('x', fc.integer()).then(() => true).check()
        return Date.now() - start
      }

      // Warm up and measure
      const iterations = 3
      let timeWithout = 0, timeWith = 0
      for (let i = 0; i < iterations; i++) {
        timeWithout += measure(false)
        timeWith += measure(true)
      }

      const avgWithout = timeWithout / iterations
      const avgWith = timeWith / iterations

      // Only check overhead if baseline is meaningful (>10ms)
      if (avgWithout > 10) {
        const overhead = (avgWith - avgWithout) / avgWithout
        expect(overhead).to.be.lessThan(0.5)
      }
    })
  })
})
