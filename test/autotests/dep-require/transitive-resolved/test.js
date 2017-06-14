exports.createDependency = function(dirname) {
    return {
        path: require.resolve('./bar.js'),
        from: __dirname
    };
};