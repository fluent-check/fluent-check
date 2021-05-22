export function multSign(a: number, b: number, c: number): string {
    if (a > 0 && b > 0 && c > 0 || a < 0 && b < 0 && c > 0 || a > 0 && b >= 0 && c < 0 || a < 0 && b > 0 && c < 0) return '+'
    else if (a < 0 && b > 0 && c > 0 || a > 0 && b < 0 && c > 0 || a > 0 && b > 0 && c < 0 || a < 0 && b < 0 && c < 0) return '-'
    else return ''
}
