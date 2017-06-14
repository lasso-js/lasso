exports.createDependency = function(dirname) {
    return {
        path: './foo',
        from: dirname
    };
};