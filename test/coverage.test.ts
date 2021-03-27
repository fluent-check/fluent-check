// import * as libCoverage from 'istanbul-lib-coverage'
// import * as libInstrument from 'istanbul-lib-instrument'
// import * as fs from 'fs'
// import * as pp from '@istanbuljs/schema'

// // ------------------------------------------------------------------ //
// // ----------------- INSTRUMENTATION - BEGIN ------------------------ //
// // ------------------------------------------------------------------ //

// const instrumenter = libInstrument.createInstrumenter({
//   parserPlugins: pp.defaults.nyc.parserPlugins.concat('typescript')
// })

// const method_trans = instrumenter.instrumentSync(fs.readFileSync('./src/methods.ts').toString(), './src/methods.ts')
// const externalClass_trans = instrumenter.instrumentSync(
//   fs.readFileSync('./src/externalClass.ts').toString(), './src/externalClass.ts')

// fs.writeFileSync('./src/methods.ts', method_trans)
// fs.writeFileSync('./src/externalClass.ts', externalClass_trans)

// // fs.writeFileSync('./src/method.ts', instrumenter.lastSourceMap().sourcesContent.join(''))

// // ---------------------------------------------------------------- //
// // ----------------- INSTRUMENTATION - END ------------------------ //
// // ---------------------------------------------------------------- //

// // ----------------------------------------------------------- //
// // ----------------- COVERAGE - BEGIN ------------------------ //
// // ----------------------------------------------------------- //

// const globalAny:any = global

// import * as assertionsFile from '../src/methods'
// // import * as assertionsFile from '../src/.coverage/methods'

// assertionsFile['assertion']({a: 10, b: 2})
// assertionsFile['assertion']({a: 1, b: 0})
// assertionsFile['assertion']({a: 2, b: 3})

// console.log(globalAny.__coverage__)

// const coverageSummary = libCoverage.createCoverageSummary()

// Object.entries(globalAny.__coverage__).forEach(elem => {
//   const coverageMap = libCoverage.createFileCoverage(elem[1])
//   coverageSummary.merge(coverageMap.toSummary())
//   // console.log(coverageMap.toSummary())

// })

// console.log(coverageSummary)

// // --------------------------------------------------------- //
// // ----------------- COVERAGE - END ------------------------ //
// // --------------------------------------------------------- //
