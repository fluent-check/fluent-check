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

    msg.push('\n\nCounter-example:\n')
    msg.push(JSON.stringify(result.example))

    if (result.withTestCaseOutput) {
      msg.push('\n\nTest cases:\n')
      msg.push(JSON.stringify(result.testCases))
    }

    msg.push('\n')
    this.message = msg.join('')
  }
}
