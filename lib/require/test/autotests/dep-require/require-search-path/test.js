var path = require('path');

exports.createDependency = function(dirname) {
    return {
        path: 'bar',
        from: dirname
    };
};

exports.searchPath = path.join(__dirname, 'app-modules');