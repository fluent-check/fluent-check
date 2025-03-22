import { Arbitrary, ArbitraryInteger, NoArbitrary } from './internal.js'
import { tuple, integer } from './index.js'

/**
 * Date arbitrary - generates random Date objects within a specified range
 * @param minDate The minimum date (inclusive). Defaults to Jan 1, 1970.
 * @param maxDate The maximum date (inclusive). Defaults to current date + 100 years.
 * @returns An arbitrary that generates Date objects
 */
export const date = (
  minDate: Date = new Date(0),
  maxDate: Date = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
): Arbitrary<Date> => {
  const minTimestamp = minDate.getTime()
  const maxTimestamp = maxDate.getTime()
  
  if (minTimestamp > maxTimestamp) return NoArbitrary
  
  return integer(minTimestamp, maxTimestamp).map(timestamp => new Date(timestamp))
}

/**
 * Time arbitrary - generates random time objects with hour, minute, second, millisecond
 * @returns An arbitrary that generates time objects { hour, minute, second, millisecond }
 */
export const time = (): Arbitrary<{ hour: number; minute: number; second: number; millisecond: number }> => {
  return tuple(
    integer(0, 23),
    integer(0, 59),
    integer(0, 59),
    integer(0, 999)
  ).map(([hour, minute, second, millisecond]) => ({ hour, minute, second, millisecond }))
}

/**
 * DateTime arbitrary - combines date and time to generate complete datetime objects
 * @param minDate The minimum date (inclusive). Defaults to Jan 1, 1970.
 * @param maxDate The maximum date (inclusive). Defaults to current date + 100 years.
 * @returns An arbitrary that generates Date objects with specific time components
 */
export const datetime = (
  minDate: Date = new Date(0),
  maxDate: Date = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
): Arbitrary<Date> => {
  // Get dates with time set to midnight
  const minTimestamp = new Date(minDate).setHours(0, 0, 0, 0)
  const maxTimestamp = new Date(maxDate).setHours(23, 59, 59, 999)
  
  if (minTimestamp > maxTimestamp) return NoArbitrary
  
  return tuple(
    integer(minTimestamp, maxTimestamp),
    integer(0, 23),
    integer(0, 59),
    integer(0, 59),
    integer(0, 999)
  ).map(([timestamp, hour, minute, second, millisecond]) => {
    const result = new Date(timestamp)
    result.setHours(hour, minute, second, millisecond)
    return result
  })
}

/**
 * Duration arbitrary - generates random time duration objects
 * @param maxHours The maximum number of hours. Defaults to 24.
 * @returns An arbitrary that generates duration objects { hours, minutes, seconds, milliseconds }
 */
export const duration = (
  maxHours: number = 24
): Arbitrary<{ hours: number; minutes: number; seconds: number; milliseconds: number }> => {
  if (maxHours < 0) return NoArbitrary
  
  return tuple(
    integer(0, maxHours),
    integer(0, 59),
    integer(0, 59),
    integer(0, 999)
  ).map(([hours, minutes, seconds, milliseconds]) => ({ hours, minutes, seconds, milliseconds }))
}

/**
 * Utility for converting a time object to milliseconds
 * @param time The time object to convert
 * @returns The equivalent duration in milliseconds
 */
export const timeToMilliseconds = (
  time: { hour?: number; minute?: number; second?: number; millisecond?: number } |
        { hours?: number; minutes?: number; seconds?: number; milliseconds?: number }
): number => {
  const h = 'hours' in time ? time.hours || 0 : 'hour' in time ? time.hour || 0 : 0
  const m = 'minutes' in time ? time.minutes || 0 : 'minute' in time ? time.minute || 0 : 0
  const s = 'seconds' in time ? time.seconds || 0 : 'second' in time ? time.second || 0 : 0
  const ms = 'milliseconds' in time ? time.milliseconds || 0 : 'millisecond' in time ? time.millisecond || 0 : 0
  
  return h * 3600000 + m * 60000 + s * 1000 + ms
} 