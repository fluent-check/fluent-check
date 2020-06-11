const fc = require('fast-check')
const FluentCheck = require('./index.js').FluentCheck

const c = new FluentCheck()
    .forall('a', fc.integer(0, 2))
    .exists('b', fc.integer(-2, 0))
    .then(({ a, b }) => a + b == 0)
    .check() //?

new FluentCheck()
    .exists('b', fc.integer(-10, 10))
    .forall('a', fc.integer())
    .then(({ a, b }) => (a * b) === a && (b * a) === a)
    .check()  //?

new FluentCheck()
    .exists('b', fc.integer(-10, 10))
    .forall('a', fc.integer())
    .then(({ a, b }) => (a + b) === a && (b + a) === a)
    .check()  //? 

new FluentCheck()
    .forall('a', fc.integer())
    .forall('b', fc.integer())
    .then(({ a, b }) => (a + b) === (b + a))
    .check()  //? 

new FluentCheck()
    .forall('a', fc.integer())
    .forall('b', fc.integer())
    .then(({ a, b }) => (a - b) === (b - a))
    .check()  //? 
