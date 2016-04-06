function relativizePaths(o, dir) {

    function helper(o) {
        if (Array.isArray(o)) {
            return o.map(helper);
        } else if (typeof o === 'object') {
            for (var k in o) {
                if (o.hasOwnProperty(k)) {
                    var v = o[k];
                    o[k] = helper(v);
                }
            }
        } else if (typeof o === 'string') {
            return o.split(dir).join('');
        }

        return o;
    }


    return helper(o);
}

module.exports = relativizePaths;