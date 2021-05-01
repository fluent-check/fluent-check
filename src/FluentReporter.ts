import {FluentResult} from './FluentCheck'
import {existsSync, createWriteStream, writeFileSync} from 'fs'
import {ValueResult} from './arbitraries'
import {JSDOM} from 'jsdom'
import {select, scaleLinear, axisBottom} from 'd3'

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
    for (const g of result.indexesForGraphs.oneD) {
      msg.push('\n1D graph created in ')
      msg.push(generate1DGraphs(g))
    }

    for (const g of result.indexesForGraphs.twoD) {
      msg.push('\n2D graph created in ')
      msg.push(generate2DGraphs(g))
    }
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

function generate1DGraphs(indexes: number[]) {
  const maxIndex = Math.max.apply(null, indexes)

  const margin = 25
  const width = maxIndex*10

  const dom = new JSDOM('<!DOCTYPE html><body></body>')
  const body = select(dom.window.document.querySelector('body'))
  const svg = body.append('svg').attr('width', width + 2 * margin)
    .attr('height', 2 * margin).attr('xmlns', 'http://www.w3.org/2000/svg')

  //background
  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'white')

  //axis
  const x = scaleLinear()
    .domain([0, maxIndex])
    .range([margin, width + margin])
  svg.append('g')
    .attr('transform', 'translate(0,' + margin + ')')
    .call(axisBottom(x))

  //values
  svg.selectAll('whatever')
    .data(indexes)
    .enter()
    .append('rect')
    .attr('width', 1)
    .attr('height', 6)
    .attr('fill', 'red')
    .attr('transform', function (v) { return 'translate(' + x(v) + ',' + (margin - 3) + ')' })

  const filename = generateIncrementalFileName('graph', '.svg')
  writeFileSync(filename, body.html())
  return filename
}

function generate2DGraphs(indexes: [number, number][]) {
  const maxIndexX = Math.max.apply(null, indexes.map(idx => idx[0]))
  const maxIndexY = Math.max.apply(null, indexes.map(idx => idx[1]))

  const margin = 25
  const width = maxIndexX*10
  const height = maxIndexY*10

  const dom = new JSDOM('<!DOCTYPE html><body></body>')
  const body = select(dom.window.document.querySelector('body'))
  const svg = body.append('svg').attr('width', width + 2 * margin)
    .attr('height', height + 2 * margin).attr('xmlns', 'http://www.w3.org/2000/svg')

  //background
  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'white')

  //axis
  const x = scaleLinear()
    .domain([0, maxIndexX])
    .range([margin, width + margin])
  svg.append('g')
    .attr('transform', 'translate(0,' + margin + ')')
    .call(axisBottom(x))

  const y = scaleLinear()
    .domain([0, maxIndexY])
    .range([margin, height + margin])
  svg.append('g')
    .attr('transform', 'translate(' + margin + ',0)')
    .call(axisBottom(x))

  //values
  svg.selectAll('whatever')
    .data(indexes)
    .enter()
    .attr('cx', function (d) { return x(d.x) })
    .attr('cy', function (d) { return y(d.y) })
    .attr('r', 1)

  const filename = generateIncrementalFileName('graph', '.svg')
  writeFileSync(filename, body.html())
  return filename
}
