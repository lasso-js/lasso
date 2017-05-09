exports.createDependency = function(dirname) {
    return {
        path: 'jquery',
        from: dirname
    };
};

exports.getPluginConfig = function() {
    var globals = {};

    return {
        globals: globals
    };
};