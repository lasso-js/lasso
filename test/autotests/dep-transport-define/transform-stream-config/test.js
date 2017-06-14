exports.getPluginConfig = function() {
    return {
        transforms: [
            {
                transform: require('./my-transform'),
                config: {
                    replacement: 'WORLD'
                }
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