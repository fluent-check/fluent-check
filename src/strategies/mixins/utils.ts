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
