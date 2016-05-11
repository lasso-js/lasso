var path = require('path');
function normalizeOutput(o, dir, options) {

    if (dir && typeof dir === 'object') {
        options = dir;
        dir = null;
    }

    var replaceVersions = options && options.replaceVersions === true;

    dir = dir || process.cwd();
    var parentDir = path.dirname(dir);

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
            o = o.split(dir).join('');
            o = o.split(parentDir).join('');
            o = o.replace(/\/node_modules\/lasso-require\/node_modules\/lasso-loader/g, '/node_modules/lasso-loader');
            o = o.replace(/\/lasso-require\/node_modules\/lasso-loader/g, '/node_modules/lasso-loader');
            if (replaceVersions) {
                o = o.replace(/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/g, 'x.x.x');
            }
        }

        return o;
    }


    return helper(o);
}

module.exports = normalizeOutput;