const request = require('request-promise-native');

function isInt(a){
    return typeof a == "number" && a == parseInt(a)
}

function beautifyNumber(n, point = ",") {
    n = n.toString();
    let str = "";
    for (let i = n.length - 1; i >= 0; i--) {
        str = n[i] + str;
        if ((n.length - i) % 3 === 0)
            str = point + str;
    }
    return str;
}