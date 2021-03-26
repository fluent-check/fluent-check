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

    msg.push('\n')
    this.message = msg.join('')
  }
}
