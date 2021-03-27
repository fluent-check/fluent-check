export class MySum {
  mySum(a: number, b: number) {
    if (a === 10)
      return a + 1
    else if (a + b < 2)
      return a - b

    return a + b
  }
}
