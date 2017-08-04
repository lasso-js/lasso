var path = require('path');

exports.createDependency = function(dirname) {
    return {
        path: 'installed-bar',
        from: dirname
    };
};