const request = require('request-promise-native');

function isInt(a){
    return typeof a == "number" && a == parseInt(a)
}