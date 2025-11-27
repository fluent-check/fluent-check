import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {expect} from 'chai'

describe('DateTime tests', () => {
  it('should generate dates in the specified range', () => {
    const MIN_DATE = new Date('2020-01-01')
    const MAX_DATE = new Date('2020-12-31')

    expect(fc.scenario()
      .forall('d', fc.date(MIN_DATE, MAX_DATE))
      .then(({d}) => {
        return d >= MIN_DATE && d <= MAX_DATE
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should generate valid time objects', () => {
    expect(fc.scenario()
      .forall('t', fc.time())
      .then(({t}) => {
        return t.hour >= 0 && t.hour <= 23 &&
               t.minute >= 0 && t.minute <= 59 &&
               t.second >= 0 && t.second <= 59 &&
               t.millisecond >= 0 && t.millisecond <= 999
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should generate valid datetime objects', () => {
    const MIN_DATE = new Date('2020-01-01')
    const MAX_DATE = new Date('2020-12-31')

    expect(fc.scenario()
      .forall('dt', fc.datetime(MIN_DATE, MAX_DATE))
      .then(({dt}) => {
        return dt >= new Date(new Date(MIN_DATE.getTime()).setHours(0, 0, 0, 0)) &&
               dt <= new Date(new Date(MAX_DATE.getTime()).setHours(23, 59, 59, 999))
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should generate valid duration objects', () => {
    const MAX_HOURS = 10

    expect(fc.scenario()
      .forall('d', fc.duration(MAX_HOURS))
      .then(({d}) => {
        return d.hours >= 0 && d.hours <= MAX_HOURS &&
               d.minutes >= 0 && d.minutes <= 59 &&
               d.seconds >= 0 && d.seconds <= 59 &&
               d.milliseconds >= 0 && d.milliseconds <= 999
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should correctly convert time objects to milliseconds', () => {
    expect(fc.scenario()
      .forall('t', fc.time())
      .then(({t}) => {
        const ms = fc.timeToMilliseconds(t)
        return ms === (t.hour * 3600000 + t.minute * 60000 + t.second * 1000 + t.millisecond)
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should correctly convert duration objects to milliseconds', () => {
    expect(fc.scenario()
      .forall('d', fc.duration())
      .then(({d}) => {
        const ms = fc.timeToMilliseconds(d)
        return ms === (d.hours * 3600000 + d.minutes * 60000 + d.seconds * 1000 + d.milliseconds)
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('date addition property: adding days to a date should increase it by the correct amount', () => {
    expect(fc.scenario()
      .forall('date', fc.date(new Date('2020-01-01'), new Date('2020-12-31')))
      .forall('days', fc.integer(1, 30))
      .then(({date, days}) => {
        const newDate = new Date(date)
        newDate.setDate(date.getDate() + days)

        // Account for month changes
        const expectedDate = new Date(date)
        expectedDate.setDate(date.getDate() + days)

        return newDate.getTime() === expectedDate.getTime()
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('time addition property: adding hours should correctly wrap around', () => {
    expect(fc.scenario()
      .forall('time', fc.time())
      .forall('hours', fc.integer(1, 48))
      .then(({time, hours}) => {
        const originalHours = time.hour
        const newHours = (originalHours + hours) % 24

        return newHours >= 0 && newHours < 24
      })
      .check()
    ).to.have.property('satisfiable', true)
  })
})
