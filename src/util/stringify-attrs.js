module.exports = function stringifyAttributes (obj) {
    let str = '';
    for (const key in obj) {
        const val = obj[key];
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
