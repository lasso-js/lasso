exports.getPluginConfig = function() {
    return {
        transforms: [
            require('./transform-a'),
            {
                transform: require('./transform-b')
            },
            {
                transform: require('./transform-c'),
                config: {
                    replacement: 'FOO'
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