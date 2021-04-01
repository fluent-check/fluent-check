import * as fs from 'fs'
import * as glob from 'glob'
import {exec} from 'child_process'
import {dirname, resolve} from 'path'

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

/**
 * Extracts all the imports from a given file or directory and returns an object containing a string with a
 * concise version of the imports found with the relative paths converted into absolute ones and an array
 * containing all the imported source files.
 */
export function extractImports(path: string) {
  const files = fs.lstatSync(path).isDirectory() ?
    glob.sync(path + '/**/*', {nodir: true}) : [path]

  const imports = {}
  const sourceFiles: string[] = []

  for (const file of files) {
    const data = fs.readFileSync(file).toString().split('describe')[0].split('\n')
    const importData = data.filter(x => !x.startsWith('//') && x.includes('import'))

    for (const x of importData) {
      const relativePath = x.substring(x.indexOf('\'') + 1, x.length - 1) as string
      const resolvedPath = relativePath

      if (relativePath.includes('/') && !relativePath.includes('@'))
        sourceFiles.push(resolve(relativePath.split('../').join('')))

      const X = x.split('\'')[0].concat('\'' + resolvedPath + '\'')

      if (imports[resolvedPath] === undefined) imports[resolvedPath] = X
      else imports[resolvedPath] = imports[resolvedPath].length < X.length ? X : imports[resolvedPath]
    }
  }

  let header = ''
  Object.entries(imports).forEach(element => { header += element[1] + '\n' })
  return {header: header + '\n', sourceFiles}
}

/**
 * Recursively computes and returns all the possible combinations for a given array of arrays.
 */
function nwise(data: any[][]) {
  if (data.length < 2) return data.length === 0 ?
    data : data[0].reduce((acc, value) => acc.concat([[value]]), [])
  else if (data.length === 2) {
    return data[0].reduce((acc, value) => {
      for (const elem of data[1])
        if (Array.isArray(elem)) acc.push([value].concat(elem))
        else acc.push([value, elem])
      return acc
    }, [])
  }
  else return nwise(data.slice(0, data.length - 2).concat([nwise(data.slice(data.length - 2, data.length))]))
}

/**
 * Returns all possible pair combinations for a given array of arrays.
 */
function pairwise(data: any[][]) {
  if (data.length < 2) return data.length === 0 ?
    data : data[0].reduce((acc, value) => acc.concat([[value]]), [])

  data.sort((x, y) => y.length - x.length)

  const combinations = data[0].reduce((acc, value) => {
    let subArrIndex = 0
    return acc.concat([...Array(data[1].length).fill(value).map(x => [x, data[1][subArrIndex++]])])
  }, [])

  let currIndex = 2
  let reverse = data.length > 2 && data[1].length === data[2].length ? true : false

  while (currIndex < data.length) {
    if (reverse) data[currIndex].reverse()
    let currSubArrIndex = 0

    for (let i = 0; i < combinations.length; i++) {
      if (i % data[1].length === 0 && i !== 0) {
        currSubArrIndex = 0
        data[currIndex].push(data[currIndex].shift())
      }
      combinations[i].push(data[currIndex][currSubArrIndex++])
      currSubArrIndex = currSubArrIndex >= data[currIndex].length ? 0 : currSubArrIndex
    }

    currIndex++
    reverse = !reverse
  }

  return combinations
}

/**
 * Returns an array with nwise combinations. Currently it only supports nwise (all possible combinations) and
 * pairwise combinations.
 */
export function computeCombinations(data: any[][], N?: number): any[][] {
  switch (N) {
    case 2:
      return pairwise(data.filter(x => x.length > 0))
    default:
      return nwise(data.filter(x => x.length > 0))
  }
}
