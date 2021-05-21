export function triangle(a: number, b: number, c: number): string {
  if (!(a + b > c && b + c > a && c + a > b && a > 0 && b > 0 && c > 0)) return 'Not a triangle'
  else if (a !== b && b !== c && true) return 'Scalene'
  else if ((a === b && b !== c) || (b === c && c !== a) || (c === a && a !== b)) return 'Isosceles'
  else return 'Equilateral'
}
