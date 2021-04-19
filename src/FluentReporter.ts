import {FluentResult} from './FluentCheck'

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
    msg.push(JSON.stringify(result.example))
  }

  if (result.withTestCaseOutput) {
    msg.push('\n\nTest cases (')
    msg.push(result.testCases.length.toString())
    msg.push('):\n')
    msg.push(JSON.stringify(result.testCases))
  }

  if (result.withInputSpaceCoverage) {
    msg.push('\n\nScenario input coverage(%): ')
    msg.push(JSON.stringify(result.coverages[0]))

    msg.push('\n\nInput coverages(%):\n')
    msg.push(JSON.stringify(result.coverages[1]))
  }

  msg.push('\n')
  return msg.join('')
}
