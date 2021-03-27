// import * as fc from '../src/index'
// import {it} from 'mocha'
// import {expect} from 'chai'
// import {MySum} from '../src/externalClass'

// describe('Debug tests', () => {
//   it('Testing coverage', () => {
//     expect(fc.scenario()
//       .config(fc.strategy().defaultStrategy().withCoverageGuidance('test/debug.test.ts'))
//       .forall('a', fc.integer())
//       .forall('b', fc.integer())
//       .then(({a, b}) => {
//         const tmp = new MySum()
//         return tmp.mySum(a,b) === a + b
//       })
//       .check()).to.have.property('satisfiable', true)
//   })
// })
