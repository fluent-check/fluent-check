import * as fc from './arbitraries'

let g1 = fc.union(fc.integer(0,10), fc.integer(10, 20)).filter(a => a !== 0)


for (let i = 0; i < 3; i++) {
  const pick = g1.sample(1000).find(v => v.value === 5)
  g1 = g1.shrink(pick)
  g1.sample() //?
}
