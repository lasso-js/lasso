exports.getPluginConfig = function() {
    return {
        transforms: [
            {
                transform: require('./my-transform')
            }
        ]
    };
};

exports.createDependency = function(dirname) {
    return {
        from: dirname,
        path: './bar'
    };
};