exports.createDependency = function(dirname) {
    return {
        from: dirname,
        path: './bar'
    };
};