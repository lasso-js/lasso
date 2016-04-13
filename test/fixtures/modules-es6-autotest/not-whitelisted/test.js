var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        require: {
            babel: {
                extensions: ['.js'],
                paths: [
                    'whitelisted'
                ]
            }
        }
    };
};

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main'
        ]
    };
};

exports.checkError = function(err) {
};