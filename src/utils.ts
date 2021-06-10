export function isInt(a: number) {
    return a == parseInt(<string><unknown>a);
}