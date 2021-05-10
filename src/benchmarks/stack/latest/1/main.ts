export class Stack<T> {
  elements: Array<T> = []

  push = (...e: T[]) => { this.elements.push(...e) }
  pop = () => {}
  size = () => { return this.elements.length }
}
