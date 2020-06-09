import * as fc from 'fast-check'
import { expect, assert } from 'chai'

// declare function describe(name: string, f: () => void): void;
// declare function given(name: string, id: string, f: () => void): void;
// declare function is(name: string, id: string, f: () => void): void;

// const sut = describe('A binary operation', (sut) => {
//     given('An integer named a', 'a', () => fc.nat()),
//     given('An integer named b', 'b', () => fc.nat()),
//     is('Is associative', (sut, a, b) => sut(a, b).eq(sut(b, a))),

//     // is('Has neutral', (sut, a, b) => forall(a).exists(b).suchThat(sut(a, b)).eq(a).and(sut(b, a)).eq(a),
//     // is('Has neutral', (sut, a, b) => forall(a).exists(b).suchThat(sut(a, b)).eq(a).and(sut(b, a)).eq(a),    
// })
   
function exists<A>(bs: fc.Arbitrary<A>, property: (a: number, b: A) => boolean) {
    const as = fc.integer()

    const generatedBs: A[] = []    
    fc.assert(fc.property(bs, b => { generatedBs.push(b) }), { numRuns: 1000 })

    const b = [...new Set(generatedBs)].find(b => {
        try {
            fc.assert(fc.property(as, a => property(a, b)))
            return true
        } catch {
            return false
        }
    })

    return b
}

const neutralElement = (a: number, b: number) => (a * b) === a && (b * a) === a

exists(fc.integer(), neutralElement) //? 
