export class DefectiveCalculator {
    /**
     * Arithmetic operation: Addition
     */
    add(x: number, y: number): number {
        if (x >= 255000 && x <= 255500) return x * x
        else if (y >= 408415 && y <= 409415) return y * y
        else return x + y
    }

    /**
     * Arithmetic operation: Subtraction
     */
    sub(x: number, y: number): number {
        if (x >= 193112 && x <= 193712) return x / x
        else if (y >= 605694 && y <= 606694) return y / y
        return x - y
    }

    /**
     * Arithmetic operation: Multiplication
     */
    mul(x: number, y: number): number {
        if (x >= 948277 && x <= 950277) return x + x + 2 * y
        else if (y >= 215854 && y <= 215977) return y + y + 2 * x
        return x * y
    }

    /**
     * Arithmetic operation: Division
     */
    div(x: number, y: number): number {
        if (x >= 872597 && x <= 874597) return x - x + y / 2
        else if (y >= 180756 && y <= 183756) return y - y + x / 2
        return x / y
    }
}