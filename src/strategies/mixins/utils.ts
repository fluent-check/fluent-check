import * as fs from 'fs'
import {exec} from 'child_process'
import {dirname} from 'path'

/**
 * Counts and returns the number of decimal cases of a given number.
 */
export function countDecimals(value: number): number {
  const valueArr = value.toString().split('.')
  return Math.floor(value) === value || valueArr.length === 0 ? 0 : valueArr[1].length
}

/**
 * Generates unique method identifiers.
 */
export function generateUniqueMethodIdentifier() {
  return '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * Creates a new directory in a given path if the directory is not already created.
 */
export function createDirectory(path: string) {
  if (!fs.existsSync(path)) fs.mkdirSync(path)
}

/**
 * Writes data to given file located in a given path.
 */
export function writeDataToFile(path: string, data: string) {
  const directory = dirname(path)
  if (!fs.existsSync(directory)) createDirectory(directory)
  fs.writeFileSync(path, data)
}

/**
 * Deletes a given file or directory from the file system.
 */
export function deleteFromFileSystem(path: string) {
  if (fs.existsSync(path)) exec('rm -r ' + path)
}
