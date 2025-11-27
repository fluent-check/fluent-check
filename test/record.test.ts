import * as fc from '../src/index.js'
import {expect} from 'chai'
import {it, describe} from 'mocha'

describe('Record Arbitrary', () => {
  describe('basic generation', () => {
    it('generates objects with typed properties', () => {
      const arb = fc.record({
        name: fc.string(1, 5),
        age: fc.integer(0, 120)
      })

      const samples = arb.sample(10)
      expect(samples.length).to.equal(10)

      for (const sample of samples) {
        expect(sample.value).to.have.property('name')
        expect(sample.value).to.have.property('age')
        expect(typeof sample.value.name).to.equal('string')
        expect(typeof sample.value.age).to.equal('number')
        expect(sample.value.age).to.be.at.least(0)
        expect(sample.value.age).to.be.at.most(120)
      }
    })

    it('generates empty objects from empty schema', () => {
      const arb = fc.record({})
      const samples = arb.sample(5)

      expect(samples.length).to.equal(5)
      for (const sample of samples) {
        expect(sample.value).to.deep.equal({})
      }
    })

    it('generates objects with boolean properties', () => {
      const arb = fc.record({
        active: fc.boolean(),
        verified: fc.boolean()
      })

      const samples = arb.sample(20)
      for (const sample of samples) {
        expect(typeof sample.value.active).to.equal('boolean')
        expect(typeof sample.value.verified).to.equal('boolean')
      }
    })
  })

  describe('nested records', () => {
    it('generates nested object structures', () => {
      const arb = fc.record({
        user: fc.record({
          name: fc.string(1, 10),
          email: fc.string(5, 20)
        }),
        active: fc.boolean()
      })

      const samples = arb.sample(10)
      for (const sample of samples) {
        expect(sample.value).to.have.property('user')
        expect(sample.value).to.have.property('active')
        expect(sample.value.user).to.have.property('name')
        expect(sample.value.user).to.have.property('email')
        expect(typeof sample.value.user.name).to.equal('string')
        expect(typeof sample.value.active).to.equal('boolean')
      }
    })
  })

  describe('NoArbitrary handling', () => {
    it('returns NoArbitrary if any property is NoArbitrary', () => {
      const arb = fc.record({
        valid: fc.integer(0, 10),
        invalid: fc.empty()
      })

      expect(arb.size().value).to.equal(0)
      expect(arb.sample(5)).to.deep.equal([])
    })
  })

  describe('size calculation', () => {
    it('calculates size as product of property sizes', () => {
      const arb = fc.record({
        a: fc.integer(0, 2),  // size 3
        b: fc.integer(0, 4)   // size 5
      })

      expect(arb.size().value).to.equal(15)
    })

    it('empty schema has size 1', () => {
      const arb = fc.record({})
      expect(arb.size().value).to.equal(1)
    })
  })

  describe('corner cases', () => {
    it('generates corner cases as combinations of property corner cases', () => {
      const arb = fc.record({
        n: fc.integer(0, 10),
        b: fc.boolean()
      })

      const cases = arb.cornerCases()
      expect(cases.length).to.be.greaterThan(0)

      // Should include combinations like {n: 0, b: true}, {n: 0, b: false}, etc.
      const values = cases.map(c => c.value)
      expect(values.some(v => v.n === 0)).to.be.true
      expect(values.some(v => v.n === 10)).to.be.true
    })

    it('empty schema returns single empty object corner case', () => {
      const arb = fc.record({})
      const cases = arb.cornerCases()

      expect(cases.length).to.equal(1)
      expect(cases[0].value).to.deep.equal({})
    })
  })

  describe('canGenerate', () => {
    it('returns true for valid picks', () => {
      const arb = fc.record({
        x: fc.integer(0, 10),
        y: fc.integer(0, 10)
      })

      expect(arb.canGenerate({value: {x: 5, y: 5}, original: {x: 5, y: 5}})).to.be.true
    })

    it('returns false for invalid picks', () => {
      const arb = fc.record({
        x: fc.integer(0, 10),
        y: fc.integer(0, 10)
      })

      expect(arb.canGenerate({value: {x: 100, y: 5}, original: {x: 100, y: 5}})).to.be.false
    })
  })

  describe('shrinking', () => {
    it('shrinks record properties independently', () => {
      const arb = fc.record({
        a: fc.integer(0, 100),
        b: fc.integer(0, 100)
      })

      const initial = {value: {a: 50, b: 75}, original: {a: 50, b: 75}}
      const shrunk = arb.shrink(initial)

      expect(shrunk.size().value).to.be.greaterThan(0)
      const samples = shrunk.sample(10)
      expect(samples.length).to.be.greaterThan(0)
    })

    it('empty schema shrink returns empty', () => {
      const arb = fc.record({})
      const initial = {value: {}, original: {}}
      const shrunk = arb.shrink(initial)

      expect(shrunk.size().value).to.equal(0)
    })
  })

  describe('property-based tests', () => {
    it('all generated values satisfy schema constraints', () => {
      fc.scenario()
        .forall('obj', fc.record({
          count: fc.integer(0, 50),
          enabled: fc.boolean()
        }))
        .then(({obj}) =>
          typeof obj.count === 'number' &&
          obj.count >= 0 &&
          obj.count <= 50 &&
          typeof obj.enabled === 'boolean'
        )
        .check()
        .assertSatisfiable()
    })

    it('nested records maintain structure', () => {
      fc.scenario()
        .forall('data', fc.record({
          config: fc.record({
            timeout: fc.integer(100, 5000),
            retries: fc.integer(0, 5)
          }),
          name: fc.string(1, 20)
        }))
        .then(({data}) =>
          typeof data.config.timeout === 'number' &&
          typeof data.config.retries === 'number' &&
          typeof data.name === 'string'
        )
        .check()
        .assertSatisfiable()
    })
  })

  describe('type inference', () => {
    it('infers correct types from schema (compile-time check)', () => {
      const arb = fc.record({
        id: fc.integer(1, 1000),
        name: fc.string(1, 50),
        active: fc.boolean()
      })

      const sample = arb.sample(1)[0]
      // These assignments verify type inference at compile time
      const id: number = sample.value.id
      const name: string = sample.value.name
      const active: boolean = sample.value.active

      expect(typeof id).to.equal('number')
      expect(typeof name).to.equal('string')
      expect(typeof active).to.equal('boolean')
    })
  })
})
