import type {FluentResult} from './FluentCheck.js'

export function expect<Rec extends {}>(result: FluentResult<Rec>): void | never {
  if (!result.satisfiable) {
    throw new FluentReporter(result)
  }
}

export class FluentReporter extends Error {
  constructor(result: FluentResult<{}>) {
    super()
    this.name = 'Property not satisfiable'

    const msg: String[] = []
    msg.push('\n\nCounter-example:')
    msg.push(JSON.stringify(result.example))
    msg.push('')
    this.message = msg.join('\n')
  }
}
