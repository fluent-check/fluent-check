import * as fc from '../src/arbitraries/index.js'
import { scenario } from '../src/index.js'
import { expect } from 'chai'

describe('Record Arbitrary', () => {
  it('should create records with string keys and string values', () => {
    // Create a record arbitrary with string keys and string values
    const recordArb = fc.record(fc.string(1, 5), fc.string(1, 10))
    const samples = recordArb.sample(10)
    
    // Verify all samples are objects
    samples.forEach(sample => {
      expect(sample.value).to.be.an('object')
    })
  })
  
  it('should respect minimum and maximum size', () => {
    // Min size 2, max size 5
    const recordArb = fc.record(fc.string(1, 5), fc.integer(0, 100), 2, 5)
    const samples = recordArb.sample(20)
    
    // Verify all samples have between 2 and 5 entries
    samples.forEach(sample => {
      const keys = Object.keys(sample.value)
      expect(keys.length).to.be.at.least(2)
      expect(keys.length).to.be.at.most(5)
    })
  })
  
  it('should create empty records when minSize is 0', () => {
    // Create a record arbitrary with minSize 0
    const recordArb = fc.record(fc.string(1, 5), fc.string(1, 10), 0, 3)
    const samples = recordArb.sample(50)
    
    // Check if at least one empty record was generated
    const hasEmptyRecord = samples.some(sample => Object.keys(sample.value).length === 0)
    expect(hasEmptyRecord).to.be.true
  })
  
  it('should return NoArbitrary when minSize > maxSize', () => {
    // Create an invalid record arbitrary
    const recordArb = fc.record(fc.string(), fc.string(), 10, 5)
    
    // It should be NoArbitrary
    expect(recordArb.sample().length).to.equal(0)
  })
  
  it('should create records with integer values', () => {
    // Testing via fluent API
    const result = scenario()
      .forall('rec', fc.record(fc.string(1, 5), fc.integer(0, 100)))
      .then(({rec}) => {
        // All values should be integers
        return Object.values(rec).every(value => 
          typeof value === 'number' && Number.isInteger(value)
        )
      })
      .check()
    
    expect(result.satisfiable).to.be.true
  })
  
  it('should create Records with boolean values', () => {
    // Testing via fluent API
    const result = scenario()
      .forall('rec', fc.record(fc.string(1, 5), fc.boolean()))
      .then(({rec}) => {
        // All values should be booleans
        return Object.values(rec).every(value => typeof value === 'boolean')
      })
      .check()
    
    expect(result.satisfiable).to.be.true
  })
  
  it('should ensure all keys in a record are unique', () => {
    // Testing via fluent API
    const keyArb = fc.integer(1, 10).map(n => `key${n}`)
    const result = scenario()
      .forall('rec', fc.record(keyArb, fc.string(), 1, 10))
      .then(({rec}) => {
        // All keys should be unique
        const keys = Object.keys(rec)
        const uniqueKeys = new Set(keys)
        return uniqueKeys.size === keys.length
      })
      .check()
    
    expect(result.satisfiable).to.be.true
  })
  
  it('should properly handle record shrinking', () => {
    // Testing shrinking behavior via property that should fail and produce a counterexample
    const result = scenario()
      .forall('rec', fc.record(fc.string(1, 5), fc.integer(0, 1000), 1, 5))
      .then(({rec}) => {
        // This property will fail when any value > 100
        return Object.values(rec).every(value => value <= 100)
      })
      .check()
    
    // The property should fail
    expect(result.satisfiable).to.be.false
    
    // The counterexample should be the simplest possible
    // Which means it should have a single entry with value close to 100
    const counterexample = result.example.rec
    const values = Object.values(counterexample)
    expect(values.some(value => value > 100)).to.be.true
    
    // The counterexample should be small (ideally 1 entry, but allowing up to 2)
    expect(Object.keys(counterexample).length).to.be.lessThanOrEqual(2)
  })
  
  it('should correctly handle nested records', () => {
    // Testing via fluent API
    const result = scenario()
      .forall('nestedRec', fc.record(
        fc.string(1, 5),
        fc.record(fc.string(1, 3), fc.integer(1, 10), 1, 3),
        1, 3
      ))
      .then(({nestedRec}) => {
        // All values should be objects (records)
        const allValuesAreObjects = Object.values(nestedRec).every(value => 
          typeof value === 'object' && value !== null
        )
        
        // All inner records should have 1-3 entries with integer values
        const innerRecordsValid = Object.values(nestedRec).every(innerRecord => {
          const keys = Object.keys(innerRecord)
          if (keys.length < 1 || keys.length > 3) return false
          
          return Object.values(innerRecord).every(value => 
            typeof value === 'number' && Number.isInteger(value)
          )
        })
        
        return allValuesAreObjects && innerRecordsValid
      })
      .check()
    
    expect(result.satisfiable).to.be.true
  })
  
  it('should generate records with specific constraints', () => {
    // Testing property with specific record constraints
    const result = scenario()
      .forall('rec', fc.record(fc.string(1, 5), fc.integer(1, 100), 1, 3))
      .then(({rec}) => {
        // Every record should have 1-3 entries
        const validSize = Object.keys(rec).length >= 1 && Object.keys(rec).length <= 3
        
        // All values should be integers in range 1-100
        const validValues = Object.values(rec).every(value => 
          typeof value === 'number' && 
          Number.isInteger(value) && 
          value >= 1 && 
          value <= 100
        )
        
        return validSize && validValues
      })
      .check()
    
    expect(result.satisfiable).to.be.true
  })
  
  it('should satisfy properties of records with complex structures', () => {
    // Testing a more complex property with multiple constraints
    const result = scenario()
      .forall('rec', fc.record(fc.string(1, 5), fc.integer(0, 100), 0, 5))
      .then(({rec}) => {
        // Sum of all values should not exceed 500
        const sum = Object.values(rec).reduce((acc, val) => acc + val, 0)
        
        // Record size should match values length
        const sizeMatches = Object.keys(rec).length === Object.values(rec).length
        
        // All keys should be strings
        const keysAreStrings = Object.keys(rec).every(key => typeof key === 'string')
        
        return sum <= 500 && sizeMatches && keysAreStrings
      })
      .check()
    
    expect(result.satisfiable).to.be.true
  })
  
  it('should work with scenario API and complex assertions', () => {
    // Testing with object manipulations and assertions
    const result = scenario()
      .forall('rec1', fc.record(fc.string(1, 5), fc.integer(1, 100), 1, 3))
      .forall('rec2', fc.record(fc.string(1, 5), fc.integer(1, 100), 1, 3))
      .then(({rec1, rec2}) => {
        // Merge two records
        const merged = {...rec1, ...rec2}
        
        // The merged record should have at least as many entries as each original
        return Object.keys(merged).length >= Object.keys(rec1).length &&
               Object.keys(merged).length >= Object.keys(rec2).length
      })
      .check()
    
    expect(result.satisfiable).to.be.true
  })
}) 