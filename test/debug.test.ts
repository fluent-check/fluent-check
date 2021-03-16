import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

// describe('Debug tests', () => {
//   it('...', () => {
//     expect(fc.scenario()
//       .forall('a', fc.integer(-10, 10))
//       .forall('b', fc.integer(-10, 10))
//       .then(({a, b}) => a + b === b + a)
//       .check()
//     ).to.have.property('satisfiable', true)
//   })
// })

console.log(fc.char().pick())
console.log(fc.hexa().pick())
console.log(fc.base64().pick())
console.log(fc.ascii().pick())

