import {FluentResult} from './FluentCheck'
import {existsSync, createWriteStream, writeFileSync} from 'fs'
import {PrintInfo, IndexPath1D, IndexPath2D, CsvFilter, IndexPathBar} from './arbitraries'
import {JSDOM} from 'jsdom'
import {select, scaleLinear, axisBottom, axisLeft} from 'd3'

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
      msg.push(JSON.stringify(result.example[name]))
      msg.push('\n')
    }
  }

  if (result.withTestCaseOutput) {
    msg.push('\nNumber of tested cases: ')
    msg.push(result.testCases.values.length.toString())

    msg.push('\nTested cases written to ')
    msg.push(writeTestCases(result.testCases, result.csvPath, result.csvFilter))
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

  if (result.withGraphs) {
    for (const g of result.indexesForGraphs.bar) {
      msg.push('\nBar graph created in ')
      msg.push(generateBarGraphs(g))
    }

    for (const g of result.indexesForGraphs.oneD) {
      msg.push('\n1D graph created in ')
      msg.push(generate1DGraphs(g))
    }

    for (const g of result.indexesForGraphs.twoD) {
      msg.push('\n2D graph created in ')
      msg.push(generate2DGraphs(g))
    }

    msg.push('\n')
  }

  msg.push('\n------------------------------------------------------------------------\n')
  return msg.join('')
}

function writeTestCases(
  testCases: PrintInfo,
  csvPath = generateIncrementalFileName('scenario', '.csv'),
  csvFilter?: CsvFilter): string {
  const stream = createWriteStream(csvPath)

  if (csvFilter === undefined) {
    for (const arb in testCases.values[0]) {
      stream.write(JSON.stringify(arb).replace(/,/g , ' '))
      stream.write(',')
    }
    stream.write('time,result\n')
    testCases.values.forEach((e, i) => {
      for (const arb in e) {
        stream.write(JSON.stringify(e[arb]).replace(/,/g , ' '))
        stream.write(',')
      }
      stream.write(testCases.time[i].toString())
      stream.write(',')
      stream.write(testCases.result[i].toString())
      stream.write('\n')
    })
  } else {
    const idx = testCases.values.findIndex(o => { return o !== undefined })
    for (const k in csvFilter(testCases.values[idx], testCases.time[idx], testCases.result[idx])) {
      stream.write(JSON.stringify(k).replace(/,/g , ' '))
      stream.write(',')
    }
    stream.write('\n')
    testCases.values.forEach((e, i) => {
      const values = csvFilter(e, testCases.time[i], testCases.result[i])
      if (values !== undefined) {
        for (const val in values) {
          stream.write(values[val].replace(/,/g , ' '))
          stream.write(',')
        }
        stream.write('\n')
      }
    })
  }

  stream.end()
  return csvPath
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

function generate1DGraphs(graph: IndexPath1D) {
  const minIndex = Math.min.apply(null, graph.indexes.map(o => o.value))
  const maxIndex = Math.max.apply(null, graph.indexes.map(o => o.value))
  const maxRepeated = Math.max(...graph.repeated.values())

  const margin = 50
  const width = 1000

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
    .domain([minIndex, maxIndex])
    .range([margin, width + margin])
  svg.append('g')
    .attr('transform', 'translate(0,' + margin + ')')
    .call(axisBottom(x))

  //values
  svg.selectAll('whatever')
    .data(graph.indexes)
    .enter()
    .append('rect')
    .attr('width', 1)
    .attr('height', 8)
    .attr('fill', function (d) {
      const color = scaleLinear()
        .range(['white', d.color ?? 'red'])
        .domain([0, maxRepeated])
      return color(graph.repeated.get(JSON.stringify(d.value)))
    })
    .attr('transform', function (d) { return 'translate(' + x(d.value) + ',' + (margin - 4) + ')' })

  const filename = graph.path ?? generateIncrementalFileName('graph', '.svg')
  writeFileSync(filename, body.html())
  return filename
}

function generate2DGraphs(graph: IndexPath2D) {
  const minIndexX = Math.min.apply(null, graph.indexes.map(idx => idx.valueX))
  const maxIndexX = Math.max.apply(null, graph.indexes.map(idx => idx.valueX))

  const minIndexY = Math.min.apply(null, graph.indexes.map(idx => idx.valueY))
  const maxIndexY = Math.max.apply(null, graph.indexes.map(idx => idx.valueY))

  const maxRepeated = Math.max(...graph.repeated.values())

  const margin1 = 50
  const margin2 = 25
  const width = 1000
  const height = 1000

  const dom = new JSDOM('<!DOCTYPE html><body></body>')
  const body = select(dom.window.document.querySelector('body'))
  const svg = body.append('svg').attr('width', width + margin1 + margin2)
    .attr('height', height + margin1 + margin2).attr('xmlns', 'http://www.w3.org/2000/svg')

  //background
  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'white')

  //axis
  const x = scaleLinear()
    .domain([minIndexX, maxIndexX])
    .range([margin1, width + margin1])
  svg.append('g')
    .attr('transform', 'translate(0,' + (height + margin2) + ')')
    .call(axisBottom(x))

  const y = scaleLinear()
    .domain([minIndexY, maxIndexY])
    .range([height + margin2, margin2])
  svg.append('g')
    .attr('transform', 'translate(' + margin1 + ',0)')
    .call(axisLeft(y))

  //values
  svg.selectAll('whatever')
    .data(graph.indexes)
    .enter()
    .append('circle')
    .attr('cx', function (d) { return x(d.valueX) })
    .attr('cy', function (d) { return y(d.valueY) })
    .attr('r', 2)
    .attr('fill', function (d) {
      const color = scaleLinear()
        .range(['white', d.color ?? 'red'])
        .domain([0, maxRepeated])
      return color(graph.repeated.get(JSON.stringify([d.valueX, d.valueY])))
    })

  const filename = graph.path ?? generateIncrementalFileName('graph', '.svg')
  writeFileSync(filename, body.html())
  return filename
}

function generateBarGraphs(graph: IndexPathBar) {
  const minIndexX = Math.min.apply(null, graph.indexes.map(idx => idx.valueX))
  const maxIndexX = Math.max.apply(null, graph.indexes.map(idx => idx.valueX))

  const maxIndexY = Math.max.apply(null, graph.indexes.map(idx => idx.valueY))

  const margin1 = 50
  const margin2 = 25
  const width = 1000
  const height = 1000

  const rectangleWidth = 500/(graph.indexes.length + 2)

  const dom = new JSDOM('<!DOCTYPE html><body></body>')
  const body = select(dom.window.document.querySelector('body'))
  const svg = body.append('svg').attr('width', width + margin1 + margin2)
    .attr('height', height + margin1 + margin2).attr('xmlns', 'http://www.w3.org/2000/svg')

  //background
  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'white')

  //axis
  const x = scaleLinear()
    .domain([minIndexX - 1, maxIndexX + 1])
    .range([margin1, width + margin1])
  svg.append('g')
    .attr('transform', 'translate(0,' + (height + margin2) + ')')
    .call(axisBottom(x))

  const y = scaleLinear()
    .domain([0, maxIndexY])
    .range([height + margin2, margin2])
  svg.append('g')
    .attr('transform', 'translate(' + margin1 + ',0)')
    .call(axisLeft(y))

  //values
  svg.selectAll('whatever')
    .data(graph.indexes)
    .enter()
    .append('rect')
    .attr('width', rectangleWidth)
    .attr('height', function (d) { return height + margin2 - y(d.valueY) })
    .attr('fill', 'red')
    .attr('transform', function (d) {
      return 'translate(' + (x(d.valueX) - rectangleWidth/2) + ',' + y(d.valueY) + ')'
    })

  //labels
  svg.append('text')
    .attr('font-size', '15px')
    .text('length')
    .attr('transform', 'translate(' + width + ',' + (height + margin1 + 5) + ')')

  svg.append('text')
    .attr('font-size', '15px')
    .text('occurences')
    .attr('transform', function () {
      return 'translate(' + 20 + ',' + (margin2 + 75) + ')rotate(-90)'
    })
  console.log(graph.indexes)
  const filename = graph.path ?? generateIncrementalFileName('graph', '.svg')
  writeFileSync(filename, body.html())
  return filename
}
