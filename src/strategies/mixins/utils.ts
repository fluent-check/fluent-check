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
  if (path.includes('fluent-check')) {
    const pathData = path.split('fluent-check')
    let currPath = pathData[0] + 'fluent-check/'
    for (const subPath of pathData[1].split('/').filter(x => x !== '')) {
      currPath += subPath
      if (!fs.existsSync(currPath)) fs.mkdirSync(currPath)
      currPath += '/'
    }
  }
  else if (!fs.existsSync(path)) fs.mkdirSync(path)
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
 * Reads data from a given file located in a given path. It returns undefined
 * if the file does not exist.
 */
export function readDataFromFile(path: string) {
  if (fs.existsSync(path)) return fs.readFileSync(path)
  return undefined
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
export function extractImports(path: string, coverageID = '') {
  const files = fs.lstatSync(path).isDirectory() ?
    glob.sync(path + '/**/*', {nodir: true}) : [path]

  const imports = {}
  const sourceFiles: string[] = []

  for (const file of files) {
    const data = fs.readFileSync(file).toString().split('describe')[0].split('\n')
    const importData = data.filter(x => !x.startsWith('//') && x.includes('import'))

    for (const x of importData) {
      if (x.includes('* as fc') || x.includes('* as bc')) continue

      const relativePath = x.substring(x.indexOf('\'') + 1, x.length - 1) as string
      const resolvedPath = relativePath.includes('src') && coverageID !== '' ?
        '../.instrumented/' + coverageID + relativePath.split('src')[1] : relativePath

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
 * Merges two subarrays of a given array.
 */
function merge(arr: any[][], map: Map<number, Map<any, number>>, l: number, m: number, r: number) {
  const n1 = m - l + 1
  const n2 = r - m

  const L: any[][] = []
  const R: any[][] = []

  for (let i = 0; i < n1; ++i) L.push(arr[l + i])
  for (let j = 0; j < n2; ++j) R.push(arr[m + 1 + j])

  let k = l
  let i = 0, j = 0

  while (i < n1 && j < n2) {
    let isSmaller = false
    for (let z = 0; z < L[i].length; z++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const w = map.get(z)!.get(L[i][z])! - map.get(z)!.get(R[j][z])!
      if (w > 0) break
      else if (w < 0) {
        isSmaller = true
        break
      }
    }
    if (isSmaller) arr[k++] = L[i++]
    else arr[k++] = R[j++]
  }
  while (i < n1) { arr[k++] = L[i++] }
  while (j < n2) { arr[k++] = R[j++] }
}

/**
 * Algorithm used to order the pairwise combinations.
 */
function mergeSort(arr: any[][], map: Map<number, Map<any, number>>, l: number, r:number) {
  if (l < r) {
    const m = Math.floor(l + (r-l)/2)
    mergeSort(arr, map, l, m)
    mergeSort(arr, map, m + 1, r)
    merge(arr, map, l, m, r)
  }
}

/**
 * Recursively computes and returns all the possible combinations for a given array of arrays.
 */
function nwise(data: any[][]) {
  if (data.length < 2) return data.length === 0 ? data : data[0].map(x => [x])
  else if (data.length === 2) {
    return data[0].reduce((acc, value) => {
      for (const elem of data[1])
        if (Array.isArray(elem)) acc.push([value, ...elem])
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

  const dataMap: Map<number, Map<any, number>> = new Map()
  for (let i = 0; i < data.length; i++) {
    dataMap.set(i, new Map())
    for (let j = 0; j < data[i].length; j++)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      dataMap.get(i)!.set(data[i][j], j)
  }

  let originalData = [... data]

  data.sort((x, y) => y.length - x.length)
  originalData = originalData.map(x => [originalData.indexOf(x), data.indexOf(x)])

  const combinations: any[][] = []
  for (const value of data[0]) {
    let subArrIndex = 0
    combinations.push(...Array(data[1].length).fill(value).map(x => [x, data[1][subArrIndex++]]))
  }

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

  const unsortedCombinations: any[][] = []

  for (const combination of combinations) {
    const tmpArr: any[] = []
    for (const elem of originalData)
      tmpArr.push(combination[elem[1]])
    unsortedCombinations.push(tmpArr)
  }

  mergeSort(unsortedCombinations, dataMap, 0, unsortedCombinations.length - 1)

  return unsortedCombinations
}

/**
 * Returns an array with nwise combinations. Currently it only supports complete-wise and
 * pair-wise combinations.
 */
export function computeCombinations(data: any[][], N?: number): any[][] {
  if (data.some(x => x.length === 0)) return []

  switch (N) {
    case 2:
      return data.length === 2 ? nwise(data) : pairwise(data)
    default:
      return nwise(data)
  }
}
