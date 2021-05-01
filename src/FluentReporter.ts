import {FluentResult} from './FluentCheck'
import {existsSync, createWriteStream, writeFileSync} from 'fs'
import {ValueResult} from './arbitraries'
import {JSDOM} from 'jsdom'
import * as d3 from 'd3'

export function expect(result: FluentResult): void | never {
  if (result.satisfiable) {
    if (result.withOutputOnSuccess)
      console.log(assembleInfo(result))
  } else
    throw new FluentReporter(result)
}

export class FluentReporter extends Error {
  constructor(result: FluentResult) {
    super()
    this.name = 'Property not satisfiable'
    this.message = assembleInfo(result)
  }
}

function assembleInfo(result: FluentResult): string {
  const msg: String[] = []

  msg.push('\n------------------------------------------------------------------------')

  const execTime = result.execTime?.toString() ?? 'error'
  msg.push('\n\nExecution time: ')
  msg.push(execTime)
  if (result.execTime !== undefined)
    msg.push('ms')

  const seed = result.seed?.toString() ?? 'Error'
  msg.push('\n\nSeed: ')
  msg.push(seed.toString())

  if (!result.satisfiable) {
    msg.push('\n\nCounter-example:\n')
    for (const name in result.example) {
      msg.push('\t')
      msg.push(name)
      msg.push(': ')
      msg.push(JSON.stringify(result.coverages[1][name]))
      msg.push('\n')
    }
  }

  if (result.withTestCaseOutput) {
    msg.push('\nNumber of tested cases: ')
    msg.push(result.testCases.length.toString())

    msg.push('\nTested cases written to ')
    msg.push(writeTestCases(result.testCases))
  }

  if (result.withInputSpaceCoverage) {
    msg.push('\n\nScenario input coverage: ')
    msg.push(JSON.stringify(result.coverages[0]))
    msg.push('%')

    msg.push('\n\nArbitrary input coverages:\n')
    for (const name in result.coverages[1]) {
      msg.push('\t')
      msg.push(name)
      msg.push(': ')
      msg.push(JSON.stringify(result.coverages[1][name]))
      msg.push('%\n')
    }
  } else
    msg.push('\n')

  if (result.withConfidenceLevel) {
    msg.push('\nConfidence level: ')
    msg.push(JSON.stringify(result.confidenceLevel))
    msg.push('%\n')
  }

  if (result.withGraphs) {
    msg.push('\nGraphs created in ')
    msg.push(generateGraphs(result.inputScenarioIndexes))
  }

  msg.push('\n------------------------------------------------------------------------\n')
  return msg.join('')
}

function writeTestCases(testCases: ValueResult<any>[]): string {
  const filename = generateIncrementalFileName('scenario', '.csv')
  const stream = createWriteStream(filename)

  const arbs: string[] = []
  for (const arb in testCases[0])
    arbs.push(arb)
  const nArbs = arbs.length
  for (let i = 0; i < nArbs; i++) {
    stream.write(arbs[i])
    i < nArbs - 1 ? stream.write(',') : stream.write('\n')
  }

  testCases.forEach(e => {
    for (let i = 0; i < nArbs; i++) {
      stream.write(e[arbs[i]].toString())
      i < nArbs - 1 ? stream.write(',') : stream.write('\n')
    }
  })

  return filename
}

function generateIncrementalFileName(filename: string, extension: string) {
  let filepath = filename + extension
  let counter = 1
  while (existsSync(filepath)) {
    filepath = filename + counter + extension
    counter++
  }
  return filepath
}

function generateGraphs(indexes: number[]) {
  const dom = new JSDOM('<!DOCTYPE html><body></body>')
  const body = d3.select(dom.window.document.querySelector('body'))
  const svg = body.append('svg').attr('width', 100).attr('height', 100).attr('xmlns', 'http://www.w3.org/2000/svg')
  svg.append('rect')
    .attr('x', 10)
    .attr('y', 10)
    .attr('width', 80)
    .attr('height', 80)
    .style('fill', 'orange')

  const filename = generateIncrementalFileName('graphs', '.svg')
  writeFileSync(filename, body.html())
  return indexes.length.toString()
}
