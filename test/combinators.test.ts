import {expect} from 'chai'
import * as fc from '../src/index.js'

describe('Property Helpers (fc.props)', () => {
  describe('mathematical predicates (composable)', () => {
    describe('roundtrips', () => {
      it('should return true for JSON roundtrip', () => {
        expect(fc.props.roundtrips([1, 2, 3], JSON.stringify, JSON.parse)).to.be.true
      })

      it('should return true for identity functions', () => {
        expect(fc.props.roundtrips(42, (x: number) => x, (x: number) => x)).to.be.true
      })

      it('should work in scenario', () => {
        fc.scenario()
          .forall('data', fc.array(fc.integer(-100, 100), 0, 5))
          .then(({data}) => fc.props.roundtrips(data, JSON.stringify, JSON.parse))
          .check()
          .assertSatisfiable()
      })

      it('should work with dynamic encoder', () => {
        fc.scenario()
          .config(fc.strategies.minimal)
          .forall('n', fc.integer(0, 100))
          .then(({n}) => fc.props.roundtrips(n, (x: number) => x.toString(), (s: string) => parseInt(s, 10)))
          .check()
          .assertSatisfiable()
      })
    })

    describe('isIdempotent', () => {
      it('should return true for Math.abs', () => {
        expect(fc.props.isIdempotent(-5, Math.abs)).to.be.true
        expect(fc.props.isIdempotent(5, Math.abs)).to.be.true
      })

      it('should work in scenario', () => {
        fc.scenario()
          .config(fc.strategies.fast)
          .forall('n', fc.integer(-100, 100))
          .then(({n}) => fc.props.isIdempotent(n, Math.abs))
          .check()
          .assertSatisfiable()
      })
    })

    describe('commutes', () => {
      it('should return true for addition', () => {
        expect(fc.props.commutes(3, 5, (a, b) => a + b)).to.be.true
      })

      it('should return false for subtraction', () => {
        expect(fc.props.commutes(3, 5, (a, b) => a - b)).to.be.false
      })

      it('should work in scenario', () => {
        fc.scenario()
          .config(fc.strategies.fast)
          .forall('a', fc.integer(-100, 100))
          .forall('b', fc.integer(-100, 100))
          .then(({a, b}) => fc.props.commutes(a, b, (x, y) => x + y))
          .check()
          .assertSatisfiable()
      })
    })

    describe('associates', () => {
      it('should return true for addition', () => {
        expect(fc.props.associates(1, 2, 3, (a, b) => a + b)).to.be.true
      })

      it('should return true for string concatenation', () => {
        expect(fc.props.associates('a', 'b', 'c', (a, b) => a + b)).to.be.true
      })

      it('should work in scenario', () => {
        fc.scenario()
          .config(fc.strategies.minimal)
          .forall('a', fc.integer(-100, 100))
          .forall('b', fc.integer(-100, 100))
          .forall('c', fc.integer(-100, 100))
          .then(({a, b, c}) => fc.props.associates(a, b, c, (x, y) => x + y))
          .check()
          .assertSatisfiable()
      })
    })

    describe('hasIdentity', () => {
      it('should return true for 0 as identity of addition', () => {
        expect(fc.props.hasIdentity(5, (a, b) => a + b, 0)).to.be.true
      })

      it('should return true for 1 as identity of multiplication', () => {
        expect(fc.props.hasIdentity(5, (a, b) => a * b, 1)).to.be.true
      })

      it('should work in scenario', () => {
        fc.scenario()
          .config(fc.strategies.fast)
          .forall('n', fc.integer(-100, 100))
          .then(({n}) => fc.props.hasIdentity(n, (a, b) => a + b, 0))
          .check()
          .assertSatisfiable()
      })
    })

    describe('composability - multiple properties in one scenario', () => {
      it('should verify addition is a commutative monoid', () => {
        fc.scenario()
          .config(fc.strategies.minimal)
          .forall('a', fc.integer(-100, 100))
          .forall('b', fc.integer(-100, 100))
          .forall('c', fc.integer(-100, 100))
          .then(({a, b, c}) =>
            fc.props.commutes(a, b, (x, y) => x + y) &&
            fc.props.associates(a, b, c, (x, y) => x + y) &&
            fc.props.hasIdentity(a, (x, y) => x + y, 0)
          )
          .check()
          .assertSatisfiable()
      })
    })
  })

  describe('sorted', () => {
    it('should return true for an empty array', () => {
      expect(fc.props.sorted([])).to.be.true
    })

    it('should return true for a single element array', () => {
      expect(fc.props.sorted([42])).to.be.true
    })

    it('should return true for a sorted array', () => {
      expect(fc.props.sorted([1, 2, 3, 4, 5])).to.be.true
    })

    it('should return false for an unsorted array', () => {
      expect(fc.props.sorted([1, 3, 2])).to.be.false
    })

    it('should work with custom comparator (descending)', () => {
      expect(fc.props.sorted([5, 4, 3, 2, 1], (a, b) => b - a)).to.be.true
      expect(fc.props.sorted([1, 2, 3], (a, b) => b - a)).to.be.false
    })

    it('should work with string comparator', () => {
      expect(fc.props.sorted(['apple', 'banana', 'cherry'], (a, b) => a.localeCompare(b))).to.be.true
    })

    // Regression tests: default comparator should work with strings (lexicographic)
    // Previously, the default comparator used subtraction which produced NaN for strings,
    // causing sorted(['b', 'a']) to incorrectly return true
    it('should work with strings using default comparator (lexicographic)', () => {
      expect(fc.props.sorted(['a', 'b', 'c'])).to.be.true
      expect(fc.props.sorted(['apple', 'banana', 'cherry'])).to.be.true
    })

    it('should return false for unsorted strings without custom comparator', () => {
      expect(fc.props.sorted(['b', 'a'])).to.be.false
      expect(fc.props.sorted(['z', 'a', 'm'])).to.be.false
      expect(fc.props.sorted(['cherry', 'apple', 'banana'])).to.be.false
    })

    it('should work in scenario .then() clause', () => {
      fc.scenario()
        .forall('arr', fc.array(fc.integer(-100, 100)))
        .then(({arr}) => fc.props.sorted([...arr].sort((a, b) => a - b)))
        .check()
        .assertSatisfiable()
    })
  })

  describe('unique', () => {
    it('should return true for an empty array', () => {
      expect(fc.props.unique([])).to.be.true
    })

    it('should return true for a single element array', () => {
      expect(fc.props.unique([1])).to.be.true
    })

    it('should return true for array with unique elements', () => {
      expect(fc.props.unique([1, 2, 3, 4, 5])).to.be.true
    })

    it('should return false for array with duplicates', () => {
      expect(fc.props.unique([1, 2, 1])).to.be.false
    })

    it('should work in scenario .then() clause', () => {
      fc.scenario()
        .forall('arr', fc.array(fc.integer()))
        .given('uniqueArr', ({arr}) => [...new Set(arr)])
        .then(({uniqueArr}) => fc.props.unique(uniqueArr))
        .check()
        .assertSatisfiable()
    })
  })

  describe('nonEmpty', () => {
    it('should return false for an empty array', () => {
      expect(fc.props.nonEmpty([])).to.be.false
    })

    it('should return true for non-empty array', () => {
      expect(fc.props.nonEmpty([1])).to.be.true
      expect(fc.props.nonEmpty([1, 2, 3])).to.be.true
    })

    it('should work in scenario with precondition', () => {
      fc.scenario()
        .forall('arr', fc.array(fc.integer(), 1, 10))
        .then(({arr}) => fc.props.nonEmpty(arr))
        .check()
        .assertSatisfiable()
    })
  })

  describe('inRange', () => {
    it('should return true for value in range', () => {
      expect(fc.props.inRange(5, 1, 10)).to.be.true
    })

    it('should return true for value at boundaries', () => {
      expect(fc.props.inRange(1, 1, 10)).to.be.true
      expect(fc.props.inRange(10, 1, 10)).to.be.true
    })

    it('should return false for value outside range', () => {
      expect(fc.props.inRange(0, 1, 10)).to.be.false
      expect(fc.props.inRange(11, 1, 10)).to.be.false
    })

    it('should work with negative ranges', () => {
      expect(fc.props.inRange(-5, -10, -1)).to.be.true
      expect(fc.props.inRange(0, -10, -1)).to.be.false
    })

    it('should work in scenario with filtering', () => {
      fc.scenario()
        .forall('arr', fc.array(fc.integer(-100, 100)))
        .forall('min', fc.integer(-10, 0))
        .forall('max', fc.integer(0, 10))
        .given('filtered', ({arr, min, max}) => arr.filter(n => fc.props.inRange(n, min, max)))
        .then(({filtered, min, max}) =>
          filtered.every(n => fc.props.inRange(n, min, max))
        )
        .check()
        .assertSatisfiable()
    })
  })

  describe('matches', () => {
    it('should return true for matching string', () => {
      expect(fc.props.matches('hello', /^h/)).to.be.true
    })

    it('should return false for non-matching string', () => {
      expect(fc.props.matches('hello', /^H/)).to.be.false
    })

    it('should work with case insensitive flag', () => {
      expect(fc.props.matches('hello', /^H/i)).to.be.true
    })

    it('should work with complex patterns', () => {
      expect(fc.props.matches('test@example.com', /^[^\s@]+@[^\s@]+\.[^\s@]+$/)).to.be.true
      expect(fc.props.matches('invalid-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/)).to.be.false
    })

    it('should work in scenario', () => {
      fc.scenario()
        .forall('email', fc.patterns.email())
        .then(({email}) => fc.props.matches(email, /@/))
        .check()
        .assertSatisfiable()
    })
  })

  describe('integration with preconditions', () => {
    it('should work with fc.pre() for filtering', () => {
      const result = fc.scenario()
        .forall('arr', fc.array(fc.integer()))
        .then(({arr}) => {
          fc.pre(fc.props.nonEmpty(arr), 'array must be non-empty')
          return arr.length > 0
        })
        .check()

      expect(result.satisfiable).to.be.true
    })
  })
})

describe('Property Templates (fc.templates)', () => {
  describe('roundtrip', () => {
    it('should pass for JSON encode/decode', () => {
      fc.templates.roundtrip(
        fc.array(fc.integer(-100, 100), 0, 10),
        JSON.stringify,
        JSON.parse
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should pass for identity functions', () => {
      fc.templates.roundtrip(
        fc.integer(-100, 100),
        (x: number) => x,
        (x: number) => x
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should pass for number toString/parseInt', () => {
      fc.templates.roundtrip(
        fc.integer(0, 1000),
        (n: number) => n.toString(),
        (s: string) => parseInt(s, 10)
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should support custom equality', () => {
      fc.templates.roundtrip(
        fc.integer(-100, 100),
        (x: number) => x,
        (x: number) => x,
        (a, b) => a === b
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should support config', () => {
      fc.templates.roundtrip(
        fc.integer(-100, 100),
        (x: number) => x,
        (x: number) => x
      ).config(fc.strategies.minimal).check().assertSatisfiable()
    })

    it('should have assert method', () => {
      fc.templates.roundtrip(
        fc.integer(-100, 100),
        (x: number) => x,
        (x: number) => x
      ).config(fc.strategies.minimal).assert()
    })
  })

  describe('idempotent', () => {
    it('should pass for Math.abs', () => {
      fc.templates.idempotent(
        fc.integer(-100, 100),
        Math.abs
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should pass for toLowerCase', () => {
      fc.templates.idempotent(
        fc.string(0, 20),
        (s: string) => s.toLowerCase()
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should pass for array deduplication', () => {
      fc.templates.idempotent(
        fc.array(fc.integer(-10, 10), 0, 10),
        (arr: number[]) => [...new Set(arr)]
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should pass for Math.floor', () => {
      fc.templates.idempotent(
        fc.real(-100, 100),
        Math.floor
      ).config(fc.strategies.minimal).check().assertSatisfiable()
    })
  })

  describe('commutative', () => {
    it('should pass for addition', () => {
      fc.templates.commutative(
        fc.integer(-100, 100),
        (a: number, b: number) => a + b
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should pass for multiplication', () => {
      fc.templates.commutative(
        fc.integer(-10, 10),
        (a: number, b: number) => a * b
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should pass for Math.max', () => {
      fc.templates.commutative(
        fc.integer(-100, 100),
        Math.max
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should pass for Math.min', () => {
      fc.templates.commutative(
        fc.integer(-100, 100),
        Math.min
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should fail for subtraction', () => {
      const result = fc.templates.commutative(
        fc.integer(-100, 100),
        (a: number, b: number) => a - b
      ).config(fc.strategies.minimal).check()

      expect(result.satisfiable).to.be.false
    })
  })

  describe('associative', () => {
    it('should pass for addition', () => {
      fc.templates.associative(
        fc.integer(-100, 100),
        (a: number, b: number) => a + b
      ).config(fc.strategies.minimal).check().assertSatisfiable()
    })

    it('should pass for string concatenation', () => {
      fc.templates.associative(
        fc.string(0, 5),
        (a: string, b: string) => a + b
      ).config(fc.strategies.minimal).check().assertSatisfiable()
    })

    it('should pass for array concatenation', () => {
      fc.templates.associative(
        fc.array(fc.integer(-10, 10), 0, 3),
        (a: number[], b: number[]) => [...a, ...b]
      ).config(fc.strategies.minimal).check().assertSatisfiable()
    })
  })

  describe('identity', () => {
    it('should pass for 0 as identity of addition', () => {
      fc.templates.identity(
        fc.integer(-100, 100),
        (a: number, b: number) => a + b,
        0
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should pass for 1 as identity of multiplication', () => {
      fc.templates.identity(
        fc.integer(-100, 100),
        (a: number, b: number) => a * b,
        1
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should pass for empty string as identity of concatenation', () => {
      fc.templates.identity(
        fc.string(0, 20),
        (a: string, b: string) => a + b,
        ''
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })

    it('should pass for empty array as identity of array concatenation', () => {
      fc.templates.identity(
        fc.array(fc.integer(-10, 10), 0, 5),
        (a: number[], b: number[]) => [...a, ...b],
        []
      ).config(fc.strategies.fast).check().assertSatisfiable()
    })
  })

  describe('integration', () => {
    it('should support chaining config', () => {
      const result = fc.templates.roundtrip(
        fc.integer(0, 1000),
        (x: number) => x.toString(),
        (s: string) => parseInt(s, 10)
      )
        .config(fc.strategies.minimal)
        .check()

      expect(result.satisfiable).to.be.true
    })

    it('should throw on assert failure', () => {
      expect(() => {
        fc.templates.commutative(
          fc.integer(-10, 10),
          (a: number, b: number) => a - b
        ).config(fc.strategies.minimal).assert()
      }).to.throw(/Property failed/)
    })

    it('should support custom error message on assert', () => {
      expect(() => {
        fc.templates.commutative(
          fc.integer(-10, 10),
          (a: number, b: number) => a - b
        ).config(fc.strategies.minimal).assert('subtraction is not commutative')
      }).to.throw(/subtraction is not commutative/)
    })
  })
})
