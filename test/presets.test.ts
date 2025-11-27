import * as fc from '../src/index.js'
import {describe, it} from 'mocha'
import * as chai from 'chai'
const {expect} = chai

describe('Arbitrary Presets', () => {
  describe('Integer Presets', () => {
    describe('positiveInt()', () => {
      it('should only generate integers >= 1', () => {
        expect(fc.scenario()
          .forall('n', fc.positiveInt())
          .then(({n}) => n >= 1)
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should generate values up to MAX_SAFE_INTEGER', () => {
        const arb = fc.positiveInt()
        const samples = arb.sample(100)
        expect(samples.every(s => s.value >= 1 && s.value <= Number.MAX_SAFE_INTEGER)).to.be.true
      })

      it('should have corner cases including 1 and MAX_SAFE_INTEGER', () => {
        const corners = fc.positiveInt().cornerCases().map(c => c.value)
        expect(corners).to.include(1)
        expect(corners).to.include(Number.MAX_SAFE_INTEGER)
      })

      it('should never generate zero', () => {
        const samples = fc.positiveInt().sampleWithBias(1000)
        expect(samples.every(s => s.value !== 0)).to.be.true
      })
    })

    describe('negativeInt()', () => {
      it('should only generate integers <= -1', () => {
        expect(fc.scenario()
          .forall('n', fc.negativeInt())
          .then(({n}) => n <= -1)
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should generate values down to MIN_SAFE_INTEGER', () => {
        const arb = fc.negativeInt()
        const samples = arb.sample(100)
        expect(samples.every(s => s.value <= -1 && s.value >= Number.MIN_SAFE_INTEGER)).to.be.true
      })

      it('should have corner cases including -1 and MIN_SAFE_INTEGER', () => {
        const corners = fc.negativeInt().cornerCases().map(c => c.value)
        expect(corners).to.include(-1)
        expect(corners).to.include(Number.MIN_SAFE_INTEGER)
      })

      it('should never generate zero', () => {
        const samples = fc.negativeInt().sampleWithBias(1000)
        expect(samples.every(s => s.value !== 0)).to.be.true
      })
    })

    describe('nonZeroInt()', () => {
      it('should never generate zero', () => {
        expect(fc.scenario()
          .forall('n', fc.nonZeroInt())
          .then(({n}) => n !== 0)
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should generate both positive and negative integers', () => {
        const samples = fc.nonZeroInt().sampleWithBias(1000)
        const hasPositive = samples.some(s => s.value > 0)
        const hasNegative = samples.some(s => s.value < 0)
        expect(hasPositive).to.be.true
        expect(hasNegative).to.be.true
      })

      it('should have appropriate corner cases', () => {
        const corners = fc.nonZeroInt().cornerCases().map(c => c.value)
        expect(corners).to.not.include(0)
      })
    })

    describe('byte()', () => {
      it('should only generate integers in range [0, 255]', () => {
        expect(fc.scenario()
          .forall('n', fc.byte())
          .then(({n}) => n >= 0 && n <= 255)
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should have corner cases including 0 and 255', () => {
        const corners = fc.byte().cornerCases().map(c => c.value)
        expect(corners).to.include(0)
        expect(corners).to.include(255)
      })

      it('should have exact size of 256', () => {
        expect(fc.byte().size()).to.deep.include({value: 256, type: 'exact'})
      })
    })
  })

  describe('String Presets', () => {
    describe('nonEmptyString()', () => {
      it('should only generate strings with length >= 1', () => {
        expect(fc.scenario()
          .forall('s', fc.nonEmptyString())
          .then(({s}) => s.length >= 1)
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should respect maxLength parameter', () => {
        expect(fc.scenario()
          .forall('s', fc.nonEmptyString(5))
          .then(({s}) => s.length >= 1 && s.length <= 5)
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should default to maxLength of 100', () => {
        const samples = fc.nonEmptyString().sampleWithBias(100)
        expect(samples.every(s => s.value.length >= 1 && s.value.length <= 100)).to.be.true
      })

      it('should never generate empty strings', () => {
        const samples = fc.nonEmptyString().sampleWithBias(1000)
        expect(samples.every(s => s.value.length > 0)).to.be.true
      })
    })
  })

  describe('Collection Presets', () => {
    describe('nonEmptyArray()', () => {
      it('should only generate arrays with length >= 1', () => {
        expect(fc.scenario()
          .forall('arr', fc.nonEmptyArray(fc.integer()))
          .then(({arr}) => arr.length >= 1)
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should respect maxLength parameter', () => {
        expect(fc.scenario()
          .forall('arr', fc.nonEmptyArray(fc.integer(), 3))
          .then(({arr}) => arr.length >= 1 && arr.length <= 3)
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should generate elements from the provided arbitrary', () => {
        expect(fc.scenario()
          .forall('arr', fc.nonEmptyArray(fc.integer(0, 10)))
          .then(({arr}) => arr.every(n => n >= 0 && n <= 10))
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should never generate empty arrays', () => {
        const samples = fc.nonEmptyArray(fc.integer()).sampleWithBias(100)
        expect(samples.every(s => s.value.length > 0)).to.be.true
      })

      it('should default to maxLength of 10', () => {
        const samples = fc.nonEmptyArray(fc.integer()).sampleWithBias(100)
        expect(samples.every(s => s.value.length >= 1 && s.value.length <= 10)).to.be.true
      })
    })

    describe('pair()', () => {
      it('should generate 2-tuples', () => {
        expect(fc.scenario()
          .forall('p', fc.pair(fc.integer()))
          .then(({p}) => Array.isArray(p) && p.length === 2)
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should generate both elements from the same arbitrary', () => {
        expect(fc.scenario()
          .forall('p', fc.pair(fc.integer(0, 10)))
          .then(({p}) => p[0] >= 0 && p[0] <= 10 && p[1] >= 0 && p[1] <= 10)
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should work with different arbitrary types', () => {
        const strPair = fc.pair(fc.string(1, 3)).sample(1)[0].value
        expect(strPair).to.have.length(2)
        expect(typeof strPair[0]).to.equal('string')
        expect(typeof strPair[1]).to.equal('string')
      })

      it('should have the correct type shape', () => {
        const samples = fc.pair(fc.boolean()).sample(10)
        for (const s of samples) {
          expect(s.value).to.be.an('array')
          expect(s.value.length).to.equal(2)
          expect(typeof s.value[0]).to.equal('boolean')
          expect(typeof s.value[1]).to.equal('boolean')
        }
      })
    })
  })

  describe('Nullable/Optional Presets', () => {
    describe('nullable()', () => {
      it('should generate values or null', () => {
        expect(fc.scenario()
          .forall('v', fc.nullable(fc.integer(0, 10)))
          .then(({v}) => v === null || (typeof v === 'number' && v >= 0 && v <= 10))
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should sometimes generate null', () => {
        const samples = fc.nullable(fc.integer()).sampleWithBias(1000)
        const hasNull = samples.some(s => s.value === null)
        expect(hasNull).to.be.true
      })

      it('should sometimes generate non-null values', () => {
        const samples = fc.nullable(fc.integer()).sampleWithBias(1000)
        const hasNonNull = samples.some(s => s.value !== null)
        expect(hasNonNull).to.be.true
      })

      it('should preserve the wrapped arbitrary type', () => {
        const samples = fc.nullable(fc.string(1, 5)).sample(100)
        for (const s of samples) {
          expect(s.value === null || typeof s.value === 'string').to.be.true
        }
      })
    })

    describe('optional()', () => {
      it('should generate values or undefined', () => {
        expect(fc.scenario()
          .forall('v', fc.optional(fc.integer(0, 10)))
          .then(({v}) => v === undefined || (typeof v === 'number' && v >= 0 && v <= 10))
          .check()
        ).to.have.property('satisfiable', true)
      })

      it('should sometimes generate undefined', () => {
        const samples = fc.optional(fc.integer()).sampleWithBias(1000)
        const hasUndefined = samples.some(s => s.value === undefined)
        expect(hasUndefined).to.be.true
      })

      it('should sometimes generate defined values', () => {
        const samples = fc.optional(fc.integer()).sampleWithBias(1000)
        const hasDefined = samples.some(s => s.value !== undefined)
        expect(hasDefined).to.be.true
      })

      it('should preserve the wrapped arbitrary type', () => {
        const samples = fc.optional(fc.boolean()).sample(100)
        for (const s of samples) {
          expect(s.value === undefined || typeof s.value === 'boolean').to.be.true
        }
      })
    })
  })

  describe('Type Inference', () => {
    it('positiveInt should infer number type', () => {
      const _n: number = fc.positiveInt().sample(1)[0].value
      expect(typeof _n).to.equal('number')
    })

    it('byte should infer number type', () => {
      const _b: number = fc.byte().sample(1)[0].value
      expect(typeof _b).to.equal('number')
    })

    it('nonEmptyString should infer string type', () => {
      const _s: string = fc.nonEmptyString().sample(1)[0].value
      expect(typeof _s).to.equal('string')
    })

    it('nonEmptyArray should infer array type', () => {
      const _arr: number[] = fc.nonEmptyArray(fc.integer()).sample(1)[0].value
      expect(Array.isArray(_arr)).to.be.true
    })

    it('pair should infer tuple type', () => {
      const _p: [number, number] = fc.pair(fc.integer()).sample(1)[0].value
      expect(Array.isArray(_p)).to.be.true
      expect(_p.length).to.equal(2)
    })

    it('nullable should infer T | null type', () => {
      const _v: number | null = fc.nullable(fc.integer()).sample(1)[0].value
      expect(_v === null || typeof _v === 'number').to.be.true
    })

    it('optional should infer T | undefined type', () => {
      const _v: number | undefined = fc.optional(fc.integer()).sample(1)[0].value
      expect(_v === undefined || typeof _v === 'number').to.be.true
    })
  })

  describe('Composition', () => {
    it('presets should compose with map', () => {
      const doubled = fc.positiveInt().map(n => n * 2)
      const samples = doubled.sample(10)
      expect(samples.every(s => s.value >= 2 && s.value % 2 === 0)).to.be.true
    })

    it('presets should compose with filter', () => {
      const evenBytes = fc.byte().filter(n => n % 2 === 0)
      const samples = evenBytes.sample(100)
      expect(samples.every(s => s.value % 2 === 0)).to.be.true
    })

    it('presets can be used in tuples', () => {
      const t = fc.tuple(fc.positiveInt(), fc.nonEmptyString(5), fc.byte())
      const sample = t.sample(1)[0].value
      expect(sample[0]).to.be.a('number').and.be.at.least(1)
      expect(sample[1]).to.be.a('string').and.have.length.at.least(1)
      expect(sample[2]).to.be.a('number').and.be.at.least(0).and.be.at.most(255)
    })

    it('nullable can wrap other presets', () => {
      const nullablePositive = fc.nullable(fc.positiveInt())
      expect(fc.scenario()
        .forall('v', nullablePositive)
        .then(({v}) => v === null || v >= 1)
        .check()
      ).to.have.property('satisfiable', true)
    })

    it('nonEmptyArray can contain pairs', () => {
      const arrOfPairs = fc.nonEmptyArray(fc.pair(fc.byte()), 5)
      expect(fc.scenario()
        .forall('arr', arrOfPairs)
        .then(({arr}) => arr.length >= 1 && arr.every(p => p.length === 2))
        .check()
      ).to.have.property('satisfiable', true)
    })
  })

  describe('Shrinking', () => {
    it('positiveInt should shrink toward 1', () => {
      const result = fc.scenario()
        .exists('n', fc.positiveInt())
        .then(({n}) => n > 100)
        .check()
      result.assertSatisfiable()
      // Shrinking should find the smallest value > 100
      expect(result.example?.n).to.equal(101)
    })

    it('byte should shrink toward 0', () => {
      const result = fc.scenario()
        .exists('n', fc.byte())
        .then(({n}) => n > 50)
        .check()
      result.assertSatisfiable()
      expect(result.example?.n).to.equal(51)
    })

    it('nonEmptyArray should shrink toward minimal length', () => {
      const result = fc.scenario()
        .exists('arr', fc.nonEmptyArray(fc.integer(0, 10), 5))
        .then(({arr}) => arr.length > 2)
        .check()
      result.assertSatisfiable()
      // Should shrink to the smallest array that satisfies length > 2
      expect(result.example?.arr.length).to.equal(3)
    })
  })

  describe('Real-world Use Cases', () => {
    it('nonZeroInt is safe for division', () => {
      fc.scenario()
        .forall('dividend', fc.integer(-1000, 1000))
        .forall('divisor', fc.nonZeroInt())
        .then(({dividend, divisor}) => {
          // This should never throw - divisor is never 0
          const quotient = Math.trunc(dividend / divisor)
          const remainder = dividend % divisor
          return quotient * divisor + remainder === dividend
        })
        .check()
        .assertSatisfiable()
    })

    it('nonEmptyArray is safe for array operations', () => {
      fc.scenario()
        .forall('arr', fc.nonEmptyArray(fc.integer()))
        .then(({arr}) => {
          // These operations are safe because arr is never empty
          const first = arr[0]
          const last = arr[arr.length - 1]
          const sum = arr.reduce((a, b) => a + b, 0)
          const avg = sum / arr.length
          return typeof first === 'number' && typeof last === 'number' && !isNaN(avg)
        })
        .check()
        .assertSatisfiable()
    })

    it('nullable models optional API responses', () => {
      interface ApiResponse {
        data: number | null
        error: string | null
      }

      fc.scenario()
        .forall('data', fc.nullable(fc.integer(0, 100)))
        .forall('error', fc.nullable(fc.nonEmptyString(50)))
        .given('response', ({data, error}): ApiResponse => ({data, error}))
        .then(({response}) => {
          // Valid response: either has data or error, but not both null
          if (response.data !== null) {
            return response.data >= 0 && response.data <= 100
          }
          return true
        })
        .check()
        .assertSatisfiable()
    })

    it('pair models coordinate points', () => {
      fc.scenario()
        .forall('point', fc.pair(fc.integer(-100, 100)))
        .then(({point}) => {
          const [x, y] = point
          const distance = Math.sqrt(x * x + y * y)
          return distance >= 0 // Distance is always non-negative
        })
        .check()
        .assertSatisfiable()
    })

    it('byte is suitable for RGB color components', () => {
      // Use tuple instead of three separate foralls for better performance
      fc.scenario()
        .forall('rgb', fc.tuple(fc.byte(), fc.byte(), fc.byte()))
        .then(({rgb}) => {
          const [r, g, b] = rgb
          // Valid RGB components
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
          return /^#[0-9a-f]{6}$/.test(hex)
        })
        .check()
        .assertSatisfiable()
    })

    it('optional models function parameters with defaults', () => {
      const processConfig = (value?: number): number => {
        return value ?? 42 // Default to 42 if undefined
      }

      fc.scenario()
        .forall('input', fc.optional(fc.integer(0, 100)))
        .then(({input}) => {
          const result = processConfig(input)
          if (input === undefined) {
            return result === 42
          }
          return result === input
        })
        .check()
        .assertSatisfiable()
    })
  })

  describe('Edge Cases', () => {
    it('nonEmptyString(1) generates single characters', () => {
      const samples = fc.nonEmptyString(1).sample(100)
      expect(samples.every(s => s.value.length === 1)).to.be.true
    })

    it('nonEmptyArray with maxLength 1 generates single-element arrays', () => {
      const samples = fc.nonEmptyArray(fc.integer(), 1).sample(100)
      expect(samples.every(s => s.value.length === 1)).to.be.true
    })

    it('pair of constants generates identical pairs', () => {
      const samples = fc.pair(fc.constant(42)).sample(10)
      expect(samples.every(s => s.value[0] === 42 && s.value[1] === 42)).to.be.true
    })

    it('nullable of empty generates only null', () => {
      // When wrapped arbitrary is empty, only null is generated
      const samples = fc.nullable(fc.empty()).sample(100)
      expect(samples.every(s => s.value === null)).to.be.true
    })

    it('optional of empty generates only undefined', () => {
      // When wrapped arbitrary is empty, only undefined is generated
      const samples = fc.optional(fc.empty()).sample(100)
      expect(samples.every(s => s.value === undefined)).to.be.true
    })

    it('nested nullable creates T | null | null which simplifies to T | null', () => {
      const samples = fc.nullable(fc.nullable(fc.integer(0, 10))).sampleWithBias(100)
      for (const s of samples) {
        expect(s.value === null || (typeof s.value === 'number' && s.value >= 0 && s.value <= 10)).to.be.true
      }
    })

    it('nonEmptyArray of nonEmptyArray ensures nested structure', () => {
      fc.scenario()
        .forall('matrix', fc.nonEmptyArray(fc.nonEmptyArray(fc.byte(), 3), 3))
        .then(({matrix}) => {
          return matrix.length >= 1 &&
                 matrix.every(row => row.length >= 1) &&
                 matrix.every(row => row.every(cell => cell >= 0 && cell <= 255))
        })
        .check()
        .assertSatisfiable()
    })
  })

  describe('Property-based Verification', () => {
    it('positiveInt * positiveInt is always positive', () => {
      fc.scenario()
        .forall('a', fc.positiveInt())
        .forall('b', fc.positiveInt())
        .then(({a, b}) => a * b > 0)
        .check()
        .assertSatisfiable()
    })

    it('negativeInt * negativeInt is always positive', () => {
      fc.scenario()
        .forall('a', fc.negativeInt())
        .forall('b', fc.negativeInt())
        .then(({a, b}) => a * b > 0)
        .check()
        .assertSatisfiable()
    })

    it('positiveInt + positiveInt is always > 1', () => {
      fc.scenario()
        .forall('a', fc.positiveInt())
        .forall('b', fc.positiveInt())
        .then(({a, b}) => a + b > 1)
        .check()
        .assertSatisfiable()
    })

    it('nonEmptyString concatenation is never empty', () => {
      fc.scenario()
        .forall('a', fc.nonEmptyString(50))
        .forall('b', fc.nonEmptyString(50))
        .then(({a, b}) => (a + b).length >= 2)
        .check()
        .assertSatisfiable()
    })

    it('byte arithmetic stays in range with modulo', () => {
      fc.scenario()
        .forall('a', fc.byte())
        .forall('b', fc.byte())
        .then(({a, b}) => {
          const sum = (a + b) % 256
          return sum >= 0 && sum <= 255
        })
        .check()
        .assertSatisfiable()
    })
  })
})
