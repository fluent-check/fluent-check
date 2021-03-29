// import * as fc from '../src/index'
// import {it} from 'mocha'
// import {expect} from 'chai'
// import {MySum} from '../src/externalClass'

// describe('Debug tests', () => {
//   it('Testing coverage', () => {
//     expect(fc.scenario()
//       .config(fc.strategy().withRandomSampling(10).withCoverageGuidance('test/debug.test.ts'))
//       .forall('a', fc.integer(0, 20))
//       .forall('b', fc.integer(0, 20))
//       .then(({a, b}) => {
//         const tmp = new MySum()
//         // tmp.mySum(10,2)
//         // tmp.mySum(1,0)
//         // tmp.mySum(2,3)
//         return tmp.mySum(a,b) === a + b
//       })
//       .check()).to.have.property('satisfiable', true)
//   })
// })
