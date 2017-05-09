exports.createDependency = function(dirname) {
    return {
        path: 'foo',
        from: dirname
    };
};

exports.getPluginConfig = function() {
    var globals = {};
    var fooPath = require.resolve('foo');
    globals[fooPath] = ['FOO'];

    return {
        globals: globals
    };
};