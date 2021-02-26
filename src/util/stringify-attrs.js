module.exports = function stringifyAttributes (obj) {
    var str = '';
    for (var key in obj) {
        var val = obj[key];
        if (val === false || val == null) {
            continue;
        }

        str += ' ' + key;

        if (val !== true) {
            str += '=' + JSON.stringify(val);
        }
    }

    return str;
};
