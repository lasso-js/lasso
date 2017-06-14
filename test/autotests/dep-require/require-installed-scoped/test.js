exports.createDependency = function(dirname) {
    return {
        path: '@foo/bar',
        from: dirname
    };
};