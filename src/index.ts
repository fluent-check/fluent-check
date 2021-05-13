import {FluentCheck} from './FluentCheck'
import {FluentStrategyTypeFactory} from './strategies/FluentStrategyFactory'
import {createDirectory, readDataFromFile, writeDataToFile} from './strategies/mixins/utils'
export {expect} from './FluentReporter'
export {getConfiguration} from './strategies'
export const scenario = () => new FluentCheck()
export const strategy = () => new FluentStrategyTypeFactory()
export {
  integer,
  real,
  nat,
  char,
  hex,
  base64,
  ascii,
  unicode,
  string,
  array,
  union,
  boolean,
  empty,
  constant,
  set,
  tuple,
  oneof
} from './arbitraries'

/**
 * Exports data from a specific test run.
 */
export function exportTestData(PATH: string, testId: string, expected: any, actual: any) {
  // Data to be exported
  let data = {}
  // Create needed directories if not already created
  createDirectory('.benchmarks/')
  createDirectory('.benchmarks/' + process.env.FLUENT_CHECK_PROJECT)
  createDirectory('.benchmarks/' + process.env.FLUENT_CHECK_PROJECT + '/M' + process.env.FLUENT_CHECK_MUTATION_ID)
  // Loads current data from file if available
  const fileData = readDataFromFile(PATH)
  if (fileData !== undefined) data = JSON.parse(fileData.toString())
  // Exports data
  data[testId] = {expected, actual}
  writeDataToFile(PATH, JSON.stringify(data))
}
