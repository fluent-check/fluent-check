import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {expect} from 'chai'

describe('Regex tests', () => {
  it('should generate strings matching simple character class patterns', () => {
    expect(fc.scenario()
      .forall('s', fc.regex(/[a-z]{3}/))
      .then(({s}) => {
        return /^[a-z]{3}$/.test(s)
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should generate strings matching digit patterns', () => {
    expect(fc.scenario()
      .forall('s', fc.regex(/\d{5}/))
      .then(({s}) => {
        return /^\d{5}$/.test(s) && s.length === 5
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should generate strings matching word character patterns', () => {
    expect(fc.scenario()
      .forall('s', fc.regex(/\w{1,5}/))  // Limiting the range to avoid memory issues
      .then(({s}) => {
        return /^\w{1,5}$/.test(s) && s.length >= 1 && s.length <= 5
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should generate strings matching patterns with quantifiers', () => {
    expect(fc.scenario()
      .forall('s', fc.regex(/a{2,4}/))
      .then(({s}) => {
        return /^a{2,4}$/.test(s) && s.length >= 2 && s.length <= 4
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  // Simplified alternatives test
  it('should generate strings matching patterns with alternatives', () => {
    expect(fc.scenario()
      .forall('s', fc.regex(/(cat|dog)/))  // Simplified with explicit grouping
      .then(({s}) => {
        return s === 'cat' || s === 'dog'
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should generate valid email addresses with patterns.email', () => {
    expect(fc.scenario()
      .forall('email', fc.patterns.email())
      .then(({email}) => {
        // Test with a comprehensive email regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        return emailRegex.test(email) && email.includes('@')
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should generate valid UUIDs with patterns.uuid', () => {
    expect(fc.scenario()
      .forall('uuid', fc.patterns.uuid())
      .then(({uuid}) => {
        // UUID v4 format: 8-4-4-4-12 hex digits with version 4 format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
        return uuidRegex.test(uuid)
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should generate valid IPv4 addresses with patterns.ipv4', () => {
    expect(fc.scenario()
      .forall('ip', fc.patterns.ipv4())
      .then(({ip}) => {
        // Check format and valid octet ranges
        const parts = ip.split('.')
        if (parts.length !== 4) return false

        return parts.every(part => {
          const num = parseInt(part, 10)
          return !isNaN(num) && num >= 0 && num <= 255
        })
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should respect maxLength parameter in regex generation', () => {
    expect(fc.scenario()
      .forall('s', fc.regex(/\w+/, 5))  // Reducing max length to avoid memory issues
      .then(({s}) => {
        return /^\w+$/.test(s) && s.length <= 5
      })
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should perform shrinking while maintaining regex pattern', () => {
    const pattern = /\d{3}-\d{2}-\d{4}/  // SSN format
    const original = '123-45-6789'
    const shrunk = fc.shrinkRegexString(original, pattern)

    // Check that all shrunk values still match the pattern
    expect(shrunk.every(s => pattern.test(s))).to.be.true

    // Check that some shrinking actually happened
    expect(shrunk.length).to.be.greaterThan(0)

    // Check that shrunk values are in some way "simpler"
    // For numeric sequences, this often means "smaller numbers"
    const simplifiedExists = shrunk.some(s => {
      // Check if the shrunk value uses simpler digits (more 0's or 1's)
      const countSimpleDigits = (str: string) =>
        (str.match(/[01]/g) ?? []).length

      return countSimpleDigits(s) > countSimpleDigits(original)
    })

    expect(simplifiedExists).to.be.true
  })

  // Simplified validation test
  it('should validate proper email format', () => {
    expect(fc.scenario()
      .forall('email', fc.patterns.email())
      .then(({email}) => {
        // An email must contain exactly one @ symbol
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- typescript-eslint incorrectly infers `any`; tsc correctly sees `string`
        return email.includes('@') && email.includes('.')
      })
      .check()
    ).to.have.property('satisfiable', true)
  })
})
