import {FluentCheck} from './FluentCheck'
import {FluentStrategyTypeFactory} from './strategies/FluentStrategyFactory'
import {createDirectory, readDataFromFile, writeDataToFile} from './strategies/mixins/utils'
export {expect} from './FluentReporter'
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
export {
  PBT_R_S1,
  PBT_R_S2,
  PBT_R_S3,
  PBT_R_S4,
  PBT_R_S5,
  PBT_R_S6,
  PBT_R_S7,
  PBT_R_S8,
  PBT_CG_S1,
  PBT_CG_S2,
  PBT_CG_S3,
  PBT_CG_S4,
  PBT_CG_S5,
  PBT_CG_S6,
  PBT_CG_S7,
  PBT_CG_S8
} from './strategies'

/**
 * Exports data from a specific test run.
 */
export function exportTestData(PATH: string, PROJECT: string, testId: string, expected: any, actual: any) {
  // Data to be exported
  let data = {}
  // Create needed directories if not already created
  createDirectory('.benchmarks/')
  createDirectory('.benchmarks/' + PROJECT)
  // Loads current data from file if available
  const fileData = readDataFromFile(PATH)
  if (fileData !== undefined) data = JSON.parse(fileData.toString())
  // Exports data
  data[testId] = {expected, actual}
  writeDataToFile(PATH, JSON.stringify(data))
}
