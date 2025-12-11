import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {expect} from 'chai'
import {Verbosity, FluentReporter} from '../src/index'

describe('Detailed Statistics', () => {
  describe('withDetailedStatistics()', () => {
    it('should collect arbitrary statistics for integer arbitraries', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(100))
        .forall('x', fc.integer(1, 100))
        .then(({x}) => x >= 1 && x <= 100)
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.arbitraryStats).to.exist

      if (result.statistics.arbitraryStats !== undefined) {
        const xStats = result.statistics.arbitraryStats['x']
        if (xStats === undefined) throw new Error('xStats missing')

        expect(xStats.samplesGenerated).to.equal(result.statistics.testsRun)
        expect(xStats.uniqueValues).to.be.at.least(1)
        expect(xStats.uniqueValues).to.be.at.most(xStats.samplesGenerated)
        expect(xStats.distribution).to.exist

        if (xStats.distribution !== undefined) {
          expect(xStats.distribution.min).to.be.at.least(1)
          expect(xStats.distribution.max).to.be.at.most(100)
          expect(xStats.distribution.mean).to.be.at.least(1)
          expect(xStats.distribution.mean).to.be.at.most(100)
          expect(xStats.distribution.median).to.be.at.least(1)
          expect(xStats.distribution.median).to.be.at.most(100)
          expect(xStats.distribution.stdDev).to.be.at.least(0)
          expect(xStats.distribution.count).to.equal(xStats.samplesGenerated)
        }
      }
    })

    it('should collect arbitrary statistics for array arbitraries', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(100))
        .forall('xs', fc.array(fc.integer(-10, 10), 0, 20))
        .then(({xs}) => Array.isArray(xs))
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.arbitraryStats).to.exist

      if (result.statistics.arbitraryStats !== undefined) {
        const xsStats = result.statistics.arbitraryStats['xs']
        if (xsStats === undefined) throw new Error('xsStats missing')

        expect(xsStats.samplesGenerated).to.equal(result.statistics.testsRun)
        expect(xsStats.arrayLengths).to.exist

        if (xsStats.arrayLengths !== undefined) {
          expect(xsStats.arrayLengths.min).to.be.at.least(0)
          expect(xsStats.arrayLengths.max).to.be.at.most(20)
          expect(xsStats.arrayLengths.mean).to.be.at.least(0)
          expect(xsStats.arrayLengths.count).to.equal(xsStats.samplesGenerated)
        }
      }
    })

    it('should collect arbitrary statistics for string arbitraries', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(100))
        .forall('s', fc.string(0, 50))
        .then(({s}) => typeof s === 'string')
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.arbitraryStats).to.exist

      if (result.statistics.arbitraryStats !== undefined) {
        const sStats = result.statistics.arbitraryStats['s']
        if (sStats === undefined) throw new Error('sStats missing')

        expect(sStats.stringLengths).to.exist

        if (sStats.stringLengths !== undefined) {
          expect(sStats.stringLengths.min).to.be.at.least(0)
          expect(sStats.stringLengths.max).to.be.at.most(50)
          expect(sStats.stringLengths.count).to.equal(sStats.samplesGenerated)
        }
      }
    })

    it('should track corner cases', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(200))
        .forall('x', fc.integer(0, 10))
        .then(({x}) => x >= 0 && x <= 10)
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.arbitraryStats !== undefined) {
        const xStats = result.statistics.arbitraryStats['x']
        if (xStats === undefined) throw new Error('xStats missing')

        expect(xStats.cornerCases).to.exist
        expect(xStats.cornerCases.total).to.be.at.least(0)
        expect(xStats.cornerCases.tested.length).to.be.at.most(xStats.cornerCases.total)
      }
    })

    it('should not collect arbitrary statistics when disabled', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withSampleSize(100))
        .forall('x', fc.integer())
        .then(({_x}) => true)
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.arbitraryStats).to.be.undefined
    })

    it('should handle empty test runs gracefully', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(0))
        .forall('x', fc.integer())
        .then(({_x}) => true)
        .check()

      expect(result.satisfiable).to.be.true
      // When no tests run, arbitraryStats may be undefined or empty
      if (result.statistics.arbitraryStats !== undefined) {
        expect(Object.keys(result.statistics.arbitraryStats)).to.have.length(0)
      }
    })
  })

  describe('fc.event()', () => {
    it('should track events during test execution', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer(-50, 50))
        .then(({x}) => {
          if (x > 0) fc.event('positive')
          if (x < 0) fc.event('negative')
          if (x === 0) fc.event('zero')
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.events).to.exist

      if (result.statistics.events !== undefined) {
        expect(result.statistics.events['positive'] ?? 0).to.be.at.least(0)
        expect(result.statistics.events['negative'] ?? 0).to.be.at.least(0)
        expect(result.statistics.events['zero'] ?? 0).to.be.at.least(0)

        // Event counts should not exceed tests run
        const totalEvents = (result.statistics.events['positive'] ?? 0) +
          (result.statistics.events['negative'] ?? 0) +
          (result.statistics.events['zero'] ?? 0)
        expect(totalEvents).to.be.at.most(result.statistics.testsRun)
      }
    })

    it('should calculate event percentages', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer(0, 1))
        .then(({x}) => {
          if (x === 0) fc.event('zero')
          if (x === 1) fc.event('one')
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.eventPercentages).to.exist

      if (result.statistics.eventPercentages !== undefined) {
        const zeroPct = result.statistics.eventPercentages['zero'] ?? 0
        const onePct = result.statistics.eventPercentages['one'] ?? 0
        expect(zeroPct).to.be.at.least(0)
        expect(zeroPct).to.be.at.most(100)
        expect(onePct).to.be.at.least(0)
        expect(onePct).to.be.at.most(100)
      }
    })

    it('should deduplicate multiple calls with same event name in one test case', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(50))
        .forall('x', fc.integer(0, 10))
        .then(({x}) => {
          // Call event multiple times with same name
          if (x > 5) {
            fc.event('large')
            fc.event('large')
            fc.event('large')
          }
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.events !== undefined) {
        // Should count as one occurrence per test case, not three
        const largeCount = result.statistics.events['large'] ?? 0
        expect(largeCount).to.be.at.most(result.statistics.testsRun)
      }
    })

    it('should throw error when called outside property evaluation', () => {
      expect(() => {
        fc.event('test')
      }).to.throw('fc.event() can only be called within a property function')
    })

    it('should work without detailed statistics enabled', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(50))
        .forall('x', fc.integer())
        .then(({x}) => {
          if (x > 0) fc.event('positive')
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
      // Events should still be tracked even without detailed statistics
      expect(result.statistics.events).to.exist
      expect(result.statistics.arbitraryStats).to.be.undefined
    })
  })

  describe('fc.target()', () => {
    it('should track target observations', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer(0, 100))
        .then(({x}) => {
          fc.target(x, 'value')
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.targets).to.exist

      if (result.statistics.targets !== undefined) {
        const valueTarget = result.statistics.targets['value']
        if (valueTarget === undefined) throw new Error('valueTarget missing')

        expect(valueTarget.best).to.be.at.least(0)
        expect(valueTarget.best).to.be.at.most(100)
        expect(valueTarget.observations).to.equal(result.statistics.testsRun)
        expect(valueTarget.mean).to.be.at.least(0)
        expect(valueTarget.mean).to.be.at.most(100)
      }
    })

    it('should use default label when not provided', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(50))
        .forall('x', fc.integer(0, 10))
        .then(({x}) => {
          fc.target(x)
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.targets !== undefined) {
        expect(result.statistics.targets['default']).to.exist
      }
    })

    it('should track multiple targets with different labels', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('xs', fc.array(fc.integer(0, 10), 0, 20))
        .then(({xs}) => {
          fc.target(xs.length, 'length')
          fc.target(Math.max(...xs, 0), 'max')
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.targets !== undefined) {
        expect(result.statistics.targets['length']).to.exist
        expect(result.statistics.targets['max']).to.exist

        const lengthTarget = result.statistics.targets['length']
        const maxTarget = result.statistics.targets['max']

        if (lengthTarget !== undefined) expect(lengthTarget.best).to.be.at.least(0)
        if (maxTarget !== undefined) expect(maxTarget.best).to.be.at.least(0)
      }
    })

    it('should ignore invalid target observations (NaN, Infinity)', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(50))
        .forall('x', fc.integer(0, 10))
        .then(({x}) => {
          fc.target(x, 'valid')
          fc.target(NaN, 'invalid')
          fc.target(Infinity, 'invalid2')
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.targets !== undefined) {
        expect(result.statistics.targets['valid']).to.exist
        expect(result.statistics.targets['invalid']).to.be.undefined
        expect(result.statistics.targets['invalid2']).to.be.undefined
      }
    })

    it('should throw error when called outside property evaluation', () => {
      expect(() => {
        fc.target(42)
      }).to.throw('fc.target() can only be called within a property function')
    })

    it('should work without detailed statistics enabled', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(50))
        .forall('x', fc.integer())
        .then(({x}) => {
          fc.target(x, 'value')
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
      // Targets should still be tracked even without detailed statistics
      expect(result.statistics.targets).to.exist
      expect(result.statistics.arbitraryStats).to.be.undefined
    })
  })

  describe('Statistics with multiple quantifiers', () => {
    it('should collect statistics for each quantifier independently', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(100))
        .forall('x', fc.integer(1, 10))
        .forall('y', fc.integer(1, 10))
        .then(({x, y}) => x + y >= 2)
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.arbitraryStats !== undefined) {
        expect(result.statistics.arbitraryStats['x']).to.exist
        expect(result.statistics.arbitraryStats['y']).to.exist

        const xStats = result.statistics.arbitraryStats['x']
        const yStats = result.statistics.arbitraryStats['y']

        if (xStats !== undefined && yStats !== undefined) {
          expect(xStats.samplesGenerated).to.be.at.least(1)
          expect(yStats.samplesGenerated).to.be.at.least(1)
          expect(xStats.samplesGenerated + yStats.samplesGenerated).to.be.at.least(result.statistics.testsRun)
        }
      }
    })

    it('should handle nested quantifiers (forall inside exists)', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(50))
        .exists('a', fc.integer(0, 10))
        .forall('b', fc.integer(0, 10))
        .then(({a, b}) => a + b === b + a)
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.arbitraryStats !== undefined) {
        expect(result.statistics.arbitraryStats['a']).to.exist
        expect(result.statistics.arbitraryStats['b']).to.exist

        const aStats = result.statistics.arbitraryStats['a']
        const bStats = result.statistics.arbitraryStats['b']

        if (aStats !== undefined && bStats !== undefined) {
          expect(aStats.samplesGenerated).to.be.at.least(1)
          expect(bStats.samplesGenerated).to.be.at.least(aStats.samplesGenerated)
        }
      }
    })
  })

  describe('Statistics with given predicates', () => {
    it('should track all generated samples including filtered ones', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(200))
        .forall('x', fc.integer(0, 100))
        .given('y', ({x}) => x * 2)
        .then(({x, y}) => {
          fc.pre(x > 0) // Filter out x === 0
          return y === x * 2
        })
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.arbitraryStats !== undefined) {
        const xStats = result.statistics.arbitraryStats['x']
        if (xStats !== undefined) {
          expect(xStats.samplesGenerated).to.be.at.least(result.statistics.testsRun)
        }
      }
    })
  })

  describe('Streaming algorithms', () => {
    it('should calculate mean and variance correctly using Welford\'s algorithm', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(1000))
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0 && x <= 100)
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.arbitraryStats?.['x']?.distribution !== undefined) {
        const dist = result.statistics.arbitraryStats['x'].distribution
        expect(dist.mean).to.be.closeTo(50, 10)
        expect(dist.stdDev).to.be.greaterThan(0)
      }
    })

    it('should estimate quantiles within reasonable bounds', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(1000))
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0 && x <= 100)
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.arbitraryStats?.['x']?.distribution !== undefined) {
        const dist = result.statistics.arbitraryStats['x'].distribution
        expect(dist.median).to.be.at.least(dist.min)
        expect(dist.median).to.be.at.most(dist.max)
        expect(dist.q1).to.be.at.most(dist.median)
        expect(dist.median).to.be.at.most(dist.q3)
        expect(dist.q1).to.be.at.most(dist.q3)
      }
    })
  })

  describe('Verbosity levels', () => {
    it('should respect Quiet mode (no output)', () => {
      const originalLog = console.log
      const logs: string[] = []
      console.log = (...args: unknown[]) => {
        logs.push(args.join(' '))
      }

      try {
        const result = fc.scenario()
          .config(fc.strategy()
            .withVerbosity(Verbosity.Quiet)
            .withSampleSize(10))
          .forall('x', fc.integer())
          .then(({_x}) => true)
          .check({logStatistics: true})

        expect(result.satisfiable).to.be.true
        expect(logs).to.have.length(0)
      } finally {
        console.log = originalLog
      }
    })

    it('should output in Verbose mode', () => {
      const originalLog = console.log
      const logs: string[] = []
      console.log = (...args: unknown[]) => {
        logs.push(args.join(' '))
      }

      try {
        const result = fc.scenario()
          .config(fc.strategy()
            .withVerbosity(Verbosity.Verbose)
            .withSampleSize(10))
          .forall('x', fc.integer())
          .then(({_x}) => true)
          .check({logStatistics: true})

        expect(result.satisfiable).to.be.true
        expect(logs.length).to.be.greaterThan(0)
      } finally {
        console.log = originalLog
      }
    })

    it('should output debug information in Debug mode', () => {
      const originalLog = console.log
      const logs: string[] = []
      console.log = (...args: unknown[]) => {
        logs.push(args.join(' '))
      }

      try {
        const result = fc.scenario()
          .config(fc.strategy()
            .withVerbosity(Verbosity.Debug)
            .withSampleSize(10))
          .forall('x', fc.integer())
          .then(({_x}) => true)
          .check({logStatistics: true})

        expect(result.satisfiable).to.be.true
        const hasDebug = logs.some(log => log.includes('[DEBUG]'))
        expect(hasDebug).to.be.true
      } finally {
        console.log = originalLog
      }
    })
  })

  describe('formatStatistics()', () => {
    it('should format statistics as text', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(50))
        .forall('x', fc.integer(0, 10))
        .then(({x}) => {
          if (x > 5) fc.event('large')
          return true
        })
        .check()

      const formatted = FluentReporter.formatStatistics(result.statistics, {
        format: 'text',
        detailed: true
      })

      expect(formatted).to.be.a('string')
      expect(formatted).to.include('Tests run')
      expect(formatted).to.include('Tests passed')
    })

    it('should format statistics as markdown', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(50))
        .forall('x', fc.integer(0, 10))
        .then(({_x}) => true)
        .check()

      const formatted = FluentReporter.formatStatistics(result.statistics, {
        format: 'markdown',
        detailed: true
      })

      expect(formatted).to.be.a('string')
      expect(formatted).to.include('## Statistics')
      expect(formatted).to.include('|')
    })

    it('should format statistics as JSON', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(50))
        .forall('x', fc.integer(0, 10))
        .then(({_x}) => true)
        .check()

      const formatted = FluentReporter.formatStatistics(result.statistics, {
        format: 'json',
        detailed: true
      })

      expect(formatted).to.be.a('string')
      const parsed = JSON.parse(formatted)
      expect(parsed).to.have.property('testsRun')
      expect(parsed).to.have.property('arbitraryStats')
    })

    it('should truncate labels when maxLabelRows is exceeded', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer(0, 50))
        .label(({x}) => `label-${x}`)
        .then(({_x}) => true)
        .check()

      const formatted = FluentReporter.formatStatistics(result.statistics, {
        format: 'text',
        maxLabelRows: 10
      })

      expect(formatted).to.include('... and')
    })
  })

  describe('Progress callbacks', () => {
    it('should invoke progress callback during test execution', () => {
      const progressCalls: fc.ProgressInfo[] = []

      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(200))
        .forall('x', fc.integer())
        .then(({_x}) => true)
        .check({
          onProgress: (progress) => {
            progressCalls.push(progress)
          }
        })

      expect(result.satisfiable).to.be.true
      expect(progressCalls.length).to.be.greaterThan(0)

      const lastProgress = progressCalls[progressCalls.length - 1]
      if (lastProgress === undefined) throw new Error('lastProgress missing')
      expect(lastProgress.testsRun).to.equal(result.statistics.testsRun)
      expect(lastProgress.currentPhase).to.equal('exploring')
    })

    it('should handle progress callback errors gracefully', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer())
        .then(({_x}) => true)
        .check({
          onProgress: () => {
            throw new Error('Callback error')
          }
        })

      expect(result.satisfiable).to.be.true
    })

    it('should respect progressInterval option', () => {
      const progressCalls: fc.ProgressInfo[] = []

      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(500))
        .forall('x', fc.integer())
        .then(({_x}) => true)
        .check({
          onProgress: (progress) => {
            progressCalls.push(progress)
          },
          progressInterval: 100
        })

      expect(result.satisfiable).to.be.true
      expect(progressCalls.length).to.be.at.least(1)
      const lastProgress = progressCalls[progressCalls.length - 1]
      if (lastProgress === undefined) throw new Error('lastProgress missing')
      expect(lastProgress.testsRun).to.equal(result.statistics.testsRun)
    })
  })

  describe('Backward compatibility', () => {
    it('should work without any new options (backward compatible)', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer())
        .then(({_x}) => true)
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.testsRun).to.be.a('number')
      expect(result.statistics.testsPassed).to.be.a('number')
      expect(result.statistics.testsDiscarded).to.be.a('number')
      expect(result.statistics.executionTimeMs).to.be.a('number')
    })

    it('should work with existing classification features', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(100))
        .forall('x', fc.integer(0, 10))
        .classify(({x}) => x < 5, 'small')
        .classify(({x}) => x >= 5, 'large')
        .then(({_x}) => true)
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.labels).to.exist
      expect(result.statistics.arbitraryStats).to.exist
    })
  })

  describe('Composed arbitraries', () => {
    it('should collect statistics for mapped arbitraries', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(100))
        .forall('x', fc.integer(0, 10).map(n => n * 2))
        .then(({x}) => x >= 0 && x <= 20)
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.arbitraryStats !== undefined) {
        const xStats = result.statistics.arbitraryStats['x']
        expect(xStats).to.exist
        if (xStats?.distribution !== undefined) {
          expect(xStats.distribution.min).to.be.at.least(0)
          expect(xStats.distribution.max).to.be.at.most(20)
        }
      }
    })

    it('should collect statistics for filtered arbitraries', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withDetailedStatistics()
          .withSampleSize(200))
        .forall('x', fc.integer(0, 100).filter(n => n % 2 === 0))
        .then(({x}) => x % 2 === 0)
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.arbitraryStats !== undefined) {
        const xStats = result.statistics.arbitraryStats['x']
        expect(xStats).to.exist
        if (xStats !== undefined) {
          expect(xStats.samplesGenerated).to.be.at.least(result.statistics.testsRun)
        }
      }
    })
  })

  describe('Performance overhead', () => {
    it('should have acceptable overhead when detailed statistics enabled', () => {
      const iterations = 3
      let totalTimeWithout = 0
      let totalTimeWith = 0

      for (let i = 0; i < iterations; i++) {
        const startWithout = Date.now()
        const resultWithout = fc.scenario()
          .config(fc.strategy().withSampleSize(100))
          .forall('x', fc.integer())
          .then(({_x}) => true)
          .check()
        totalTimeWithout += Date.now() - startWithout

        const startWith = Date.now()
        const resultWith = fc.scenario()
          .config(fc.strategy()
            .withDetailedStatistics()
            .withSampleSize(100))
          .forall('x', fc.integer())
          .then(({_x}) => true)
          .check()
        totalTimeWith += Date.now() - startWith

        expect(resultWithout.satisfiable).to.be.true
        expect(resultWith.satisfiable).to.be.true
      }

      const avgTimeWithout = totalTimeWithout / iterations
      const avgTimeWith = totalTimeWith / iterations
      const overhead = avgTimeWithout > 0 ? (avgTimeWith - avgTimeWithout) / avgTimeWithout : 0

      if (avgTimeWithout > 10) {
        expect(overhead).to.be.lessThan(0.5)
      }
    })
  })
})
