import * as fc from 'fast-check'

export abstract class CucumberCheck {
    #arbitraries: Map<string, fc.Arbitrary<any>> = new Map
    #properties: Array<(tc: any) => void> = []
    #steps: Array<((sut: this) => void)> = []

    abstract initialize(): void

    arbitrary<U>(name: string, a: fc.Arbitrary<U>) {
        this.#arbitraries.set(name, a)
    }

    property(f: (tc: any) => void) {
        this.#properties.push(tc => f(tc))
    }

    assert(assertion: (_: any) => void) {
        const obj = [...this.#arbitraries.entries()].reduce((obj, [key, value]) => { (obj as any)[key] = value; return obj }, {})
        const suite = fc.record(obj)

        fc.assert(fc.property(suite, tc => {
            this.initialize();
            this.#properties.forEach(f => f(tc))
            assertion(tc)
        })) 
    }

    step(description: string, f: (sut: this) => void) {
      this.#steps.push(f)
      return this
    }

    given(description: string, f: (sut: this) => void) {
      return this.step(description, f)
    }

    when(description: string, f: (sut: this) => void) {
      return this.step(description, f)
    }

    then(description: string, f: (sut: this) => void) {
      return this.step(description, f)
    }

    run() {
      this.#steps.forEach(f => f(this))
      console.log(this)
    }
}