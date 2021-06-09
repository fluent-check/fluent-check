import * as fc from '../../src/index'
import {it} from 'mocha'

function upperCase(text: string) {
  let result = ''

  for (let i = 0; i < text.length; i++)
    result += String.fromCharCode(text.charCodeAt(i) - 32)

  return result
}

describe('Upper case properties', () => {
  it('Resulting string doesn\'t contain lower case letters', () => {
    fc.expect(fc.scenario()
      .forall('text', fc.string(0, 10, fc.char('a', 'z')))
      .then(({text}) => !/[a-z]/.test(upperCase(text)))
      .check()
    )
  })

  it('Resulting string has the same length as original', () => {
    fc.expect(fc.scenario()
      .forall('text', fc.string(0, 10))
      .then(({text}) => text.length === upperCase(text).length)
      .check()
    )
  })
})
