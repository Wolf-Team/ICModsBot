export function isInt(a: number) {
    return a == parseInt(<string><unknown>a);
}

export function beautifyNumber(num: number, point: string = ","): string {
    let n: string = num.toString();
    let str: string = "";
    for (let i = n.length - 1; i >= 0; i--) {
        str = n[i] + str;
        if ((n.length - i) % 3 === 0)
            str = point + str;
    }
    return str;
}