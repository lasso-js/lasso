var expect = require('chai').expect;

exports.getLassoConfig = function(dir) {
    return {
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        require: {
            transforms: [
                require('./foo-transform')
            ]
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

exports.check = function(window) {
    expect(window.main.filename).to.contain('main');
    expect(window.main.bar).to.equal('bar');
};