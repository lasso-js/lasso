var path = require('path');

exports.createDependency = function(dirname) {
    return {
        from: dirname,
        path: './foo'
    };
};

exports.searchPath = path.join(__dirname, 'app-modules');