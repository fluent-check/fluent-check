import {FluentResult} from './FluentCheck'

export function expect(result: FluentResult): void | never {
  if (!result.satisfiable) {
    throw new FluentReporter(result)
  }
}

export class FluentReporter extends Error {
  constructor(result: FluentResult) {
    super()
    this.name = 'Property not satisfiable'
    const msg: String[] = []

    const seed = result.seed?.toString() ?? 'Error'
    msg.push('\n\nSeed: ')
    msg.push(seed.toString())

    msg.push('\n\nCounter-example:\n')
    msg.push(JSON.stringify(result.example))

    if (result.withTestCaseOutput) {
      msg.push('\n\nTest cases:\n')
      msg.push(JSON.stringify(result.testCases))
    }

    if (result.withInputSpaceCoverage) {
      msg.push('\n\nInput coverages(%):\n')
      msg.push(JSON.stringify(result.coverages))
    }

    msg.push('\n')
    this.message = msg.join('')
  }
}
