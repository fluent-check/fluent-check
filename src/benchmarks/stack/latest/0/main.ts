export class Stack<T> {
  elements: Array<T> = []

  push = (..._: T[]) => {}
  pop = () => { return this.elements.pop() }
  size = () => { return this.elements.length }
}
